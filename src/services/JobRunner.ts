import { JobService, Job } from './JobService';
import { BrandService } from './BrandService';
import { DocumentService } from './DocumentService';
import { ExtractionService } from './ExtractionService';
import { TemplateService } from './TemplateService';
import { RenderService } from './RenderService';
import { StorageProvider } from '../storage';
import logger from '../logger';

export class JobRunner {
  private jobService: JobService;
  private brandService: BrandService;
  private documentService: DocumentService;
  private extractionService: ExtractionService;
  private templateService: TemplateService;
  private renderService: RenderService;
  private storage: StorageProvider;
  private concurrency: number;
  private running = 0;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(deps: {
    jobService: JobService;
    brandService: BrandService;
    documentService: DocumentService;
    extractionService: ExtractionService;
    templateService: TemplateService;
    renderService: RenderService;
    storage: StorageProvider;
  }) {
    this.jobService = deps.jobService;
    this.brandService = deps.brandService;
    this.documentService = deps.documentService;
    this.extractionService = deps.extractionService;
    this.templateService = deps.templateService;
    this.renderService = deps.renderService;
    this.storage = deps.storage;
    this.concurrency = parseInt(process.env.JOB_CONCURRENCY || '3');
  }

  start(): void {
    logger.info(`Job runner started (concurrency: ${this.concurrency})`);
    this.interval = setInterval(() => this.poll(), 2000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    logger.info('Job runner stopped');
  }

  private async poll(): Promise<void> {
    if (this.running >= this.concurrency) return;

    const slotsAvailable = this.concurrency - this.running;
    try {
      const jobs = await this.jobService.getQueuedJobs(slotsAvailable);
      for (const job of jobs) {
        this.running++;
        this.executeJob(job).finally(() => { this.running--; });
      }
    } catch (err) {
      logger.error('Job polling error:', err);
    }
  }

  private async executeJob(job: Job): Promise<void> {
    logger.info(`Executing job ${job.id} (${job.type})`);

    try {
      switch (job.type) {
        case 'brand_extraction':
          await this.handleBrandExtraction(job);
          break;
        case 'brand_template_generation':
          await this.handleTemplateGeneration(job);
          break;
        case 'document_render':
          await this.handleDocumentRender(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
      await this.jobService.markCompleted(job.id);
      logger.info(`Job ${job.id} completed`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Job ${job.id} failed: ${message}`);
      await this.jobService.markFailed(job.id, message);

      // Update entity status on failure
      if (job.entity_type === 'brand' && job.entity_id) {
        await this.brandService.updateStatus(job.entity_id, 'failed', message);
      } else if (job.entity_type === 'document' && job.entity_id) {
        await this.documentService.updateStatus(job.entity_id, 'failed', message);
      }
    }
  }

  private async handleBrandExtraction(job: Job): Promise<void> {
    const payload = job.payload as {
      brandId: string;
      slug: string;
      sourceType: string;
      sourceUrl?: string;
      pdfStoragePath?: string;
    };

    await this.brandService.updateStatus(payload.brandId, 'extracting');

    let designSystemHtml: string;

    // F2: Multi-source extraction support
    const sources = (payload as Record<string, unknown>).sources as Array<{ type: string; url?: string; storagePath?: string }> | undefined;
    try {
      if (sources && sources.length > 0) {
        await this.jobService.addProgressEntry(job.id, 'Fetching content from multiple sources...');
        designSystemHtml = await this.extractionService.extractFromMultipleSources(sources, payload.brandId);
      } else if (payload.sourceType === 'url' && payload.sourceUrl) {
        await this.jobService.addProgressEntry(job.id, 'Fetching website content...');
        designSystemHtml = await this.extractionService.extractFromUrl(payload.sourceUrl, payload.brandId);
      } else if (payload.sourceType === 'pdf' && payload.pdfStoragePath) {
        await this.jobService.addProgressEntry(job.id, 'Reading PDF document...');
        designSystemHtml = await this.extractionService.extractFromPdf(payload.pdfStoragePath, payload.brandId);
      } else {
        throw new Error('Invalid extraction source');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await this.jobService.addProgressEntry(job.id, `Extraction failed: ${errMsg}`);
      throw err;
    }

    await this.jobService.addProgressEntry(job.id, 'Saving design system...');
    const dsPath = `brands/${payload.slug}/design-system.html`;
    await this.storage.save(dsPath, designSystemHtml);
    await this.brandService.upsertAsset(payload.brandId, 'design_system', dsPath);

    // F2: If multi-source, go to awaiting_review instead of auto-generating templates
    if (sources && sources.length > 0) {
      await this.brandService.updateStatus(payload.brandId, 'awaiting_review');
      await this.jobService.addProgressEntry(job.id, 'Extraction complete — awaiting your review');
    } else {
      await this.brandService.updateStatus(payload.brandId, 'extracted');
      await this.jobService.addProgressEntry(job.id, 'Extraction complete, queuing template generation...');

      // Enqueue template generation
      await this.jobService.create({
        type: 'brand_template_generation',
        entityType: 'brand',
        entityId: payload.brandId,
        payload: { brandId: payload.brandId, slug: payload.slug },
      });
    }
  }

  private async handleTemplateGeneration(job: Job): Promise<void> {
    const payload = job.payload as { brandId: string; slug: string };

    await this.brandService.updateStatus(payload.brandId, 'generating_templates');

    await this.jobService.addProgressEntry(job.id, 'Loading design system...');
    const dsPath = `brands/${payload.slug}/design-system.html`;
    const designSystemHtml = (await this.storage.get(dsPath)).toString();

    // Generate report template — continue even if it fails
    let reportFailed = false;
    try {
      await this.jobService.addProgressEntry(job.id, 'Generating report template...');
      const reportHtml = await this.templateService.generateReportTemplate(designSystemHtml, payload.brandId);
      const reportPath = `brands/${payload.slug}/report-template.html`;
      await this.storage.save(reportPath, reportHtml);
      await this.brandService.upsertAsset(payload.brandId, 'report_template', reportPath);
    } catch (err) {
      reportFailed = true;
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Report template generation failed: ${msg}`);
      await this.jobService.addProgressEntry(job.id, `Report template failed: ${msg}`);
    }

    // Generate slides template — continue even if it fails
    let slidesFailed = false;
    try {
      await this.jobService.addProgressEntry(job.id, 'Generating slides template...');
      const slidesHtml = await this.templateService.generateSlidesTemplate(designSystemHtml, payload.brandId);
      const slidesPath = `brands/${payload.slug}/slides-template.html`;
      await this.storage.save(slidesPath, slidesHtml);
      await this.brandService.upsertAsset(payload.brandId, 'slides_template', slidesPath);
    } catch (err) {
      slidesFailed = true;
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Slides template generation failed: ${msg}`);
      await this.jobService.addProgressEntry(job.id, `Slides template failed: ${msg}`);
    }

    if (reportFailed && slidesFailed) {
      throw new Error('Both report and slides template generation failed');
    }

    const partial = reportFailed || slidesFailed;
    await this.jobService.addProgressEntry(job.id, partial ? 'Templates partially complete (some failed)' : 'Templates complete');
    await this.brandService.updateStatus(payload.brandId, 'ready');
  }

  private async handleDocumentRender(job: Job): Promise<void> {
    const payload = job.payload as {
      documentId: string;
      brandId: string;
      brandSlug: string;
      format: 'report' | 'slides';
    };

    await this.documentService.updateStatus(payload.documentId, 'rendering');

    await this.jobService.addProgressEntry(job.id, 'Loading template...');
    const assetType = payload.format === 'report' ? 'report_template' : 'slides_template';
    const asset = await this.brandService.getAssetByType(payload.brandId, assetType);
    if (!asset) throw new Error(`Template not found for brand ${payload.brandSlug} (${assetType})`);

    const templateHtml = (await this.storage.get(asset.file_path)).toString();

    const doc = await this.documentService.getById(payload.documentId);
    if (!doc) throw new Error(`Document not found: ${payload.documentId}`);

    await this.jobService.addProgressEntry(job.id, 'Converting content...');
    const markdownContent = (await this.storage.get(doc.markdown_path)).toString();

    await this.jobService.addProgressEntry(job.id, 'Rendering PDF...');
    const pdfPath = `documents/${payload.documentId}/output.pdf`;
    const renderedHtml = await this.renderService.renderToPdf({
      templateHtml,
      markdownContent,
      format: payload.format,
      outputPath: pdfPath,
    });

    await this.documentService.setRenderedHtml(payload.documentId, renderedHtml);
    await this.documentService.setPdfPath(payload.documentId, pdfPath);
  }
}

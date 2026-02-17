import { Command } from 'commander';
import fs from 'fs';
import { createAppContext } from '../../app';
import logger from '../../logger';

export function registerDocumentCommands(program: Command): void {
  const doc = program.command('doc').description('Document management commands');

  doc
    .command('generate')
    .description('Generate a document from markdown')
    .requiredOption('--brand <slug>', 'Brand slug')
    .requiredOption('--format <format>', 'Output format (report or slides)')
    .requiredOption('--input <path>', 'Path to markdown input file')
    .option('--title <title>', 'Document title')
    .option('--output <path>', 'Output PDF path (for download after render)')
    .action(async (opts) => {
      const ctx = createAppContext();
      try {
        const brand = await ctx.brandService.getBySlug(opts.brand);
        if (!brand) {
          console.error(`Brand not found: ${opts.brand}`);
          process.exit(1);
        }

        if (brand.status !== 'ready') {
          console.error(`Brand is not ready (status: ${brand.status}). Wait for extraction to complete.`);
          process.exit(1);
        }

        const markdownContent = fs.readFileSync(opts.input, 'utf-8');
        const { document: doc, jobId } = await ctx.documentService.create({
          brandId: brand.id,
          brandSlug: brand.slug,
          title: opts.title,
          format: opts.format,
          markdownContent,
        });

        console.log(`Document created: ${doc.id}`);
        console.log(`Job ID: ${jobId}`);

        // Poll for completion
        console.log('Waiting for render to complete...');
        let job = await ctx.jobService.getById(jobId);
        while (job && job.status !== 'completed' && job.status !== 'failed') {
          await new Promise((r) => setTimeout(r, 2000));
          job = await ctx.jobService.getById(jobId);
          process.stdout.write('.');
        }
        console.log();

        if (job?.status === 'failed') {
          console.error(`Render failed: ${job.error_message}`);
          process.exit(1);
        }

        const finalDoc = await ctx.documentService.getById(doc.id);
        if (finalDoc?.pdf_path && opts.output) {
          const pdfBuffer = await ctx.storage.get(finalDoc.pdf_path);
          fs.writeFileSync(opts.output, pdfBuffer);
          console.log(`PDF saved to: ${opts.output}`);
        } else if (finalDoc?.pdf_path) {
          console.log(`PDF available at storage path: ${finalDoc.pdf_path}`);
        }

        console.log('Done!');
      } catch (err) {
        logger.error('Failed to generate document:', err);
        process.exit(1);
      }
    });

  doc
    .command('list')
    .description('List documents for a brand')
    .requiredOption('--brand <slug>', 'Brand slug')
    .action(async (opts) => {
      const ctx = createAppContext();
      try {
        const brand = await ctx.brandService.getBySlug(opts.brand);
        if (!brand) {
          console.error(`Brand not found: ${opts.brand}`);
          process.exit(1);
        }

        const docs = await ctx.documentService.listByBrand(brand.id);
        if (docs.length === 0) {
          console.log('No documents found.');
          return;
        }
        for (const d of docs) {
          console.log(`  ${d.id} - ${d.title || '(untitled)'} [${d.format}] ${d.status}`);
        }
      } catch (err) {
        logger.error('Failed to list documents:', err);
        process.exit(1);
      }
    });

  doc
    .command('download')
    .description('Download a document PDF')
    .requiredOption('--id <id>', 'Document ID')
    .requiredOption('--output <path>', 'Output file path')
    .action(async (opts) => {
      const ctx = createAppContext();
      try {
        const doc = await ctx.documentService.getById(opts.id);
        if (!doc) {
          console.error('Document not found');
          process.exit(1);
        }
        if (!doc.pdf_path) {
          console.error('PDF not ready');
          process.exit(1);
        }

        const pdfBuffer = await ctx.storage.get(doc.pdf_path);
        fs.writeFileSync(opts.output, pdfBuffer);
        console.log(`Downloaded to: ${opts.output}`);
      } catch (err) {
        logger.error('Failed to download document:', err);
        process.exit(1);
      }
    });
}

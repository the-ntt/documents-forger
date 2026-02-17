import puppeteer from 'puppeteer';
import { marked } from 'marked';
import { StorageProvider } from '../storage';
import logger from '../logger';

export class RenderService {
  private storage: StorageProvider;

  constructor(storage: StorageProvider) {
    this.storage = storage;
  }

  async renderToPdf(options: {
    templateHtml: string;
    markdownContent: string;
    format: 'report' | 'slides';
    outputPath: string;
  }): Promise<string> {
    const { templateHtml, markdownContent, format, outputPath } = options;

    logger.info(`Rendering ${format} PDF to ${outputPath}`);

    // Convert markdown to HTML
    const convertedHtml = await marked(markdownContent);

    // Inject into template
    let finalHtml: string;
    if (format === 'slides') {
      // Split by H2 and wrap each section in a slide
      const sections = convertedHtml.split(/<h2[^>]*>/);
      const slides = sections.map((section, i) => {
        if (i === 0 && section.trim() === '') return '';
        const content = i === 0 ? section : `<h2>${section}`;
        return `<section class="slide">${content}</section>`;
      }).filter(Boolean);
      finalHtml = templateHtml.replace(
        /<div id="content">[\s\S]*?<\/div>/,
        `<div id="content">${slides.join('\n')}</div>`
      );
    } else {
      finalHtml = templateHtml.replace(
        /<div id="content">[\s\S]*?<\/div>/,
        `<div id="content">${convertedHtml}</div>`
      );
    }

    // If no content div found, append before </body>
    if (!templateHtml.includes('id="content"')) {
      finalHtml = templateHtml.replace('</body>', `<div id="content">${convertedHtml}</div></body>`);
    }

    await this.renderHtmlToPdf(finalHtml, format, outputPath);
    return finalHtml;
  }

  async renderHtmlDirectly(html: string, format: 'report' | 'slides', outputPath: string): Promise<void> {
    logger.info(`Re-rendering PDF from edited HTML to ${outputPath}`);
    await this.renderHtmlToPdf(html, format, outputPath);
  }

  private async renderHtmlToPdf(finalHtml: string, format: 'report' | 'slides', outputPath: string): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(finalHtml, { waitUntil: 'networkidle0', timeout: 90000 });

      let pdfBuffer: Buffer;
      if (format === 'slides') {
        pdfBuffer = Buffer.from(await page.pdf({
          width: '254mm',
          height: '143mm',
          printBackground: true,
          landscape: true,
          timeout: 90000,
        }));
      } else {
        pdfBuffer = Buffer.from(await page.pdf({
          format: 'A4',
          printBackground: true,
          timeout: 90000,
        }));
      }

      await this.storage.save(outputPath, pdfBuffer);
      logger.info(`PDF rendered successfully: ${outputPath}`);
    } finally {
      await browser.close();
    }
  }
}

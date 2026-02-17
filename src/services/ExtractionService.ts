import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import puppeteer from 'puppeteer';
import { StorageProvider } from '../storage';
import { PromptService, PromptType } from './PromptService';
import logger from '../logger';

const GEMINI_MODEL = 'gemini-2.5-flash';

const FETCH_OPTIONS = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; BrandForge/1.0; +https://brandforge.dev)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  },
  timeout: 30000,
  maxRedirects: 10,
  maxContentLength: 5 * 1024 * 1024,
};

const CSS_FETCH_OPTIONS = {
  headers: { 'User-Agent': FETCH_OPTIONS.headers['User-Agent'] },
  timeout: 10000,
  maxRedirects: 10,
  maxContentLength: 2 * 1024 * 1024,
};

export class ExtractionService {
  private genAI: GoogleGenerativeAI;
  private promptService: PromptService;
  private storage: StorageProvider;

  constructor(storage: StorageProvider, promptService: PromptService) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.promptService = promptService;
    this.storage = storage;
  }

  /**
   * Fetches URL content: tries axios first, falls back to Puppeteer on redirect
   * loops or other fetch failures. Returns { html, css }.
   */
  private async fetchUrlContent(url: string): Promise<{ html: string; css: string }> {
    let html: string;
    let usedPuppeteer = false;

    try {
      const response = await axios.get(url, FETCH_OPTIONS);
      html = response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`axios fetch failed for ${url} (${message}), falling back to Puppeteer`);
      try {
        html = await this.fetchWithPuppeteer(url);
        usedPuppeteer = true;
      } catch (puppeteerErr) {
        const pMsg = puppeteerErr instanceof Error ? puppeteerErr.message : String(puppeteerErr);
        throw new Error(`Failed to fetch ${url}: axios error: ${message}; Puppeteer error: ${pMsg}`);
      }
    }

    // Fetch CSS (skip if we used Puppeteer — it already has computed styles)
    let cssContent = '';
    if (!usedPuppeteer) {
      cssContent = await this.fetchCssFromHtml(html, url);
    }

    return { html, css: cssContent };
  }

  /**
   * Uses headless Chrome to navigate to a URL and capture the rendered HTML.
   * Handles redirect loops, JS-rendered pages, and cookie walls.
   */
  private async fetchWithPuppeteer(url: string): Promise<string> {
    logger.info(`Fetching ${url} with Puppeteer`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

      // Get full rendered HTML including computed styles
      const html = await page.content();

      // Also extract computed CSS custom properties and stylesheet contents
      const styles = await page.evaluate(`
        (function() {
          var sheets = [];
          var allSheets = Array.from(document.styleSheets);
          for (var i = 0; i < allSheets.length; i++) {
            try {
              var rules = Array.from(allSheets[i].cssRules);
              sheets.push(rules.map(function(r) { return r.cssText; }).join('\\n'));
            } catch(e) {}
          }
          return sheets.join('\\n\\n');
        })()
      `) as string;

      return `${html}\n\n<style>/* Extracted computed styles */\n${styles}\n</style>`;
    } finally {
      await browser.close();
    }
  }

  /**
   * Extracts CSS URLs from HTML and fetches them.
   */
  private async fetchCssFromHtml(html: string, baseUrl: string): Promise<string> {
    let cssContent = '';
    const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    const cssUrls: string[] = [];

    while ((match = linkRegex.exec(html)) !== null) {
      let cssUrl = match[1];
      if (cssUrl.startsWith('//')) cssUrl = 'https:' + cssUrl;
      else if (cssUrl.startsWith('/')) {
        const parsed = new URL(baseUrl);
        cssUrl = `${parsed.origin}${cssUrl}`;
      } else if (!cssUrl.startsWith('http')) {
        const parsed = new URL(baseUrl);
        cssUrl = `${parsed.origin}/${cssUrl}`;
      }
      cssUrls.push(cssUrl);
    }

    for (const cssUrl of cssUrls.slice(0, 5)) {
      try {
        const { data: css } = await axios.get(cssUrl, CSS_FETCH_OPTIONS);
        cssContent += `\n/* From: ${cssUrl} */\n${css}\n`;
      } catch {
        logger.warn(`Failed to fetch CSS: ${cssUrl}`);
      }
    }

    return cssContent;
  }

  async extractFromUrl(url: string, brandId?: string, customPrompt?: string): Promise<string> {
    logger.info(`Extracting brand from URL: ${url}`);

    const { html, css } = await this.fetchUrlContent(url);

    const promptTemplate = customPrompt || await this.promptService.getEffectivePrompt('extraction' as PromptType, brandId);
    const websiteContent = `HTML:\n${html.substring(0, 100000)}\n\nCSS:\n${css.substring(0, 100000)}`;
    const prompt = promptTemplate.replace('{{WEBSITE_CONTENT}}', websiteContent);

    return this.callGeminiWithRetry(prompt);
  }

  async extractFromPdf(pdfStoragePath: string, brandId?: string, customPrompt?: string): Promise<string> {
    logger.info(`Extracting brand from PDF: ${pdfStoragePath}`);

    const pdfBuffer = await this.storage.get(pdfStoragePath);
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

    const promptTemplate = customPrompt || await this.promptService.getEffectivePrompt('extraction' as PromptType, brandId);
    const prompt = promptTemplate.replace('{{WEBSITE_CONTENT}}', '[See attached PDF document]');

    return this.callGeminiWithRetry(prompt, {
      inlineData: { mimeType: 'application/pdf', data: base64Pdf },
    });
  }

  async extractFromMultipleSources(
    sources: Array<{ type: string; url?: string; storagePath?: string }>,
    brandId?: string
  ): Promise<string> {
    logger.info(`Extracting brand from ${sources.length} sources`);

    const contentSections: string[] = [];
    const attachments: Array<{ inlineData: { mimeType: string; data: string } }> = [];

    const errors: string[] = [];
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      try {
        if (source.type === 'url' && source.url) {
          const { html, css } = await this.fetchUrlContent(source.url);
          contentSections.push(`--- SOURCE ${i + 1}: URL (${source.url}) ---\nHTML:\n${html.substring(0, 80000)}\n\nCSS:\n${css.substring(0, 50000)}`);
        } else if (source.type === 'pdf' && source.storagePath) {
          const pdfBuffer = await this.storage.get(source.storagePath);
          const base64Pdf = Buffer.from(pdfBuffer).toString('base64');
          attachments.push({ inlineData: { mimeType: 'application/pdf', data: base64Pdf } });
          contentSections.push(`--- SOURCE ${i + 1}: PDF (attached) ---\n[See attached PDF document #${attachments.length}]`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to fetch source ${i + 1} (${source.url || source.storagePath}): ${msg}`);
        errors.push(`Source ${i + 1} (${source.url || source.storagePath}): ${msg}`);
        contentSections.push(`--- SOURCE ${i + 1}: FAILED ---\n[Could not fetch: ${msg}]`);
      }
    }

    if (contentSections.length === 0 || contentSections.every(s => s.includes('FAILED'))) {
      throw new Error(`All sources failed to fetch:\n${errors.join('\n')}`);
    }

    const websiteContent = contentSections.join('\n\n');
    const promptTemplate = await this.promptService.getEffectivePrompt('extraction' as PromptType, brandId);
    const prompt = promptTemplate.replace('{{WEBSITE_CONTENT}}', websiteContent);

    return this.callGeminiWithRetry(prompt, attachments.length > 0 ? attachments : undefined);
  }

  async refineDesignSystem(
    currentHtml: string,
    userMessage: string,
    history: Array<{ role: string; content: string }>
  ): Promise<{ text: string; updatedHtml?: string }> {
    logger.info('Refining design system based on user feedback');

    const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const historyText = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

    const prompt = `You are a design system expert helping refine a brand's design system.

Current Design System HTML:
${currentHtml.substring(0, 50000)}

Conversation History:
${historyText}

User's Latest Feedback: ${userMessage}

Respond to the user's feedback about the design system. If they request specific changes (colors, fonts, spacing, etc.), provide an updated version of the design system HTML.

Format your response as follows:
1. First, provide a natural language response addressing the user's feedback.
2. If changes are needed, include the complete updated HTML between <UPDATED_HTML> and </UPDATED_HTML> tags.

If no changes are needed (e.g., the user is asking a question), just respond with text.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract updated HTML if present
    const htmlMatch = responseText.match(/<UPDATED_HTML>([\s\S]*?)<\/UPDATED_HTML>/);
    let updatedHtml: string | undefined;
    let text = responseText;

    if (htmlMatch) {
      updatedHtml = htmlMatch[1].trim();
      text = responseText.replace(/<UPDATED_HTML>[\s\S]*?<\/UPDATED_HTML>/, '').trim();
    }

    return { text, updatedHtml };
  }

  private async callGeminiWithRetry(
    prompt: string,
    attachments?: Array<{ inlineData: { mimeType: string; data: string } }> | { inlineData: { mimeType: string; data: string } },
    maxRetries = 3
  ): Promise<string> {
    let lastError: Error | null = null;
    const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
        if (attachments) {
          if (Array.isArray(attachments)) {
            parts.push(...attachments);
          } else {
            parts.push(attachments);
          }
        }
        parts.push({ text: prompt });

        const result = await model.generateContent(parts);
        const response = result.response;
        let text = response.text();

        if (!text) {
          throw new Error('No text content in Gemini response');
        }

        // Extract just the HTML if there's extra text
        const doctypeIdx = text.indexOf('<!DOCTYPE');
        const htmlEndIdx = text.lastIndexOf('</html>');
        if (doctypeIdx >= 0 && htmlEndIdx >= 0) {
          text = text.substring(doctypeIdx, htmlEndIdx + '</html>'.length);
        } else if (doctypeIdx >= 0) {
          // HTML was truncated (missing </html>) — try to repair it
          logger.warn('Gemini response HTML is truncated (missing </html>), attempting repair');
          text = text.substring(doctypeIdx);

          // Strip any base64 data URI garbage (font/image data that caused truncation)
          text = text.replace(/url\(data:[^)]{1000,}\)/g, 'url()');

          // Close any open tags
          if (!text.includes('</style>')) text += '\n</style>';
          if (!text.includes('</body>')) text += '\n</body>';
          if (!text.includes('</html>')) text += '\n</html>';
        }

        // Validate minimum structure
        if (!text.includes('<html') || !text.includes('</html>')) {
          throw new Error('Gemini response is not valid HTML — missing <html> structure');
        }

        return text;
      } catch (err) {
        lastError = err as Error;
        logger.warn(`Gemini API attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw new Error(`Gemini API failed after ${maxRetries} attempts: ${lastError?.message}`);
  }
}

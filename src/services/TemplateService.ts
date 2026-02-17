import { GoogleGenerativeAI } from '@google/generative-ai';
import { PromptService, PromptType } from './PromptService';
import logger from '../logger';

const GEMINI_MODEL = 'gemini-2.5-flash';

export class TemplateService {
  private genAI: GoogleGenerativeAI;
  private promptService: PromptService;

  constructor(promptService: PromptService) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.promptService = promptService;
  }

  async generateReportTemplate(designSystemHtml: string, brandId?: string, customPrompt?: string): Promise<string> {
    logger.info('Generating report template');
    const promptTemplate = customPrompt || await this.promptService.getEffectivePrompt('report_template' as PromptType, brandId);
    const prompt = promptTemplate.replace('{{DESIGN_SYSTEM_HTML}}', designSystemHtml);
    return this.callGemini(prompt);
  }

  async generateSlidesTemplate(designSystemHtml: string, brandId?: string, customPrompt?: string): Promise<string> {
    logger.info('Generating slides template');
    const promptTemplate = customPrompt || await this.promptService.getEffectivePrompt('slides_template' as PromptType, brandId);
    const prompt = promptTemplate.replace('{{DESIGN_SYSTEM_HTML}}', designSystemHtml);
    return this.callGemini(prompt);
  }

  private async callGemini(prompt: string, maxRetries = 3): Promise<string> {
    let lastError: Error | null = null;
    const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        if (!text) {
          throw new Error('No text content in Gemini response');
        }

        const doctypeIdx = text.indexOf('<!DOCTYPE');
        const htmlEndIdx = text.lastIndexOf('</html>');
        if (doctypeIdx >= 0 && htmlEndIdx >= 0) {
          text = text.substring(doctypeIdx, htmlEndIdx + '</html>'.length);
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

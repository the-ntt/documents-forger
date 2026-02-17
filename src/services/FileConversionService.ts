import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../logger';

const GEMINI_MODEL = 'gemini-2.5-flash';

export class FileConversionService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  async convertToMarkdown(buffer: Buffer, mimeType: string, originalName: string): Promise<string> {
    const ext = originalName.split('.').pop()?.toLowerCase();
    logger.info(`Converting file to markdown: ${originalName} (${mimeType})`);

    switch (ext) {
      case 'md':
      case 'txt':
      case 'markdown':
        return buffer.toString('utf-8');

      case 'docx':
        return this.convertDocx(buffer);

      case 'pdf':
        return this.convertPdf(buffer);

      case 'pptx':
        return this.convertPptx(buffer);

      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  private async convertDocx(buffer: Buffer): Promise<string> {
    // mammoth converts docx to HTML, then we use Gemini to convert to clean markdown
    const mammoth = await import('mammoth');
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;

    if (!html.trim()) {
      throw new Error('No content found in DOCX file');
    }

    // Use Gemini to convert HTML to clean markdown
    const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `Convert the following HTML (extracted from a Word document) into clean, well-structured Markdown. Preserve all headings, lists, tables, and formatting. Do not add any extra commentary, just output the markdown.\n\nHTML:\n${html}`;
    const result2 = await model.generateContent(prompt);
    let text = result2.response.text();

    // Strip markdown code fences if present
    if (text.startsWith('```markdown')) {
      text = text.replace(/^```markdown\n?/, '').replace(/\n?```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    return text;
  }

  private async convertPdf(buffer: Buffer): Promise<string> {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    const text = result.text;

    if (!text.trim()) {
      throw new Error('No text content found in PDF');
    }

    // Return raw text as markdown (PDFs produce reasonable text)
    return text;
  }

  private async convertPptx(buffer: Buffer): Promise<string> {
    // Send to Gemini as attachment for extraction
    const base64 = buffer.toString('base64');
    const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const parts = [
      { inlineData: { mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', data: base64 } },
      { text: 'Extract all text content from this PowerPoint presentation and convert it to well-structured Markdown. Each slide should be a level 2 heading (##). Preserve all bullet points, tables, and formatting. Output only the markdown, no commentary.' },
    ];

    const result = await model.generateContent(parts);
    let text = result.response.text();

    // Strip markdown code fences if present
    if (text.startsWith('```markdown')) {
      text = text.replace(/^```markdown\n?/, '').replace(/\n?```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    return text;
  }
}

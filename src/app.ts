import express from 'express';
import cors from 'cors';
import path from 'path';
import { createApiRouter } from './api/router';
import { requestLogger, errorHandler } from './api/middleware';
import { BrandService } from './services/BrandService';
import { DocumentService } from './services/DocumentService';
import { JobService } from './services/JobService';
import { PromptService } from './services/PromptService';
import { ExtractionService } from './services/ExtractionService';
import { TemplateService } from './services/TemplateService';
import { RenderService } from './services/RenderService';
import { ConversationService } from './services/ConversationService';
import { FileConversionService } from './services/FileConversionService';
import { LogService } from './services/LogService';
import { JobRunner } from './services/JobRunner';
import { createStorageProvider, StorageProvider } from './storage';
import { createAuthMiddleware, AuthMiddleware } from './auth';

export interface AppContext {
  storage: StorageProvider;
  auth: AuthMiddleware;
  jobService: JobService;
  brandService: BrandService;
  documentService: DocumentService;
  promptService: PromptService;
  extractionService: ExtractionService;
  templateService: TemplateService;
  renderService: RenderService;
  conversationService: ConversationService;
  fileConversionService: FileConversionService;
  logService: LogService;
  jobRunner: JobRunner;
}

export function createAppContext(): AppContext {
  const storage = createStorageProvider();
  const auth = createAuthMiddleware();
  const jobService = new JobService();
  const promptService = new PromptService();
  const brandService = new BrandService(storage, jobService);
  const documentService = new DocumentService(storage, jobService);
  const extractionService = new ExtractionService(storage, promptService);
  const templateService = new TemplateService(promptService);
  const renderService = new RenderService(storage);
  const conversationService = new ConversationService();
  const fileConversionService = new FileConversionService();
  const logService = new LogService();
  const jobRunner = new JobRunner({
    jobService,
    brandService,
    documentService,
    extractionService,
    templateService,
    renderService,
    storage,
  });

  return {
    storage, auth, jobService, brandService, documentService,
    promptService, extractionService, templateService, renderService,
    conversationService, fileConversionService, logService, jobRunner,
  };
}

export function createApp(ctx: AppContext): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // API routes
  const apiRouter = createApiRouter({
    brandService: ctx.brandService,
    documentService: ctx.documentService,
    jobService: ctx.jobService,
    promptService: ctx.promptService,
    extractionService: ctx.extractionService,
    conversationService: ctx.conversationService,
    renderService: ctx.renderService,
    fileConversionService: ctx.fileConversionService,
    logService: ctx.logService,
    storage: ctx.storage,
    auth: ctx.auth,
  });
  app.use('/api', apiRouter);

  // Serve React frontend from /public
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use(errorHandler);

  return app;
}

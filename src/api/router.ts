import { Router } from 'express';
import { createHealthRoutes } from './routes/health';
import { createBrandRoutes } from './routes/brands';
import { createDocumentRoutes } from './routes/documents';
import { createJobRoutes } from './routes/jobs';
import { createPromptRoutes } from './routes/prompts';
import { createLogRoutes } from './routes/logs';
import { BrandService } from '../services/BrandService';
import { DocumentService } from '../services/DocumentService';
import { JobService } from '../services/JobService';
import { PromptService } from '../services/PromptService';
import { ExtractionService } from '../services/ExtractionService';
import { ConversationService } from '../services/ConversationService';
import { RenderService } from '../services/RenderService';
import { FileConversionService } from '../services/FileConversionService';
import { LogService } from '../services/LogService';
import { StorageProvider } from '../storage';
import { AuthMiddleware } from '../auth';

export function createApiRouter(deps: {
  brandService: BrandService;
  documentService: DocumentService;
  jobService: JobService;
  promptService: PromptService;
  extractionService: ExtractionService;
  conversationService: ConversationService;
  renderService: RenderService;
  fileConversionService: FileConversionService;
  logService: LogService;
  storage: StorageProvider;
  auth: AuthMiddleware;
}): Router {
  const router = Router();

  router.use('/health', createHealthRoutes(deps.storage));
  router.use('/brands', createBrandRoutes(
    deps.brandService, deps.storage, deps.auth,
    deps.jobService, deps.extractionService, deps.conversationService,
  ));
  router.use('/', createDocumentRoutes(
    deps.documentService, deps.brandService, deps.storage, deps.auth,
    deps.renderService, deps.fileConversionService,
  ));
  router.use('/jobs', createJobRoutes(deps.jobService, deps.auth));
  router.use('/prompts', createPromptRoutes(deps.promptService, deps.auth));
  router.use('/logs', createLogRoutes(deps.logService, deps.auth));

  return router;
}

import { AuthMiddleware } from './AuthMiddleware';
import { NoAuthMiddleware } from './NoAuthMiddleware';

export { AuthMiddleware } from './AuthMiddleware';
export { NoAuthMiddleware } from './NoAuthMiddleware';

export function createAuthMiddleware(): AuthMiddleware {
  const mode = process.env.AUTH_MODE || 'none';

  switch (mode) {
    case 'none':
      return new NoAuthMiddleware();
    default:
      throw new Error(`Unknown auth mode: ${mode}. Supported: none`);
  }
}

import { StorageProvider } from './StorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';

export { StorageProvider } from './StorageProvider';
export { LocalStorageProvider } from './LocalStorageProvider';

export function createStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'local';

  switch (provider) {
    case 'local': {
      const basePath = process.env.STORAGE_LOCAL_PATH || './data';
      return new LocalStorageProvider(basePath);
    }
    default:
      throw new Error(`Unknown storage provider: ${provider}. Supported: local`);
  }
}

import { Readable } from 'stream';

export interface StorageProvider {
  save(filePath: string, content: string | Buffer): Promise<void>;
  get(filePath: string): Promise<string | Buffer>;
  getStream(filePath: string): Promise<Readable>;
  delete(filePath: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  exists(filePath: string): Promise<boolean>;
  getPublicUrl(filePath: string): string;
}

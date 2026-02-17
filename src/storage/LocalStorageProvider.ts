import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { StorageProvider } from './StorageProvider';

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private resolve(filePath: string): string {
    return path.join(this.basePath, filePath);
  }

  async save(filePath: string, content: string | Buffer): Promise<void> {
    const fullPath = this.resolve(filePath);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, content);
  }

  async get(filePath: string): Promise<string | Buffer> {
    const fullPath = this.resolve(filePath);
    return fs.promises.readFile(fullPath);
  }

  async getStream(filePath: string): Promise<Readable> {
    const fullPath = this.resolve(filePath);
    return fs.createReadStream(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.resolve(filePath);
    await fs.promises.unlink(fullPath).catch(() => {});
  }

  async list(prefix: string): Promise<string[]> {
    const fullPath = this.resolve(prefix);
    try {
      const entries = await fs.promises.readdir(fullPath, { recursive: true });
      return entries.map((e) => path.join(prefix, e.toString()));
    } catch {
      return [];
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.resolve(filePath);
    try {
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(filePath: string): string {
    return `/api/storage/${filePath}`;
  }
}

import fs from 'fs/promises';
import path from 'path';
import { ScraperLogger } from './logger';

export interface SessionData {
  cookies: any[];
  localStorage: Record<string, string>;
  userAgent: string;
  createdAt: number;
}

export interface ISessionManager {
  getSession(platformId: string): Promise<SessionData | null>;
  saveSession(platformId: string, data: SessionData): Promise<void>;
  clearSession(platformId: string): Promise<void>;
}

export class SessionManager implements ISessionManager {
  private memoryCache: Map<string, SessionData> = new Map();
  private logger = new ScraperLogger('SessionManager');
  private persistPath: string;

  constructor(persistPath: string = path.join(process.cwd(), '.sessions')) {
    this.persistPath = persistPath;
  }

  private async ensureDirectory() {
    try {
      await fs.mkdir(this.persistPath, { recursive: true });
    } catch (e) {}
  }

  async getSession(platformId: string): Promise<SessionData | null> {
    if (this.memoryCache.has(platformId)) {
      this.logger.debug(`Memory cache hit for session: ${platformId}`);
      return this.memoryCache.get(platformId)!;
    }

    try {
      const filePath = path.join(this.persistPath, `${platformId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const session = JSON.parse(data) as SessionData;
      this.memoryCache.set(platformId, session);
      this.logger.debug(`File cache hit for session: ${platformId}`);
      return session;
    } catch (e) {
      this.logger.debug(`No session found for: ${platformId}`);
      return null;
    }
  }

  async saveSession(platformId: string, data: SessionData): Promise<void> {
    this.memoryCache.set(platformId, data);
    
    try {
      await this.ensureDirectory();
      const filePath = path.join(this.persistPath, `${platformId}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      this.logger.debug(`Saved session to file: ${platformId}`);
    } catch (error: any) {
      this.logger.error(`Failed to save session to file: ${platformId}`, { error: error.message });
    }
  }

  async clearSession(platformId: string): Promise<void> {
    this.memoryCache.delete(platformId);
    try {
      const filePath = path.join(this.persistPath, `${platformId}.json`);
      await fs.unlink(filePath);
      this.logger.debug(`Cleared session for: ${platformId}`);
    } catch (e) {
      // Ignore if file doesn't exist
    }
  }
}

import { ScraperAdapter, AdapterHealthEntry, PlatformStatusCode } from '../types';
import { ScraperLogger } from './logger';

export class AdapterRegistry {
  private adapters: Map<string, ScraperAdapter> = new Map();
  private logger = new ScraperLogger('AdapterRegistry');
  private lastHealthReport: Map<string, AdapterHealthEntry> = new Map();

  register(adapter: ScraperAdapter): void {
    const meta = adapter.getPlatform();
    this.adapters.set(meta.slug, adapter);
    this.logger.info(`Registered adapter: ${meta.name} (${meta.slug}) [enabled=${adapter.isEnabled()}, search=${adapter.supportsSearch()}, priority=${adapter.priority}]`);
  }

  /**
   * Returns adapters that are enabled and support search, sorted by priority (lower = higher priority).
   */
  getSearchAdapters(): ScraperAdapter[] {
    return Array.from(this.adapters.values())
      .filter(a => a.isEnabled() && a.supportsSearch())
      .sort((a, b) => a.priority - b.priority);
  }

  getAdapter(slug: string): ScraperAdapter | undefined {
    return this.adapters.get(slug);
  }

  getAllRegistered(): ScraperAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Runs health probes against all registered adapters.
   * If force=false, returns cached results from the last execution.
   */
  async getHealthReport(force: boolean = false): Promise<Record<string, AdapterHealthEntry>> {
    if (!force && this.lastHealthReport.size > 0) {
      const report: Record<string, AdapterHealthEntry> = {};
      for (const [slug, entry] of this.lastHealthReport) {
        report[slug] = entry;
      }
      return report;
    }

    const report: Record<string, AdapterHealthEntry> = {};

    const probePromises = Array.from(this.adapters.values()).map(async (adapter) => {
      const meta = adapter.getPlatform();

      if (!adapter.isEnabled()) {
        const entry: AdapterHealthEntry = {
          slug: meta.slug,
          platform: meta.name,
          status: 'DISABLED',
          latencyMs: 0,
          products: 0,
          lastChecked: new Date().toISOString()
        };
        report[meta.slug] = entry;
        this.lastHealthReport.set(meta.slug, entry);
        return;
      }

      if (!adapter.supportsSearch()) {
        const entry: AdapterHealthEntry = {
          slug: meta.slug,
          platform: meta.name,
          status: 'NOT_IMPLEMENTED',
          latencyMs: 0,
          products: 0,
          lastChecked: new Date().toISOString()
        };
        report[meta.slug] = entry;
        this.lastHealthReport.set(meta.slug, entry);
        return;
      }

      const startTime = Date.now();
      try {
        const results = await adapter.search('milk');
        const latencyMs = Date.now() - startTime;
        const status: PlatformStatusCode = results.length > 0 ? 'SUCCESS' : 'ZERO_RESULTS';
        const entry: AdapterHealthEntry = {
          slug: meta.slug,
          platform: meta.name,
          status,
          latencyMs,
          products: results.length,
          lastChecked: new Date().toISOString()
        };
        report[meta.slug] = entry;
        this.lastHealthReport.set(meta.slug, entry);
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        const isTimeout = err.message?.includes('Timeout');
        const isBlocked = err.message?.includes('403') || err.message?.includes('Cloudflare') || err.message?.includes('blocked');
        const isParser = err.message?.includes('PARSER_FAILED') || err.message?.includes('parse');

        const status: PlatformStatusCode = isTimeout
          ? 'TIMEOUT'
          : isBlocked
            ? 'BLOCKED_BY_ANTI_BOT'
            : isParser
              ? 'PARSER_FAILED'
              : 'NETWORK_FAILED';

        const entry: AdapterHealthEntry = {
          slug: meta.slug,
          platform: meta.name,
          status,
          latencyMs,
          products: 0,
          error: err.message,
          lastChecked: new Date().toISOString()
        };
        report[meta.slug] = entry;
        this.lastHealthReport.set(meta.slug, entry);
      }
    });

    await Promise.allSettled(probePromises);
    return report;
  }

  /**
   * Update the cached health entry for a specific adapter after a real search execution.
   */
  updateHealthFromExecution(slug: string, entry: AdapterHealthEntry): void {
    this.lastHealthReport.set(slug, entry);
  }
}

import { scraperConfig } from '../config';

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export interface IProxyManager {
  getProxy(): ProxyConfig | null;
}

export class ProxyManager implements IProxyManager {
  getProxy(): ProxyConfig | null {
    if (!scraperConfig.proxy.enabled || scraperConfig.proxy.type === 'none') {
      return null;
    }

    // In a real environment, this might rotate proxies from a list
    // or call an external service to fetch a fresh residential IP.
    // For MVP, we just parse the URL from config.
    
    if (!scraperConfig.proxy.url) {
      return null;
    }

    try {
      const parsedUrl = new URL(scraperConfig.proxy.url);
      
      // format: http://username:password@proxy.example.com:8080
      return {
        server: `${parsedUrl.protocol}//${parsedUrl.host}`,
        username: parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined,
        password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
      };
    } catch (e) {
      return null;
    }
  }
}

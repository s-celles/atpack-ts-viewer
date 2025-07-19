/**
 * Utilities to work around CORS issues when loading packs
 */

// Public CORS proxy services with fallback strategy
const CORS_PROXIES = [
  // AllOrigins - generally more reliable
  'https://api.allorigins.win/raw?url=',
  // Proxy alternative services
  'https://cors-anywhere.herokuapp.com/',
  // ThingProxy - simple and usually works
  'https://thingproxy.freeboard.io/fetch/',
];

/**
 * Try multiple CORS proxy services for better reliability
 */
async function tryMultipleProxies(originalUrl: string, options?: RequestInit): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxyService = CORS_PROXIES[i];
    const proxyUrl = `${proxyService}${encodeURIComponent(originalUrl)}`;
    
    try {
      console.log(`Trying CORS proxy ${i + 1}/${CORS_PROXIES.length}: ${proxyService}`);
      
      const response = await fetch(proxyUrl, {
        ...options,
        headers: {
          ...options?.headers,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      
      if (response.ok) {
        console.log(`Success with proxy ${i + 1}: ${proxyService}`);
        return response;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`CORS proxy ${i + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error');
      // Continue to next proxy
    }
  }
  
  // All proxies failed
  throw new Error(`All CORS proxies failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Transforms a URL to use a local or remote CORS proxy
 */
export function getCorsProxyUrl(originalUrl: string): string {
  console.log('Transforming URL:', originalUrl);
  
  // In development, use the local Vite proxy
  if (import.meta.env.DEV) {
    if (originalUrl.includes('packs.download.atmel.com')) {
      // Handle both HTTP and HTTPS URLs for Atmel
      const proxyUrl = originalUrl
        .replace('http://packs.download.atmel.com', '/cors-proxy-atmel')
        .replace('https://packs.download.atmel.com', '/cors-proxy-atmel');
      console.log('Atmel proxy URL:', proxyUrl);
      return proxyUrl;
    }
    if (originalUrl.includes('packs.download.microchip.com')) {
      const proxyUrl = originalUrl.replace('https://packs.download.microchip.com', '/cors-proxy-microchip');
      console.log('Microchip proxy URL:', proxyUrl);
      return proxyUrl;
    }
  }
  
  // In production, use a public proxy service with fallback
  return `${CORS_PROXIES[0]}${encodeURIComponent(originalUrl)}`;
}

/**
 * Fetch with automatic CORS proxy handling and multiple fallbacks
 */
export async function fetchWithCorsProxy(url: string, options?: RequestInit): Promise<Response> {
  // Try the direct URL first
  try {
    console.log(`Attempting direct fetch: ${url}`);
    const response = await fetch(url, options);
    if (response.ok) {
      console.log('Direct fetch successful');
      return response;
    }
  } catch (error) {
    console.log('Direct fetch failed, trying with CORS proxies...', error);
  }
  
  // If direct fetch fails, try multiple CORS proxies
  return tryMultipleProxies(url, options);
}

/**
 * Popular PIDX index URLs
 */
export const POPULAR_PIDX_URLS = [
  {
    name: 'Atmel (Legacy)',
    url: 'http://packs.download.atmel.com/Atmel.pidx',
    description: 'Atmel pack index (legacy)'
  },
  {
    name: 'Microchip',
    url: 'https://packs.download.microchip.com/Microchip.pidx',
    description: 'Official Microchip pack index'
  },
];

/**
 * Utilities to work around CORS issues when loading packs
 */

// Public CORS proxy services (warning: some may be unstable)
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://cors-anywhere.herokuapp.com/',
  'https://api.allorigins.win/raw?url=',
];

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
  
  // In production, use a public proxy service
  return `${CORS_PROXIES[0]}${encodeURIComponent(originalUrl)}`;
}

/**
 * Fetch with automatic CORS proxy handling
 */
export async function fetchWithCorsProxy(url: string, options?: RequestInit): Promise<Response> {
  // Try the direct URL first
  try {
    const response = await fetch(url, options);
    if (response.ok) {
      return response;
    }
  } catch (error) {
    console.log('Direct fetch failed, trying with CORS proxy...', error);
  }
  
  // If it fails, use the CORS proxy
  const proxyUrl = getCorsProxyUrl(url);
  console.log(`Using CORS proxy: ${proxyUrl}`);
  
  try {
    const response = await fetch(proxyUrl, {
      ...options,
      headers: {
        ...options?.headers,
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    throw new Error(`Failed to fetch via CORS proxy: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * URLs des index PIDX populaires
 */
export const POPULAR_PIDX_URLS = [
  {
    name: 'Atmel (Legacy)',
    url: 'http://packs.download.atmel.com/Atmel.pidx',
    description: 'Index des packs Atmel (ancien)'
  },
  {
    name: 'Microchip',
    url: 'https://packs.download.microchip.com/Microchip.pidx',
    description: 'Index officiel des packs Microchip'
  },
];

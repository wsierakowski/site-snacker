import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../utils/url.js';
import { mkdirp } from 'mkdirp';

// Default browser-like headers to mimic a real browser
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Connection': 'keep-alive',
  'DNT': '1',
  'Referer': 'https://www.google.com/'
};

// Additional headers that might help bypass Cloudflare
const CLOUDFLARE_HEADERS = {
  ...DEFAULT_HEADERS,
  'CF-Access-Client-Id': '',
  'CF-Access-Client-Secret': '',
  'CF-Connecting-IP': '',
  'CF-IPCountry': 'US',
  'CF-RAY': '',
  'CF-Visitor': '{"scheme":"https"}',
  'CDN-Loop': 'cloudflare',
  'X-Forwarded-For': '',
  'X-Forwarded-Proto': 'https',
  'X-Real-IP': ''
};

/**
 * Sleep for a specified number of milliseconds
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Detects if the response is a Cloudflare challenge page
 * @param html HTML content to check
 * @returns True if the content is a Cloudflare challenge page
 */
function isCloudflareChallenge(html: string): boolean {
  return html.includes('Just a moment') || 
         html.includes('cf-browser-verification') || 
         html.includes('cf_chl_prog') ||
         html.includes('challenge-platform');
}

/**
 * Fetches HTML content from a URL and optionally caches it
 * @param url The URL to fetch
 * @param useCache Whether to use cached content if available
 * @param options Additional options for the request
 * @returns The HTML content as a string
 */
export async function fetchHtml(
  url: string, 
  useCache: boolean = true,
  options: {
    retries?: number;
    retryDelay?: number;
    timeout?: number;
    useCloudflareHeaders?: boolean;
  } = {}
): Promise<string> {
  // Default options
  const {
    retries = 3,
    retryDelay = 2000,
    timeout = 15000,
    useCloudflareHeaders = false
  } = options;

  // Convert URL to file path
  const filePath = urlToFilePath(url);
  const dirPath = path.dirname(filePath);

  // Check if cached content exists and should be used
  if (useCache && fs.existsSync(filePath)) {
    console.log(`Using cached content for ${url}`);
    return fs.readFileSync(filePath, 'utf-8');
  }

  // Select headers based on options
  const headers = useCloudflareHeaders ? CLOUDFLARE_HEADERS : DEFAULT_HEADERS;
  
  // Add a random delay between requests to avoid rate limiting
  const randomDelay = Math.floor(Math.random() * 2000) + 1000;
  await sleep(randomDelay);

  let lastError: Error | null = null;
  
  // Retry logic
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`Fetching content from ${url} (attempt ${attempt + 1}/${retries})`);
      
      const config: AxiosRequestConfig = {
        headers,
        timeout,
        maxRedirects: 5,
        validateStatus: (status) => status < 500 // Accept any status < 500
      };
      
      const response = await axios.get(url, config);
      const html = response.data;

      // Check if the response is a Cloudflare challenge page
      if (isCloudflareChallenge(html)) {
        console.log(`Detected Cloudflare challenge page for ${url}`);
        
        // If this is the last attempt, throw an error
        if (attempt === retries - 1) {
          throw new Error(`Cloudflare challenge detected for ${url}. Consider using a browser automation tool like Puppeteer.`);
        }
        
        // Otherwise, wait and retry
        console.log(`Waiting ${retryDelay}ms before retrying...`);
        await sleep(retryDelay);
        continue;
      }

      // Create directory if it doesn't exist
      await mkdirp(dirPath);

      // Cache the content
      fs.writeFileSync(filePath, html);
      console.log(`Cached content to ${filePath}`);

      return html;
    } catch (error) {
      lastError = error as Error;
      
      // Handle specific error cases
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const headers = error.response?.headers;
        
        // Check for Cloudflare-specific errors
        if (status === 403 && headers?.['server'] === 'cloudflare') {
          console.log(`Cloudflare blocked access to ${url}`);
          
          // If this is the last attempt, throw a more descriptive error
          if (attempt === retries - 1) {
            throw new Error(`Error ${status}: Access blocked by Cloudflare protection. Consider using a browser automation tool like Puppeteer.`);
          }
        } else if (status === 429) {
          // Rate limiting
          console.log(`Rate limited for ${url}, waiting before retry...`);
          await sleep(retryDelay * 2); // Wait longer for rate limiting
          continue;
        }
      }
      
      // If this is the last attempt, throw the error
      if (attempt === retries - 1) {
        throw lastError;
      }
      
      // Otherwise, wait and retry
      console.log(`Error fetching ${url}: ${lastError.message}`);
      console.log(`Waiting ${retryDelay}ms before retrying...`);
      await sleep(retryDelay);
    }
  }
  
  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw lastError || new Error(`Failed to fetch ${url} after ${retries} attempts`);
} 
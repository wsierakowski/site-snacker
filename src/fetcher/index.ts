import axios, { AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../utils/url.js';
import { mkdirp } from 'mkdirp';

/**
 * Fetches HTML content from a URL and optionally caches it
 * @param url The URL to fetch
 * @param useCache Whether to use cached content if available
 * @returns The HTML content as a string
 */
export async function fetchHtml(url: string, useCache: boolean = true): Promise<string> {
  // Convert URL to file path
  const filePath = urlToFilePath(url);
  const dirPath = path.dirname(filePath);

  // Check if cached content exists and should be used
  if (useCache && fs.existsSync(filePath)) {
    console.log(`Using cached content for ${url}`);
    return fs.readFileSync(filePath, 'utf-8');
  }

  try {
    console.log(`Fetching content from ${url}`);
    const response = await axios.get(url, {
      headers: {
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
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000, // 10 seconds timeout
      maxRedirects: 5
    });

    const html = response.data;

    // Create directory if it doesn't exist
    await mkdirp(dirPath);

    // Cache the content
    fs.writeFileSync(filePath, html);
    console.log(`Cached content to ${filePath}`);

    return html;
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 403) {
      const headers = error.response.headers;
      if (headers['server'] === 'cloudflare') {
        throw new Error(`Error ${error.response?.status}: Access blocked by Cloudflare protection. \n ${error.response?.data}`);
      }
    }
    throw error;
  }
} 
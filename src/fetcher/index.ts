import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath, urlToDirPath } from '../utils/url.js';

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
        'User-Agent': 'Site Snacker Bot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000, // 10 seconds timeout
    });

    const html = response.data;

    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Cache the content
    fs.writeFileSync(filePath, html);
    console.log(`Cached content to ${filePath}`);

    return html;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Error fetching ${url}: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Headers: ${JSON.stringify(error.response.headers)}`);
      }
    } else {
      console.error(`Unknown error fetching ${url}: ${error}`);
    }
    throw error;
  }
} 
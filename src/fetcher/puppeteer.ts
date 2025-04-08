import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../utils/url.js';
import { mkdirp } from 'mkdirp';

/**
 * Fetches HTML content from a URL using Puppeteer, which can handle Cloudflare protection
 * @param url The URL to fetch
 * @param options Configuration options for the fetch
 * @returns The HTML content as a string
 */
export async function fetchWithPuppeteer(
  url: string,
  options: {
    useCache?: boolean;
    waitTime?: number;
    timeout?: number;
    waitForSelector?: string;
  } = {}
): Promise<string> {
  const {
    useCache = true,
    waitTime = 10000, // Time to wait for Cloudflare challenge to complete
    timeout = 30000,  // Overall timeout
    waitForSelector = 'body' // Wait for this element to be present
  } = options;

  // Convert URL to file path for caching
  const filePath = urlToFilePath(url);
  const dirPath = path.dirname(filePath);

  // Check cache first if enabled
  if (useCache && fs.existsSync(filePath)) {
    console.log(`Using cached content for ${url}`);
    return fs.readFileSync(filePath, 'utf-8');
  }

  console.log(`Fetching ${url} with Puppeteer...`);
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: true, // Use headless mode
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080'
    ]
  });

  try {
    const page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Set default timeout
    page.setDefaultTimeout(timeout);

    // Enable request interception to handle potential redirects
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font', 'script'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Navigate to the URL
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: timeout
    });

    // Wait for the specified selector to be present
    await page.waitForSelector(waitForSelector, { timeout });

    // Additional wait time for Cloudflare challenge
    if (waitTime > 0) {
      console.log(`Waiting ${waitTime}ms for potential Cloudflare challenge...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Get the final HTML content
    const html = await page.content();

    // Check if we got a Cloudflare challenge page
    if (html.includes('Just a moment') || html.includes('cf-browser-verification')) {
      throw new Error('Still getting Cloudflare challenge page after waiting. Try increasing the wait time.');
    }

    // Create cache directory and save content if successful
    await mkdirp(dirPath);
    fs.writeFileSync(filePath, html);
    console.log(`Cached content to ${filePath}`);

    return html;
  } finally {
    await browser.close();
  }
} 
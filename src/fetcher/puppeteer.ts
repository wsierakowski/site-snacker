import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../utils/url.js';
import { mkdirp } from 'mkdirp';
import { getFetcherConfig } from '../config';

// Get configuration
const config = getFetcherConfig();

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
    waitTime = config.cloudflare.wait_time,
    timeout = config.cloudflare.timeout,
    waitForSelector = 'body'
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
  
  // Launch browser with new headless mode
  const browser = await puppeteer.launch({
    headless: true as any, // Use new headless mode but satisfy TypeScript
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      `--window-size=${config.puppeteer.viewport.width}x${config.puppeteer.viewport.height}`,
      '--disable-notifications',
      '--disable-extensions',
      '--ignore-certificate-errors'
    ]
  });

  try {
    const page = await browser.newPage();

    // Set more browser-like settings
    await page.setViewport({ 
      width: config.puppeteer.viewport.width, 
      height: config.puppeteer.viewport.height 
    });
    await page.setUserAgent(config.puppeteer.user_agent);
    await page.setExtraHTTPHeaders({
      'Accept-Language': config.puppeteer.headers.accept_language,
      'Accept': config.puppeteer.headers.accept,
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'DNT': '1'
    });

    // Set default timeout
    page.setDefaultTimeout(timeout);

    // Enable JavaScript and cookies
    await page.setJavaScriptEnabled(true);

    // Navigate to the URL with more options
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
      throw new Error('Still getting Cloudflare challenge page. Try increasing the wait time with --wait=20000');
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
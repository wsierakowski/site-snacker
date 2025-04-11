import { fetchHtml, fetchWithPuppeteer } from '../fetcher';
import { htmlToMarkdown } from '../converter';
import { processMarkdownContent } from '../processor';
import { urlToFilePath } from '../utils/url.js';
import * as fs from 'fs';
import * as path from 'path';

export interface OrchestrationResult {
  htmlPath: string;
  markdownPath: string;
  processedPath: string;
  costSummary: string;
}

/**
 * Orchestrates the entire process of fetching, converting, and processing a webpage
 * @param url The URL to process
 * @param options Optional configuration for the process
 * @returns Paths to the generated files and cost summary
 */
export async function orchestrate(
  url: string,
  options: {
    usePuppeteer?: boolean;
    waitTime?: number;
    timeout?: number;
    useCache?: boolean;
  } = {}
): Promise<OrchestrationResult> {
  console.log('\n=== Starting Site Snacker Orchestration ===');
  console.log('URL:', url);
  console.log('Options:', options);

  try {
    // Step 1: Fetch HTML
    console.log('\n=== Step 1: Fetching HTML ===');
    let html: string;
    
    if (options.usePuppeteer) {
      console.log('Using Puppeteer for fetching (explicitly requested)...');
      html = await fetchWithPuppeteer(url, {
        useCache: options.useCache,
        waitTime: options.waitTime,
        timeout: options.timeout
      });
    } else {
      try {
        console.log('Attempting standard fetch first...');
        html = await fetchHtml(url, options.useCache, {
          timeout: options.timeout,
          useCloudflareHeaders: true
        });
      } catch (error: any) {
        // Check if the error message suggests Cloudflare protection
        if (
          error.message.includes('Cloudflare') ||
          error.message.includes('challenge') ||
          (error.response?.status === 403 && error.response?.headers?.['server'] === 'cloudflare')
        ) {
          console.log('\nCloudflare protection detected, falling back to Puppeteer...');
          html = await fetchWithPuppeteer(url, {
            useCache: options.useCache,
            waitTime: options.waitTime || 20000, // Use longer wait time for automatic fallback
            timeout: options.timeout || 60000 // Use longer timeout for automatic fallback
          });
        } else {
          // If it's not a Cloudflare issue, rethrow the error
          throw error;
        }
      }
    }

    // Get file paths
    const htmlPath = urlToFilePath(url);
    const markdownPath = htmlPath.replace(/\.html$/, '.md');
    const processedPath = path.join('output', 'processed', path.basename(path.dirname(markdownPath)), path.basename(markdownPath));

    // Ensure directories exist
    const htmlDir = path.dirname(htmlPath);
    const processedDir = path.dirname(processedPath);
    if (!fs.existsSync(htmlDir)) {
      fs.mkdirSync(htmlDir, { recursive: true });
    }
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }

    // Save HTML content
    fs.writeFileSync(htmlPath, html);

    // Step 2: Convert to Markdown
    console.log('\n=== Step 2: Converting to Markdown ===');
    const markdown = await htmlToMarkdown(html);

    // Save Markdown content
    fs.writeFileSync(markdownPath, markdown);

    // Step 3: Process Markdown
    console.log('\n=== Step 3: Processing Markdown ===');
    const { content: processedMarkdown, costSummary } = await processMarkdownContent(
      markdown,
      url.replace(/\.html$/, ''),
      processedDir,
      markdownPath
    );

    // Add source URL at the top of the processed markdown
    const markdownWithSource = `[source: ${url}]\n\n${processedMarkdown}`;

    // Save processed markdown
    fs.writeFileSync(processedPath, markdownWithSource);

    console.log('\n=== Orchestration Complete ===');
    console.log('HTML cached at:', htmlPath);
    console.log('Markdown saved at:', markdownPath);
    console.log('Processed markdown saved at:', processedPath);
    console.log('\nOpenAI API Usage Summary:');
    console.log('------------------------');
    console.log(costSummary);

    return {
      htmlPath,
      markdownPath,
      processedPath,
      costSummary
    };
  } catch (error: any) {
    console.error('\n=== Orchestration Error ===');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
} 
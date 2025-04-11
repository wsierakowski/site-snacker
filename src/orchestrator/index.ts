import { fetchHtml, fetchWithPuppeteer } from '../fetcher';
import { htmlToMarkdown } from '../converter';
import { processMarkdownContent } from '../processor';
import { urlToFilePath } from '../utils/url.js';
import { parseSitemap, isSitemapSource } from '../sitemap/index.js';
import { mergeMarkdownFiles } from '../merger/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { getDirectoryConfig, getFetcherConfig, getSitemapConfig } from '../config';

// Get configuration
const dirConfig = getDirectoryConfig();
const fetcherConfig = getFetcherConfig();
const sitemapConfig = getSitemapConfig();

export interface OrchestrationResult {
  htmlPath: string;
  markdownPath: string;
  processedPath: string;
  costSummary: string;
  url: string;
}

export interface SitemapOrchestrationResult {
  results: OrchestrationResult[];
  totalCostSummary: string;
  mergedMarkdownPath?: string;
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
    mergeMarkdown?: boolean;
  } = {}
): Promise<OrchestrationResult | SitemapOrchestrationResult> {
  console.log('\n=== Starting Site Snacker Orchestration ===');
  console.log('Input:', url);
  console.log('Options:', options);

  try {
    // Check if the input is a sitemap
    if (isSitemapSource(url)) {
      console.log('\n=== Processing Sitemap ===');
      const urls = await parseSitemap(url);
      console.log(`Found ${urls.length} URLs in sitemap`);
      
      const results: OrchestrationResult[] = [];
      let totalCostSummary = '';
      let successCount = 0;
      let failureCount = 0;
      
      // Process each URL in the sitemap
      for (const [index, pageUrl] of urls.entries()) {
        const progress = ((index + 1) / urls.length * 100).toFixed(1);
        console.log(`\n=== Processing URL ${index + 1}/${urls.length} (${progress}%) ===`);
        console.log(`URL: ${pageUrl}`);
        
        try {
          const result = await processUrl(pageUrl, options);
          results.push(result);
          successCount++;
          
          // Accumulate cost summary
          if (result.costSummary) {
            totalCostSummary += `\n=== URL ${index + 1}: ${pageUrl} ===\n${result.costSummary}\n`;
          }
        } catch (error: any) {
          console.error(`Error processing URL ${pageUrl}:`, error.message);
          failureCount++;
          // Continue with next URL even if one fails
        }
      }
      
      // Print final summary
      console.log('\n=== Sitemap Processing Complete ===');
      console.log(`Total URLs: ${urls.length}`);
      console.log(`Successfully processed: ${successCount}`);
      console.log(`Failed: ${failureCount}`);
      console.log('\nTotal Cost Summary:');
      console.log(totalCostSummary);

      // Merge markdown files if requested
      let mergedMarkdownPath: string | undefined;
      if (options.mergeMarkdown !== false) { // Default to true
        const filesToMerge = results.map(r => ({
          markdownPath: r.markdownPath,
          url: r.url
        }));
        const sitemapName = path.basename(url, path.extname(url));
        mergedMarkdownPath = path.join(
          dirConfig.output.base,
          dirConfig.output.merged,
          `${sitemapName}-merged.md`
        );
        await mergeMarkdownFiles(filesToMerge, mergedMarkdownPath, url);
      }
      
      return {
        results,
        totalCostSummary,
        mergedMarkdownPath
      };
    } else {
      // Process single URL
      return await processUrl(url, options);
    }
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

/**
 * Process a single URL through the pipeline
 */
async function processUrl(
  url: string,
  options: {
    usePuppeteer?: boolean;
    waitTime?: number;
    timeout?: number;
    useCache?: boolean;
  } = {}
): Promise<OrchestrationResult> {
  // Step 1: Fetch HTML
  console.log('\n=== Step 1: Fetching HTML ===');
  let html: string;
  
  if (options.usePuppeteer) {
    console.log('Using Puppeteer for fetching (explicitly requested)...');
    html = await fetchWithPuppeteer(url, {
      useCache: options.useCache,
      waitTime: options.waitTime || fetcherConfig.cloudflare.wait_time,
      timeout: options.timeout || fetcherConfig.cloudflare.timeout
    });
  } else {
    try {
      console.log('Attempting standard fetch first...');
      html = await fetchHtml(url, options.useCache, {
        timeout: options.timeout || fetcherConfig.cloudflare.timeout,
        useCloudflareHeaders: fetcherConfig.cloudflare.auto_detect
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
          waitTime: options.waitTime || fetcherConfig.cloudflare.wait_time,
          timeout: options.timeout || fetcherConfig.cloudflare.timeout
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
  const processedPath = path.join(
    dirConfig.output.base,
    dirConfig.output.processed,
    path.basename(path.dirname(markdownPath)),
    path.basename(markdownPath)
  );

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

  console.log('\n=== Processing Complete ===');
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
    costSummary,
    url
  };
} 
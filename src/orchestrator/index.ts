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
  failedUrls: FailedUrl[];
}

export interface FailedUrl {
  url: string;
  error: string;
  retryCommand: string;
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
    // Check if the input is a local HTML file
    if (fs.existsSync(url) && (url.endsWith('.html') || url.endsWith('.htm'))) {
      // Process local HTML file directly
      return await processLocalHtmlFile(url);
    }
    // Check if the input is a sitemap
    if (isSitemapSource(url)) {
      console.log('\n=== Processing Sitemap ===');
      const urls = await parseSitemap(url);
      console.log(`Found ${urls.length} URLs in sitemap`);
      
      const results: OrchestrationResult[] = [];
      const failedUrls: FailedUrl[] = [];
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
          
          // Track failed URL with error details and retry command
          const retryCommand = `bun run snack "${pageUrl}" --timeout=${options.timeout || fetcherConfig.cloudflare.timeout * 2}`;
          failedUrls.push({
            url: pageUrl,
            error: error.message,
            retryCommand
          });
          
          // Continue with next URL even if one fails
        }
      }
      
      // Print final summary
      console.log('\n=== Sitemap Processing Complete ===');
      console.log(`Total URLs: ${urls.length}`);
      console.log(`Successfully processed: ${successCount}`);
      console.log(`Failed: ${failureCount}`);
      
      if (totalCostSummary) {
        console.log('\nOpenAI API Usage Summary:');
        console.log('------------------------');
        console.log(totalCostSummary);
      }

      // Print error report if there were failures
      if (failedUrls.length > 0) {
        console.log('\n=== Error Report ===');
        console.log(`${failedUrls.length} out of ${urls.length} URLs failed to process.`);
        console.log('\nFailed URLs:');
        failedUrls.forEach((failedUrl, index) => {
          console.log(`\n${index + 1}. ${failedUrl.url}`);
          console.log(`   Error: ${failedUrl.error}`);
          console.log(`   Retry command: ${failedUrl.retryCommand}`);
        });
        console.log('\nTo retry failed URLs, run the commands above. The timeout has been doubled to help with slow-loading pages.');
      }

      // Merge markdown files if requested
      let mergedMarkdownPath: string | undefined;
      if (options.mergeMarkdown !== false) { // Default to true
        console.log('\n=== Merging Markdown Files ===');
        const filesToMerge = results.map(r => ({
          markdownPath: r.markdownPath,
          url: r.url
        }));
        const sitemapName = path.basename(url, path.extname(url));
        mergedMarkdownPath = path.join(dirConfig.output.base, dirConfig.output.merged, `${sitemapName}-merged.md`);
        await mergeMarkdownFiles(filesToMerge, mergedMarkdownPath, url);
      }
      
      return {
        results,
        totalCostSummary,
        mergedMarkdownPath,
        failedUrls
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
        throw error;
      }
    }
  }

  // Get file paths
  const htmlPath = urlToFilePath(url);
  const tmpMarkdownPath = htmlPath.replace(/\.html$/, '.md');
  const outputMarkdownPath = path.join(
    dirConfig.output.base,
    dirConfig.output.processed,
    path.basename(path.dirname(tmpMarkdownPath)),
    path.basename(tmpMarkdownPath)
  );

  // Ensure directories exist
  const htmlDir = path.dirname(htmlPath);
  const tmpDir = path.dirname(tmpMarkdownPath);
  const outputDir = path.dirname(outputMarkdownPath);
  if (!fs.existsSync(htmlDir)) {
    fs.mkdirSync(htmlDir, { recursive: true });
  }
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save HTML content
  fs.writeFileSync(htmlPath, html);

  // Step 2: Convert to Markdown
  console.log('\n=== Step 2: Converting to Markdown ===');
  const markdown = await htmlToMarkdown(html, url);

  // Save Markdown content to tmp only
  fs.writeFileSync(tmpMarkdownPath, markdown);

  // Step 3: Process Markdown
  console.log('\n=== Step 3: Processing Markdown ===');
  const { content: processedMarkdown, costSummary } = await processMarkdownContent(
    markdown,
    url.replace(/\.html$/, ''),
    outputDir,
    tmpMarkdownPath
  );

  // Save processed markdown to output only (with .md extension)
  fs.writeFileSync(outputMarkdownPath, processedMarkdown);

  console.log('\n=== Processing Complete ===');
  console.log('HTML cached at:', htmlPath);
  console.log('Markdown saved at (tmp):', tmpMarkdownPath);
  console.log('Processed markdown saved at:', outputMarkdownPath);

  return {
    htmlPath,
    markdownPath: tmpMarkdownPath,
    processedPath: outputMarkdownPath,
    costSummary,
    url
  };
}

/**
 * Process a local HTML file through the pipeline
 */
async function processLocalHtmlFile(localPath: string): Promise<OrchestrationResult> {
  console.log('\n=== Step 1: Reading Local HTML File ===');
  const html = fs.readFileSync(localPath, 'utf-8');

  // Mirror the input path under the output directory
  const relativePath = path.relative(process.cwd(), localPath);
  const tmpBasePath = path.join('tmp', relativePath.replace(/\.html?$/, ''));
  const outputBasePath = path.join(dirConfig.output.base, relativePath.replace(/\.html?$/, ''));
  const tmpMarkdownPath = tmpBasePath + '.md';
  const outputMarkdownPath = outputBasePath + '.md';

  // Ensure output directories exist
  fs.mkdirSync(path.dirname(tmpMarkdownPath), { recursive: true });
  fs.mkdirSync(path.dirname(outputMarkdownPath), { recursive: true });

  // Step 2: Convert to Markdown
  console.log('\n=== Step 2: Converting to Markdown ===');
  const markdown = await htmlToMarkdown(html, `file://${path.resolve(localPath)}`);
  fs.writeFileSync(tmpMarkdownPath, markdown);

  // Step 3: Process Markdown
  console.log('\n=== Step 3: Processing Markdown ===');
  const { content: processedMarkdown, costSummary } = await processMarkdownContent(
    markdown,
    `file://${path.resolve(localPath)}`,
    path.dirname(outputMarkdownPath),
    tmpMarkdownPath
  );
  fs.writeFileSync(outputMarkdownPath, processedMarkdown);

  console.log('\n=== Processing Complete ===');
  console.log('HTML read from:', localPath);
  console.log('Markdown saved at (tmp):', tmpMarkdownPath);
  console.log('Processed markdown saved at:', outputMarkdownPath);

  return {
    htmlPath: localPath,
    markdownPath: tmpMarkdownPath,
    processedPath: outputMarkdownPath,
    costSummary,
    url: `file://${path.resolve(localPath)}`
  };
} 
#!/usr/bin/env bun

import { orchestrate } from '../src/orchestrator';

/**
 * Script to process a URL or sitemap through the entire Site Snacker pipeline
 * Usage: bun snack-url.ts <url|sitemap> [--puppeteer] [--wait=20000] [--timeout=60000] [--no-cache] [--no-merge]
 * 
 * Examples:
 *   bun snack-url.ts https://example.com
 *   bun snack-url.ts https://example.com/sitemap.xml
 *   bun snack-url.ts ./local-sitemap.xml
 *   bun snack-url.ts https://example.com/sitemap.xml --no-merge
 */
async function main() {
  const args = process.argv.slice(2);
  const source = args[0];

  if (!source) {
    console.error('Please provide a URL or sitemap to process');
    console.error('\nUsage: bun snack-url.ts <url|sitemap> [--puppeteer] [--wait=20000] [--timeout=60000] [--no-cache] [--no-merge]');
    console.error('\nExamples:');
    console.error('  bun snack-url.ts https://example.com');
    console.error('  bun snack-url.ts https://example.com/sitemap.xml');
    console.error('  bun snack-url.ts ./local-sitemap.xml');
    console.error('  bun snack-url.ts https://example.com/sitemap.xml --no-merge');
    process.exit(1);
  }

  // Parse command line options
  const options = {
    usePuppeteer: args.includes('--puppeteer'),
    waitTime: parseInt(args.find(arg => arg.startsWith('--wait='))?.split('=')[1] || '20000'),
    timeout: parseInt(args.find(arg => arg.startsWith('--timeout='))?.split('=')[1] || '60000'),
    useCache: !args.includes('--no-cache'),
    mergeMarkdown: !args.includes('--no-merge')
  };

  try {
    const result = await orchestrate(source, options);
    
    // Handle sitemap results
    if ('results' in result) {
      console.log('\n=== Sitemap Processing Complete ===');
      console.log(`Processed ${result.results.length} URLs`);
      console.log('\nTotal Cost Summary:');
      console.log(result.totalCostSummary);
      
      if (result.mergedMarkdownPath) {
        console.log('\nMerged Markdown:');
        console.log(`All pages have been merged into: ${result.mergedMarkdownPath}`);
      }
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('\nFatal error:', error.message);
    process.exit(1);
  }
}

main(); 
#!/usr/bin/env bun

import { fetchHtml } from '../src/fetcher';
import { processMarkdownContent } from '../src/processor';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * Simple script to fetch a URL directly using the fetcher module
 */
async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL to fetch');
    process.exit(1);
  }

  try {
    const html = await fetchHtml(url);
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'output');
    await mkdir(outputDir, { recursive: true });
    
    await writeFile(path.join(outputDir, 'fetched.html'), html);
    
    // Process the markdown content
    const processedMarkdown = await processMarkdownContent(html, url, outputDir);
    await writeFile(path.join(outputDir, 'processed.md'), processedMarkdown);

    console.log('Content fetched and processed successfully!');
    console.log(`Output files saved in: ${outputDir}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 
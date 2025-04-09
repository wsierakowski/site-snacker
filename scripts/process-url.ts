#!/usr/bin/env bun

import { processMarkdownContent } from '../src/processor';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../src/utils/url.js';

/**
 * Script to process cached markdown content for images and audio
 * Usage: bun process-url.ts <url>
 */
async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL to process');
    process.exit(1);
  }

  try {
    // First convert URL to file path, then replace .html with .md
    const markdownPath = urlToFilePath(url).replace(/\.html$/, '.md');
    
    if (!fs.existsSync(markdownPath)) {
      console.error(`No markdown file found in cache for URL: ${url}`);
      console.error(`Expected path: ${markdownPath}`);
      console.error('\nPlease make sure to:');
      console.error('1. Run the converter first: bun run convert ' + url);
      console.error('2. Check if the URL is correct');
      console.error('3. Verify that the markdown file exists in the tmp directory');
      process.exit(1);
    }

    console.log(`Found markdown file at: ${markdownPath}`);
    const markdown = fs.readFileSync(markdownPath, 'utf-8');

    // Create output directory for processed content
    const outputDir = path.join(process.cwd(), 'output', 'processed');
    await fs.promises.mkdir(outputDir, { recursive: true });

    // Process the markdown content
    console.log('Processing markdown for images and audio...');
    // Remove .html for the base URL used in processing
    const baseUrl = url.replace(/\.html$/, '');
    const processedMarkdown = await processMarkdownContent(markdown, baseUrl, outputDir);

    // Save processed markdown
    const processedPath = path.join(outputDir, path.basename(markdownPath));
    await fs.promises.writeFile(processedPath, processedMarkdown);

    console.log('Content processed successfully!');
    console.log(`Processed markdown saved to: ${processedPath}`);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the script
main(); 
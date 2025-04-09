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
    // Find the markdown file in cache
    const markdownPath = urlToFilePath(url).replace(/\.html$/, '.md');
    if (!fs.existsSync(markdownPath)) {
      console.error(`No markdown file found in cache for URL: ${url}`);
      console.error(`Expected path: ${markdownPath}`);
      process.exit(1);
    }

    console.log(`Found markdown file at: ${markdownPath}`);
    const markdown = fs.readFileSync(markdownPath, 'utf-8');

    // Create output directory for processed content
    const outputDir = path.join(process.cwd(), 'output', 'processed');
    await fs.promises.mkdir(outputDir, { recursive: true });

    // Process the markdown content
    console.log('Processing markdown for images and audio...');
    const processedMarkdown = await processMarkdownContent(markdown, url, outputDir);

    // Save processed markdown
    const processedPath = path.join(outputDir, path.basename(markdownPath));
    await fs.promises.writeFile(processedPath, processedMarkdown);

    console.log('Content processed successfully!');
    console.log(`Processed markdown saved to: ${processedPath}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 
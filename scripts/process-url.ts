#!/usr/bin/env bun

import { processMarkdownContent } from '../src/processor';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../src/utils/url.js';

/**
 * Script to process cached markdown content for images and audio
 * Usage: bun process-url.ts <url_or_file>
 */
async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Please provide a URL or file path to process');
    process.exit(1);
  }

  try {
    let markdownPath: string;
    let baseUrl: string;

    // Check if input is a local file path
    if (fs.existsSync(input)) {
      markdownPath = input;
      // For local files, use a dummy base URL that matches the file structure
      baseUrl = 'https://' + path.dirname(input).replace(/^tmp\//, '');
    } else {
      // Treat input as URL
      markdownPath = urlToFilePath(input).replace(/\.html$/, '.md');
      baseUrl = input.replace(/\.html$/, '');
    }
    
    if (!fs.existsSync(markdownPath)) {
      console.error(`No markdown file found at: ${markdownPath}`);
      console.error('\nPlease make sure to:');
      console.error('1. Run the converter first: bun run convert ' + input);
      console.error('2. Check if the path/URL is correct');
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
    const { content: processedMarkdown, costSummary } = await processMarkdownContent(markdown, baseUrl, outputDir, markdownPath);

    // Save processed markdown
    const processedPath = path.join(outputDir, path.basename(markdownPath));
    await fs.promises.writeFile(processedPath, processedMarkdown);

    console.log('\nContent processed successfully!');
    console.log(`Processed markdown saved to: ${processedPath}`);
    
    // Display cost summary
    console.log(costSummary);
  } catch (error: any) {
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
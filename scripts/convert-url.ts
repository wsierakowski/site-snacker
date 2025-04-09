#!/usr/bin/env bun

import { htmlToMarkdown, generateMetadata } from '../src/converter/index.js';
import { fetchHtml } from '../src/fetcher/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../src/utils/url.js';

/**
 * Simple script to convert a URL's HTML content to Markdown
 */
async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL to convert');
    process.exit(1);
  }

  try {
    // Check if HTML is already cached
    const htmlFilePath = urlToFilePath(url);
    let html: string;
    
    if (fs.existsSync(htmlFilePath)) {
      console.log(`Using cached HTML from ${htmlFilePath}`);
      html = fs.readFileSync(htmlFilePath, 'utf-8');
    } else {
      console.log(`HTML not found in cache. Fetching from ${url}...`);
      html = await fetchHtml(url);
    }
    
    // Convert HTML to Markdown
    console.log('Converting HTML to Markdown...');
    const markdown = await htmlToMarkdown(html);
    
    // Save Markdown to tmp directory
    console.log('Saving Markdown to tmp directory...');
    const markdownPath = urlToFilePath(url).replace(/\.html$/, '.md');
    await fs.promises.mkdir(path.dirname(markdownPath), { recursive: true });
    await fs.promises.writeFile(markdownPath, markdown);
    console.log(`Markdown saved to: ${markdownPath}`);
    
    // Generate metadata
    console.log('Generating metadata...');
    const metadataPath = generateMetadata(markdown, url);
    console.log(`Metadata saved to: ${metadataPath}`);
    
    console.log('Conversion completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 
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
  const input = process.argv[2];
  if (!input) {
    console.error('Please provide a URL or local HTML file to convert');
    process.exit(1);
  }

  try {
    let html: string;
    let sourceLabel = input;
    let htmlFilePath: string;

    // Check if input is a local HTML file
    if (fs.existsSync(input) && (input.endsWith('.html') || input.endsWith('.htm'))) {
      console.log(`Reading local HTML file: ${input}`);
      html = fs.readFileSync(input, 'utf-8');
      htmlFilePath = input;
      sourceLabel = `file://${path.resolve(input)}`;
    } else {
      // Treat as URL (original logic)
      htmlFilePath = urlToFilePath(input);
      if (fs.existsSync(htmlFilePath)) {
        console.log(`Using cached HTML from ${htmlFilePath}`);
        html = fs.readFileSync(htmlFilePath, 'utf-8');
      } else {
        console.log(`HTML not found in cache. Fetching from ${input}...`);
        html = await fetchHtml(input);
      }
    }

    // Convert HTML to Markdown
    console.log('Converting HTML to Markdown...');
    const markdown = await htmlToMarkdown(html, sourceLabel);

    // Save Markdown to tmp directory (or next to local file)
    let markdownPath: string;
    if (fs.existsSync(input) && (input.endsWith('.html') || input.endsWith('.htm'))) {
      markdownPath = input.replace(/\.html?$/, '.md');
    } else {
      markdownPath = htmlFilePath.replace(/\.html$/, '.md');
    }
    await fs.promises.mkdir(path.dirname(markdownPath), { recursive: true });
    await fs.promises.writeFile(markdownPath, markdown);
    console.log(`Markdown saved to: ${markdownPath}`);

    // Generate metadata
    console.log('Generating metadata...');
    const metadataPath = generateMetadata(markdown, sourceLabel);
    console.log(`Metadata saved to: ${metadataPath}`);

    console.log('Conversion completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 
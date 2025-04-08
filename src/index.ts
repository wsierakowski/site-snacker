#!/usr/bin/env bun

import { htmlToMarkdown, saveMarkdown } from './converter/index.js';
import { fetchHtml } from './fetcher/index.js';
import { processMarkdownContent } from './processor/index.js';

async function main() {
  console.log('Site Snacker - Converting websites to Markdown');
  
  // Get URL from command line arguments or use default
  const url = process.argv[2] || 'https://doc.sitecore.com/search/en/users/search-user-guide/attributes.html';
  console.log('Processing URL:', url);
  
  try {
    // Fetch the webpage content
    console.log('Fetching HTML content...');
    const html = await fetchHtml(url);
    
    // Convert HTML to Markdown
    console.log('Converting HTML to Markdown...');
    const markdown = await htmlToMarkdown(html);
    
    // Process the Markdown content (images, audio)
    console.log('Processing Markdown content...');
    const processedMarkdown = await processMarkdownContent(markdown, url);
    
    // Save the processed Markdown content
    console.log('Saving Markdown...');
    saveMarkdown(processedMarkdown, url);
    
    console.log('Conversion completed successfully!');
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

main(); 
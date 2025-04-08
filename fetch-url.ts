#!/usr/bin/env bun

import { fetchHtml } from './src/fetcher/index.js';

/**
 * Simple script to fetch a URL directly using the fetcher module
 */
async function fetchUrl() {
  try {
    // Get URL from command line arguments
    const url = process.argv[2];
    
    if (!url) {
      console.error('Error: URL is required');
      console.log('Usage: bun fetch-url.ts <url>');
      process.exit(1);
    }
    
    console.log(`Fetching URL: ${url}`);
    
    // Fetch the HTML content
    const html = await fetchHtml(url);
    console.log(`Downloaded HTML length: ${html.length} characters`);
    
    // Display the first 500 characters of the HTML
    console.log('\nFirst 500 characters of the HTML:');
    console.log(html.substring(0, 500) + '...');
    
    console.log('\nFetch completed successfully!');
  } catch (error) {
    console.error('Error fetching URL:', error);
    process.exit(1);
  }
}

// Run the script
fetchUrl(); 
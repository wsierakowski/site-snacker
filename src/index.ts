#!/usr/bin/env bun

import { fetchHtml } from './fetcher/index.js';

// Hardcoded URL for testing
const TEST_URL = 'https://doc.sitecore.com/search/en/users/search-user-guide/attributes.html';

async function main() {
  try {
    console.log('Site Snacker - Converting websites to Markdown');
    console.log(`Testing with URL: ${TEST_URL}`);
    
    // Fetch the HTML content
    const html = await fetchHtml(TEST_URL);
    
    // Log the first 500 characters of the HTML to verify it worked
    console.log('HTML content preview:');
    console.log(html.substring(0, 500) + '...');
    
    // TODO: Implement HTML to Markdown conversion
    console.log('HTML fetched successfully!');
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

main(); 
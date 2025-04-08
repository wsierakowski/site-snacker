import { fetchHtml } from '../src/fetcher/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../src/utils/url.js';

/**
 * Test script for the fetcher module with a custom URL
 */
async function testFetcherWithUrl() {
  try {
    console.log('Testing fetcher module with custom URL...');
    
    // Get URL from command line arguments or use default
    const testUrl = process.argv[2] || 'https://example.com';
    console.log(`Fetching URL: ${testUrl}`);
    
    // Fetch the HTML content
    const html = await fetchHtml(testUrl);
    console.log(`Downloaded HTML length: ${html.length} characters`);
    
    // Check if file was cached
    const filePath = urlToFilePath(testUrl);
    const fileExists = fs.existsSync(filePath);
    console.log(`File cached: ${fileExists ? 'Yes' : 'No'}`);
    console.log(`Cached file path: ${filePath}`);
    
    // Display the first 500 characters of the HTML
    console.log('\nFirst 500 characters of the HTML:');
    console.log(html.substring(0, 500) + '...');
    
    console.log('\nFetcher test completed successfully!');
  } catch (error) {
    console.error('Error testing fetcher:', error);
  }
}

// Run the test
testFetcherWithUrl(); 
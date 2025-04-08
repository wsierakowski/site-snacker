import { fetchHtml } from './src/fetcher/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from './src/utils/url.js';

/**
 * Simple script to fetch a webpage
 */
async function fetchPage() {
  try {
    // Get URL from command line arguments or use default
    const url = process.argv[2] || 'https://hahment.com/movies/genres/sci-fi/2001-a-space-odyssey.html';
    console.log(`Fetching URL: ${url}`);
    
    // Fetch the HTML content
    const html = await fetchHtml(url);
    console.log(`Downloaded HTML length: ${html.length} characters`);
    
    // Check if file was cached
    const filePath = urlToFilePath(url);
    const fileExists = fs.existsSync(filePath);
    console.log(`File cached: ${fileExists ? 'Yes' : 'No'}`);
    console.log(`Cached file path: ${filePath}`);
    
    // Display the first 500 characters of the HTML
    console.log('\nFirst 500 characters of the HTML:');
    console.log(html.substring(0, 500) + '...');
    
    console.log('\nFetch completed successfully!');
  } catch (error) {
    console.error('Error fetching page:', error);
  }
}

// Run the script
fetchPage(); 
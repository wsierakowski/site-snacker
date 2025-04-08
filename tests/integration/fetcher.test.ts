import { fetchHtml } from '../../src/fetcher/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../../src/utils/url.js';

/**
 * Integration test for the fetcher module
 */
async function testFetcher() {
  try {
    console.log('Testing fetcher module...');
    
    // Test URL
    const testUrl = 'https://example.com';
    
    // First run - should download and cache
    console.log('First run - should download and cache');
    const html1 = await fetchHtml(testUrl);
    console.log(`Downloaded HTML length: ${html1.length} characters`);
    
    // Check if file was cached
    const filePath = urlToFilePath(testUrl);
    const fileExists = fs.existsSync(filePath);
    console.log(`File cached: ${fileExists ? 'Yes' : 'No'}`);
    
    // Second run - should use cache
    console.log('\nSecond run - should use cache');
    const html2 = await fetchHtml(testUrl);
    console.log(`Cached HTML length: ${html2.length} characters`);
    
    // Verify content is the same
    const contentMatches = html1 === html2;
    console.log(`Content matches: ${contentMatches ? 'Yes' : 'No'}`);
    
    console.log('\nFetcher test completed successfully!');
  } catch (error) {
    console.error('Error testing fetcher:', error);
  }
}

// Run the test
testFetcher(); 
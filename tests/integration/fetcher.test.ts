import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { fetchHtml } from '../../src/fetcher/index.js';
import { getFetcherConfig, getDirectoryConfig } from '../../src/config/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../../src/utils/url.js';
import { cleanup } from '../setup.js';

/**
 * Integration test for the fetcher module
 */
async function testFetcher() {
  try {
    console.log('Testing fetcher module...');
    
    // Get configurations
    const fetcherConfig = getFetcherConfig();
    const dirConfig = getDirectoryConfig();
    
    // Test URL
    const testUrl = 'https://example.com';
    
    // First run - should download and cache
    console.log('First run - should download and cache');
    const html1 = await fetchHtml(testUrl);
    console.log(`Downloaded HTML length: ${html1.length} characters`);
    
    // Check if file was cached
    const filePath = urlToFilePath(testUrl, dirConfig.temp);
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
    throw error;
  }
}

describe('Fetcher Module', () => {
  // Setup before tests
  beforeAll(() => {
    const dirConfig = getDirectoryConfig();
    // Ensure temp directory exists
    if (!fs.existsSync(dirConfig.temp)) {
      fs.mkdirSync(dirConfig.temp, { recursive: true });
    }
  });

  // Cleanup after tests
  afterAll(() => {
    cleanup();
  });

  test('should fetch and cache HTML content', async () => {
    // Get configurations
    const fetcherConfig = getFetcherConfig();
    const dirConfig = getDirectoryConfig();
    
    // Test URL
    const testUrl = 'https://example.com';
    
    // First run - should download and cache
    console.log('First run - should download and cache');
    const html1 = await fetchHtml(testUrl);
    expect(html1).toBeDefined();
    expect(html1.length).toBeGreaterThan(0);
    
    // Check if file was cached
    const filePath = urlToFilePath(testUrl, dirConfig.temp);
    const fileExists = fs.existsSync(filePath);
    expect(fileExists).toBe(true);
    
    // Second run - should use cache
    console.log('\nSecond run - should use cache');
    const html2 = await fetchHtml(testUrl);
    expect(html2).toBeDefined();
    expect(html2.length).toBeGreaterThan(0);
    
    // Verify content is the same
    expect(html1).toBe(html2);
  });

  // Skip Cloudflare test for now as it takes too long
  test.skip('should handle Cloudflare protection', async () => {
    // Get configurations
    const fetcherConfig = getFetcherConfig();
    const dirConfig = getDirectoryConfig();
    
    // Test URL (using a known Cloudflare-protected site)
    const testUrl = 'https://doc.sitecore.com/search/en/users/search-user-guide/sitecore-search.html';
    
    // Should automatically handle Cloudflare
    const html = await fetchHtml(testUrl, true, { timeout: 5000 });
    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);
    
    // Check if file was cached
    const filePath = urlToFilePath(testUrl, dirConfig.temp);
    const fileExists = fs.existsSync(filePath);
    expect(fileExists).toBe(true);
  });
});

// Run the test
testFetcher()
  .then(() => cleanup())
  .catch(error => {
    console.error('Test failed with error:', error);
    cleanup();
    process.exit(1);
  }); 
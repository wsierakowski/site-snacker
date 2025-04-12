import { expect, test, describe, beforeAll, afterAll } from 'bun:test';
import { htmlToMarkdown, saveMarkdown, generateMetadata } from '../../src/converter/index.js';
import { fetchHtml } from '../../src/fetcher/index.js';
import { getDirectoryConfig } from '../../src/config/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../../src/utils/url.js';
import { cleanup } from '../setup.js';

describe('Converter Module', () => {
  // Setup before tests
  beforeAll(() => {
    const dirConfig = getDirectoryConfig();
    // Ensure test directories exist
    const testDirs = [
      path.join(dirConfig.base, 'output'),
      path.join(dirConfig.base, 'cache'),
      path.join(dirConfig.temp)
    ];
    
    for (const dir of testDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  });

  // Cleanup after tests
  afterAll(() => {
    cleanup();
  });

  test('should convert HTML to markdown and save it', async () => {
    // Test URL
    const testUrl = 'https://example.com';
    const dirConfig = getDirectoryConfig();
    
    // First run - should download HTML and convert to Markdown
    const html = await fetchHtml(testUrl);
    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);
    
    // Convert HTML to Markdown
    const markdown = await htmlToMarkdown(html, testUrl);
    expect(markdown).toBeDefined();
    expect(markdown.length).toBeGreaterThan(0);
    
    // Save Markdown to file
    const markdownPath = saveMarkdown(markdown, testUrl);
    
    // Generate metadata
    const metadataPath = generateMetadata(markdown, testUrl);
    
    // Check if files were created
    expect(fs.existsSync(markdownPath)).toBe(true);
    expect(fs.existsSync(metadataPath)).toBe(true);
    
    // Second run - should use cached HTML and convert to Markdown
    const cachedHtml = await fetchHtml(testUrl);
    
    // Convert cached HTML to Markdown
    const cachedMarkdown = await htmlToMarkdown(cachedHtml, testUrl);
    
    // Verify content is the same
    expect(markdown).toBe(cachedMarkdown);
  });
}); 
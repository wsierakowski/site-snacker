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
    
    // Verify that the markdown contains the expected tags
    expect(markdown).toContain('<md_html-source>');
    expect(markdown).toContain('<md_html-title>');
    expect(markdown).toContain('<md_last-modified>');
    
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
  
  test('should extract last modification date from HTML attributes', async () => {
    // Create HTML with data-timemodified attribute
    const htmlWithTimeModified = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <div data-timemodified="2023-06-15">Content with time modified</div>
          <h1>Test Page</h1>
          <p>This is a test page.</p>
        </body>
      </html>
    `;
    
    // Convert HTML to Markdown
    const markdown = await htmlToMarkdown(htmlWithTimeModified, 'https://example.com');
    
    // Verify that the markdown contains the last modification date
    expect(markdown).toContain('<md_last-modified>');
    expect(markdown).toContain('2023-06-15');
    
    // Create HTML with data-publicationdate attribute
    const htmlWithPublicationDate = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <div data-publicationdate="2023-07-20">Content with publication date</div>
          <h1>Test Page</h1>
          <p>This is a test page.</p>
        </body>
      </html>
    `;
    
    // Convert HTML to Markdown
    const markdownWithPublicationDate = await htmlToMarkdown(htmlWithPublicationDate, 'https://example.com');
    
    // Verify that the markdown contains the publication date
    expect(markdownWithPublicationDate).toContain('<md_last-modified>');
    expect(markdownWithPublicationDate).toContain('2023-07-20');
    
    // Create HTML without any date attributes
    const htmlWithoutDate = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <h1>Test Page</h1>
          <p>This is a test page.</p>
        </body>
      </html>
    `;
    
    // Convert HTML to Markdown
    const markdownWithoutDate = await htmlToMarkdown(htmlWithoutDate, 'https://example.com');
    
    // Verify that the markdown contains a last modification date (current date)
    expect(markdownWithoutDate).toContain('<md_last-modified>');
    
    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    expect(markdownWithoutDate).toContain(today);
  });
}); 
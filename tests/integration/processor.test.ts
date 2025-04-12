import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { processMarkdownContent } from '../../src/processor/index.js';
import { getProcessorConfig, getDirectoryConfig } from '../../src/config/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { cleanup } from '../setup.js';

/**
 * Integration test for the processor module
 * 
 * This test verifies that:
 * 1. The processor can process markdown content with images
 * 2. The caching system works correctly
 * 3. The output is saved correctly
 */
describe('Processor Module', () => {
  // Setup before tests
  beforeAll(() => {
    const dirConfig = getDirectoryConfig();
    // Ensure test directories exist
    const testDirs = [
      path.join(dirConfig.base, 'output'),
      path.join(dirConfig.base, 'cache')
    ];
    
    for (const dir of testDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    
    // Create test markdown file
    const testMarkdownDir = path.join(dirConfig.base, 'fixtures');
    if (!fs.existsSync(testMarkdownDir)) {
      fs.mkdirSync(testMarkdownDir, { recursive: true });
    }
    
    const testMarkdownPath = path.join(testMarkdownDir, 'test.md');
    const testMarkdown = `
# Test Page
This is a test page with an image.

![Test Image](https://example.com/image.jpg)

And another image:

<img src="https://example.com/image2.jpg" alt="Another test image" />
    `;
    
    fs.writeFileSync(testMarkdownPath, testMarkdown);
  });

  // Cleanup after tests
  afterAll(() => {
    cleanup();
  });

  test('should process markdown content with images and cache results', async () => {
    // Get configurations
    const processorConfig = getProcessorConfig();
    const dirConfig = getDirectoryConfig();
    
    // Test markdown file
    const testUrl = 'https://example.com/test';
    const testPath = path.join(dirConfig.base, 'fixtures', 'test.md');
    const outputDir = path.join(dirConfig.base, 'output');
    
    // Read test markdown file
    const markdown = fs.readFileSync(testPath, 'utf8');
    
    // First run - should process markdown and cache results
    const result1 = await processMarkdownContent(markdown, testUrl, outputDir, testPath);
    expect(result1.content).toBeDefined();
    expect(result1.content.length).toBeGreaterThan(0);
    
    // Save the processed content
    const outputPath = path.join(outputDir, 'processed-test.md');
    fs.writeFileSync(outputPath, result1.content);
    
    // Second run - should use cached results
    const result2 = await processMarkdownContent(markdown, testUrl, outputDir, testPath);
    expect(result2.content).toBeDefined();
    expect(result2.content.length).toBeGreaterThan(0);
    
    // Save the second run content
    const outputPath2 = path.join(outputDir, 'processed-test-2.md');
    fs.writeFileSync(outputPath2, result2.content);
    
    // Verify content is the same
    const firstRunContent = fs.readFileSync(outputPath, 'utf8');
    const secondRunContent = fs.readFileSync(outputPath2, 'utf8');
    expect(firstRunContent).toBe(secondRunContent);
  });
}); 
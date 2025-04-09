import { htmlToMarkdown, saveMarkdown, generateMetadata } from '../../src/converter/index.js';
import { fetchHtml } from '../../src/fetcher/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../../src/utils/url.js';

/**
 * Integration test for the converter module
 */
async function testConverter() {
  try {
    console.log('Testing converter module...');
    
    // Test URL
    const testUrl = 'https://example.com';
    
    // First run - should download HTML and convert to Markdown
    console.log('First run - should download HTML and convert to Markdown');
    const html = await fetchHtml(testUrl);
    console.log(`Downloaded HTML length: ${html.length} characters`);
    
    // Convert HTML to Markdown
    console.log('Converting HTML to Markdown...');
    const markdown = await htmlToMarkdown(html);
    console.log(`Generated Markdown length: ${markdown.length} characters`);
    
    // Save Markdown to file
    console.log('Saving Markdown to file...');
    const markdownPath = saveMarkdown(markdown, testUrl);
    console.log(`Markdown saved to: ${markdownPath}`);
    
    // Generate metadata
    console.log('Generating metadata...');
    const metadataPath = generateMetadata(markdown, testUrl);
    console.log(`Metadata saved to: ${metadataPath}`);
    
    // Check if files were created
    const markdownExists = fs.existsSync(markdownPath);
    const metadataExists = fs.existsSync(metadataPath);
    console.log(`Markdown file exists: ${markdownExists ? 'Yes' : 'No'}`);
    console.log(`Metadata file exists: ${metadataExists ? 'Yes' : 'No'}`);
    
    // Second run - should use cached HTML and convert to Markdown
    console.log('\nSecond run - should use cached HTML and convert to Markdown');
    const cachedHtml = await fetchHtml(testUrl);
    console.log(`Cached HTML length: ${cachedHtml.length} characters`);
    
    // Convert cached HTML to Markdown
    console.log('Converting cached HTML to Markdown...');
    const cachedMarkdown = await htmlToMarkdown(cachedHtml);
    console.log(`Generated Markdown length: ${cachedMarkdown.length} characters`);
    
    // Verify content is the same
    const contentMatches = markdown === cachedMarkdown;
    console.log(`Content matches: ${contentMatches ? 'Yes' : 'No'}`);
    
    console.log('\nConverter test completed successfully!');
  } catch (error) {
    console.error('Error testing converter:', error);
  }
}

// Run the test
testConverter(); 
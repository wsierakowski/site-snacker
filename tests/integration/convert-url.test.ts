import { expect, test, describe, beforeAll } from 'bun:test';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../../src/utils/url.js';
import { getDirectoryConfig } from '../../src/config/index.js';

describe('convert-url.ts script integration test', () => {
  const testUrl = 'https://example.com';
  const dirConfig = getDirectoryConfig();
  const tempDir = dirConfig.temp;
  const htmlFilePath = path.join(tempDir, 'example.com', 'index', 'index');
  const markdownFilePath = path.join(tempDir, 'example.com', 'index', 'index');
  const metadataFilePath = path.join(tempDir, 'example.com', 'index', 'page.metadata.txt');

  // Setup before tests
  beforeAll(() => {
    // Ensure directories exist
    const dirs = [
      tempDir,
      path.dirname(htmlFilePath),
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  });

  test('should convert HTML to Markdown and save it to the tmp directory', async () => {
    // Ensure the HTML file exists
    if (!fs.existsSync(htmlFilePath)) {
      fs.writeFileSync(htmlFilePath, '<!DOCTYPE html><html><head><title>Example Domain</title></head><body><h1>Example Domain</h1><p>This domain is for use in illustrative examples in documents.</p><p><a href="https://www.iana.org/domains/example">More information...</a></p></body></html>');
    }

    // Clean up any existing files
    if (fs.existsSync(metadataFilePath)) {
      fs.unlinkSync(metadataFilePath);
    }

    // Run the convert-url.ts script
    const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
      let stdout = '';
      let stderr = '';

      const process = spawn('bun', ['run', 'scripts/convert-url.ts', testUrl]);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({ exitCode: code || 0, stdout, stderr });
      });
    });

    // Print details for debugging
    console.log('HTML file path:', htmlFilePath);
    console.log('Markdown file path:', markdownFilePath);
    console.log('Metadata file path:', metadataFilePath);
    console.log('HTML file exists:', fs.existsSync(htmlFilePath));
    console.log('Markdown file exists:', fs.existsSync(markdownFilePath));
    console.log('Metadata file exists:', fs.existsSync(metadataFilePath));
    console.log('Script output:', result.stdout);
    console.log('Script errors:', result.stderr);
    
    // Parse the output to find actual file paths
    const markdownSavedToMatch = result.stdout.match(/Markdown saved to: (.+)/);
    const metadataSavedToMatch = result.stdout.match(/Metadata saved to: (.+)/);
    
    const actualMarkdownPath = markdownSavedToMatch ? markdownSavedToMatch[1] : null;
    const actualMetadataPath = metadataSavedToMatch ? metadataSavedToMatch[1] : null;
    
    console.log('Actual markdown path:', actualMarkdownPath);
    console.log('Actual metadata path:', actualMetadataPath);

    // Check that the script executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Converting HTML to Markdown');

    // Check for the files using paths from output
    if (actualMarkdownPath) {
      expect(fs.existsSync(actualMarkdownPath)).toBe(true);
      // Check that the markdown file contains markdown content
      const markdownContent = fs.readFileSync(actualMarkdownPath, 'utf-8');
      expect(markdownContent).toContain('Example Domain');
      
      // Verify that the markdown contains the expected tags
      expect(markdownContent).toContain('<md_html-source>');
      expect(markdownContent).toContain('<md_html-title>');
      expect(markdownContent).toContain('<md_last-modified>');
    }
    
    if (actualMetadataPath) {
      expect(fs.existsSync(actualMetadataPath)).toBe(true);
    }
  });

  test('should handle errors gracefully when HTML file does not exist', async () => {
    // Use a different URL for this test with a random number to avoid cache hits
    const randomId = Math.floor(Math.random() * 1000000);
    const nonexistentUrl = `https://example.com/nonexistent/${randomId}`;
    const nonexistentHtmlFilePath = path.join(tempDir, urlToFilePath(nonexistentUrl, '', 'index'));

    // Remove the HTML file if it exists
    if (fs.existsSync(nonexistentHtmlFilePath)) {
      fs.unlinkSync(nonexistentHtmlFilePath);
    }

    // Run the convert-url.ts script
    const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
      let stdout = '';
      let stderr = '';

      const process = spawn('bun', ['run', 'scripts/convert-url.ts', nonexistentUrl]);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({ exitCode: code || 0, stdout, stderr });
      });
    });
    
    console.log('Nonexistent URL test output:', result.stdout);

    // The script should fetch the HTML content when the file doesn't exist
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Fetching from');
  });
}); 
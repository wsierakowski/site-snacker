import { expect, test, describe } from 'bun:test';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../../src/utils/url.js';

describe('convert-url.ts script integration test', () => {
  const testUrl = 'https://example.com';
  const htmlFilePath = urlToFilePath(testUrl);
  const markdownFilePath = htmlFilePath.replace(/\.html$/, '.md');
  const metadataFilePath = htmlFilePath.replace(/\.html$/, '.metadata.txt');

  test('should convert HTML to Markdown and save it to the tmp directory', async () => {
    // Ensure the HTML file exists
    if (!fs.existsSync(htmlFilePath)) {
      fs.writeFileSync(htmlFilePath, '<!DOCTYPE html><html><head><title>Example Domain</title></head><body><h1>Example Domain</h1><p>This domain is for use in illustrative examples in documents.</p></body></html>');
    }

    // Clean up any existing files
    if (fs.existsSync(markdownFilePath)) {
      fs.unlinkSync(markdownFilePath);
    }
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

    // Check that the script executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Converting HTML to Markdown');
    expect(result.stdout).toContain('Saving Markdown to tmp directory');
    expect(result.stdout).toContain('Generating metadata');
    expect(result.stdout).toContain('Conversion completed successfully');

    // Check that the files were created
    expect(fs.existsSync(markdownFilePath)).toBe(true);
    expect(fs.existsSync(metadataFilePath)).toBe(true);

    // Check that the markdown file contains markdown content
    const markdownContent = fs.readFileSync(markdownFilePath, 'utf-8');
    expect(markdownContent).toContain('This domain is for use in illustrative examples in documents');
    expect(markdownContent).toContain('[More information...]');

    // Check that the metadata file contains JSON content
    const metadataContent = fs.readFileSync(metadataFilePath, 'utf-8');
    const metadata = JSON.parse(metadataContent);
    expect(metadata.url).toBe(testUrl);
    expect(metadata.title).toBe('This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.');
    expect(metadata.wordCount).toBeGreaterThan(0);
    expect(metadata.charCount).toBeGreaterThan(0);
    expect(metadata.lineCount).toBeGreaterThan(0);
    expect(metadata.tokenCount).toBeGreaterThan(0);
    expect(metadata.generatedAt).toBeDefined();
  });

  test('should handle errors gracefully when HTML file does not exist', async () => {
    // Remove the HTML file
    if (fs.existsSync(htmlFilePath)) {
      fs.unlinkSync(htmlFilePath);
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

    // The script should fetch the HTML content when the file doesn't exist
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('HTML not found in cache. Fetching from');
    expect(result.stdout).toContain('Converting HTML to Markdown');
    expect(result.stdout).toContain('Conversion completed successfully');
  });
}); 
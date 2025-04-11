import { expect, test, describe } from 'bun:test';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../../src/utils/url.js';

describe('process-url.ts script integration test', () => {
  const testUrl = 'https://example.com';
  const markdownFilePath = urlToFilePath(testUrl).replace(/\.html$/, '.md');
  const outputFilePath = path.join('output', 'processed', path.basename(markdownFilePath));

  test('should process Markdown content and save it to the output directory', async () => {
    // Ensure the markdown file exists
    if (!fs.existsSync(markdownFilePath)) {
      // Create the directory if it doesn't exist
      const dirPath = path.dirname(markdownFilePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Create a simple markdown file with an image
      fs.writeFileSync(markdownFilePath, `# Example Domain\n\nThis is a test markdown file with an image:\n\n![Example Image](https://example.com/image.jpg)\n\nAnd some text.`);
    }

    // Clean up any existing output file
    if (fs.existsSync(outputFilePath)) {
      fs.unlinkSync(outputFilePath);
    }

    // Ensure the output directory exists
    const outputDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Run the process-url.ts script
    const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
      let stdout = '';
      let stderr = '';

      const process = spawn('bun', ['run', 'scripts/process-url.ts', testUrl]);

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
    expect(result.stdout).toContain('Found markdown file at:');
    expect(result.stdout).toContain('Processing markdown for images and audio');
    expect(result.stdout).toContain('Content processed successfully');
    expect(result.stdout).toContain('Processed markdown saved to:');

    // Check that the output file was created
    expect(fs.existsSync(outputFilePath)).toBe(true);

    // Check that the output file contains processed content
    const outputContent = fs.readFileSync(outputFilePath, 'utf-8');
    expect(outputContent).toContain('# Example Domain');
    expect(outputContent).toContain('This is a test markdown file with an image');

    // Run the script again to test caching
    const secondResult = await new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
      let stdout = '';
      let stderr = '';

      const process = spawn('bun', ['run', 'scripts/process-url.ts', testUrl]);

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

    // Check that the script used cached descriptions
    expect(secondResult.exitCode).toBe(0);
    expect(secondResult.stdout).toContain('Using cached description for:');
    expect(secondResult.stdout).not.toContain('Generating image description...');
  });

  test('should handle errors gracefully when markdown file does not exist', async () => {
    // Remove the markdown file
    if (fs.existsSync(markdownFilePath)) {
      fs.unlinkSync(markdownFilePath);
    }

    // Run the process-url.ts script
    const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
      let stdout = '';
      let stderr = '';

      const process = spawn('bun', ['run', 'scripts/process-url.ts', testUrl]);

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

    // The script should exit with code 1 when the markdown file doesn't exist
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('No markdown file found in cache for URL:');
    expect(result.stderr).toContain('Please make sure to:');
    expect(result.stderr).toContain('1. Run the converter first: bun run convert');
  });
}); 
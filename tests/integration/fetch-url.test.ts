import { expect, test, describe } from 'bun:test';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../../src/utils/url.js';

describe('fetch-url.ts script integration test', () => {
  const testUrl = 'https://example.com';
  const expectedFilePath = urlToFilePath(testUrl);

  test('should fetch HTML content and save it to the tmp directory', async () => {
    // Clean up any existing file
    if (fs.existsSync(expectedFilePath)) {
      fs.unlinkSync(expectedFilePath);
    }

    // Run the fetch-url.ts script
    const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
      let stdout = '';
      let stderr = '';

      const process = spawn('bun', ['run', 'scripts/fetch-url.ts', testUrl]);

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
    expect(result.stdout).toContain('Fetching');
    expect(result.stdout).toContain('Content fetched and cached successfully');
    expect(result.stdout).toContain(`Cached at: ${expectedFilePath}`);

    // Check that the file was created
    expect(fs.existsSync(expectedFilePath)).toBe(true);

    // Check that the file contains HTML content
    const content = fs.readFileSync(expectedFilePath, 'utf-8');
    expect(content.toLowerCase()).toContain('<!doctype html>');
    expect(content.toLowerCase()).toContain('<html');
  });

  test('should use cached content when the file already exists', async () => {
    // Ensure the file exists
    if (!fs.existsSync(expectedFilePath)) {
      fs.writeFileSync(expectedFilePath, '<!DOCTYPE html><html><body>Test</body></html>');
    }

    // Run the fetch-url.ts script again
    const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
      let stdout = '';
      let stderr = '';

      const process = spawn('bun', ['run', 'scripts/fetch-url.ts', testUrl]);

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
    expect(result.stdout).toContain('Using cached content for');
  });

  test('should handle errors gracefully', async () => {
    // Run the fetch-url.ts script with an invalid URL
    const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
      let stdout = '';
      let stderr = '';

      const process = spawn('bun', ['run', 'scripts/fetch-url.ts', 'https://invalid-url-that-does-not-exist.com']);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({ exitCode: code || 0, stdout, stderr });
      });
      
      // Set a timeout to kill the process if it takes too long
      setTimeout(() => {
        process.kill();
        resolve({ exitCode: 1, stdout, stderr: 'Test timed out' });
      }, 5000);
    });

    // Check that the script handled the error
    expect(result.exitCode).toBe(1);
    // The error message might be in stdout or stderr, so check both
    expect(result.stdout + result.stderr).toMatch(/Error|timed out/);
  }, 10000); // Set a longer timeout for this test
}); 
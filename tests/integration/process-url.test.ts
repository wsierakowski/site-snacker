import { expect, test, describe, beforeAll } from 'bun:test';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../../src/utils/url.js';
import { getDirectoryConfig } from '../../src/config/index.js';

describe('process-url.ts script integration test', () => {
  const testUrl = 'https://example.com';
  const dirConfig = getDirectoryConfig();
  const tempDir = dirConfig.temp;
  const markdownFilePath = path.join(tempDir, 'example.com', 'index', 'index.md');

  // Setup before tests
  beforeAll(() => {
    // Ensure directories exist
    const dirs = [
      tempDir,
      path.dirname(markdownFilePath),
      path.join(dirConfig.output.base, dirConfig.output.processed)
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    
    // Create test markdown file in the expected location
    if (!fs.existsSync(markdownFilePath)) {      
      // Create a simple markdown file with an image
      fs.writeFileSync(markdownFilePath, `# Example Domain\n\nThis is a test markdown file with an image:\n\n![Example Image](https://example.com/image.jpg)\n\nAnd some text.`);
    }
  });

  test('should process Markdown content and save it to the output directory', async () => {
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

    // Print details for debugging
    console.log('Markdown file path:', markdownFilePath);
    console.log('Markdown file exists:', fs.existsSync(markdownFilePath));
    console.log('Script output:', result.stdout);
    console.log('Script errors:', result.stderr);
    
    // Parse the actual output path from the script output
    const outputPathMatch = result.stdout.match(/Processed markdown saved to: (.+)/);
    const actualOutputPath = outputPathMatch ? outputPathMatch[1] : null;
    console.log('Actual output path:', actualOutputPath);

    // Check that the script executed successfully
    expect(result.exitCode).toBe(0);
    
    // Check that the output file was created
    if (actualOutputPath) {
      expect(fs.existsSync(actualOutputPath)).toBe(true);
      
      // Check that the output file contains processed content
      const outputContent = fs.readFileSync(actualOutputPath, 'utf-8');
      expect(outputContent).toContain('Example Domain');
    } else {
      // If we couldn't parse the output path, fail the test
      throw new Error('Could not parse output path from script output');
    }
  });

  test('should handle errors gracefully when markdown file does not exist', async () => {
    // Run the process-url.ts script with a completely different domain
    const nonExistentUrl = 'https://nonexistent-domain-that-doesnt-exist-12345.com';
    const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve) => {
      let stdout = '';
      let stderr = '';

      const process = spawn('bun', ['run', 'scripts/process-url.ts', nonExistentUrl]);

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
    console.log('Nonexistent URL test errors:', result.stderr);

    // The script should exit with error message when the markdown file doesn't exist
    expect(result.stderr).toContain('No markdown file found');
  });
}); 
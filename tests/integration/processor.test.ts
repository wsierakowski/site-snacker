import { processMarkdownContent } from '../../src/processor/index.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Integration test for the processor module
 * 
 * This test verifies that:
 * 1. The processor can process markdown content with images
 * 2. The caching system works correctly
 * 3. The output is saved correctly
 */
async function testProcessor() {
  console.log('Starting processor integration test...');
  
  // Path to the markdown file
  const markdownPath = 'output/doc.sitecore.com/search/en/users/search-user-guide/attributes.md';
  
  // Read the markdown file
  const markdown = fs.readFileSync(markdownPath, 'utf8');
  
  // Base URL for resolving relative URLs
  const baseUrl = 'https://doc.sitecore.com';
  
  // Create test directories
  const testOutputDir = 'tests/output';
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }
  
  // First run - should process images and create cache
  console.log('\nFirst run - processing images and creating cache...');
  const processedMarkdown = await processMarkdownContent(markdown, baseUrl, 'tmp');
  
  // Save the processed markdown to a test file
  const outputPath = path.join(testOutputDir, 'processed-attributes.md');
  fs.writeFileSync(outputPath, processedMarkdown);
  
  console.log(`Processed markdown saved to ${outputPath}`);
  
  // Check if cache files were created
  const cacheDir = path.join('tmp', 'cache');
  if (fs.existsSync(cacheDir)) {
    console.log('\nCache files created:');
    const cacheFiles = fs.readdirSync(cacheDir);
    console.log('\nCache directory contents:', cacheFiles);
    
    // Find the first .json file in the cache directory (recursively)
    function findFirstJsonFile(dir: string): string | null {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          const found = findFirstJsonFile(fullPath);
          if (found) return found;
        } else if (file.endsWith('.json')) {
          return fullPath;
        }
      }
      return null;
    }

    const firstJsonFile = findFirstJsonFile(cacheDir);
    if (firstJsonFile) {
      console.log('\nReading cache file:', firstJsonFile);
      const cacheContent = fs.readFileSync(firstJsonFile, 'utf8');
      console.log('Cache content:', cacheContent);
    } else {
      console.log('\nNo .json cache files found');
    }
  } else {
    console.log('\nNo cache files were created.');
  }
  
  // Second run - should use cache
  console.log('\nSecond run - should use cache...');
  const processedMarkdownSecondRun = await processMarkdownContent(markdown, baseUrl, 'tmp');
  
  // Save the processed markdown to a test file
  const outputPathSecondRun = path.join(testOutputDir, 'processed-attributes-second-run.md');
  fs.writeFileSync(outputPathSecondRun, processedMarkdownSecondRun);
  
  console.log(`Processed markdown from second run saved to ${outputPathSecondRun}`);
  
  // Compare the two outputs - they should be identical if caching worked
  const firstRunContent = fs.readFileSync(outputPath, 'utf8');
  const secondRunContent = fs.readFileSync(outputPathSecondRun, 'utf8');
  
  if (firstRunContent === secondRunContent) {
    console.log('\n✅ Test passed: Second run used cache successfully');
  } else {
    console.log('\n❌ Test failed: Second run did not use cache correctly');
    console.log('Differences between first and second run:');
    
    // Simple diff - just show the first few lines that differ
    const firstLines = firstRunContent.split('\n');
    const secondLines = secondRunContent.split('\n');
    
    for (let i = 0; i < Math.min(firstLines.length, secondLines.length); i++) {
      if (firstLines[i] !== secondLines[i]) {
        console.log(`Line ${i+1}:`);
        console.log(`  First run:  ${firstLines[i]}`);
        console.log(`  Second run: ${secondLines[i]}`);
      }
    }
  }
  
  console.log('\nProcessor integration test completed.');
}

// Run the test
testProcessor().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
}); 
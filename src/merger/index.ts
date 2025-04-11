import * as fs from 'fs';
import * as path from 'path';

interface FileToMerge {
  markdownPath: string;
  url: string;
}

/**
 * Merges multiple markdown files into a single file
 * @param files Array of objects containing markdown paths and their corresponding URLs
 * @param outputPath Path where the merged file should be saved
 * @param sitemapUrl Original sitemap URL for reference
 */
export async function mergeMarkdownFiles(
  files: FileToMerge[],
  outputPath: string,
  sitemapUrl: string
): Promise<string> {
  console.log('\n=== Merging Markdown Files ===');
  console.log(`Found ${files.length} files to merge`);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let mergedContent = `# Merged Documentation from Sitemap\n\n`;
  mergedContent += `Source: ${sitemapUrl}\n\n`;
  mergedContent += `Generated on: ${new Date().toISOString()}\n\n`;
  
  // Add list of included URLs
  mergedContent += `## Included Pages\n\n`;
  files.forEach((file, index) => {
    mergedContent += `${index + 1}. ${file.url}\n`;
  });
  mergedContent += `\n---\n\n`;

  // Process each markdown file
  for (const [index, file] of files.entries()) {
    console.log(`Processing file: ${file.markdownPath}`);
    
    // Read the content of the file
    const content = fs.readFileSync(file.markdownPath, 'utf-8');
    
    // Check if the file contains image descriptions
    const hasImageDescription = content.includes('<image_description>');
    if (hasImageDescription) {
      console.log(`  - Found image descriptions in ${path.basename(file.markdownPath)}`);
      
      // Count the number of image descriptions
      const imageDescriptionCount = (content.match(/<image_description>/g) || []).length;
      console.log(`  - Number of image descriptions: ${imageDescriptionCount}`);
    }
    
    // Add section header with original URL
    mergedContent += `## ${path.basename(file.markdownPath, '.md')}\n\n`;
    mergedContent += `URL: ${file.url}\n\n`;
    
    // IMPORTANT: Use the processed file instead of the markdown file
    // The processed file already contains the image descriptions
    const processedPath = path.join('output', 'processed', path.basename(path.dirname(file.markdownPath)), path.basename(file.markdownPath));
    
    if (fs.existsSync(processedPath)) {
      console.log(`  - Using processed file: ${processedPath}`);
      const processedContent = fs.readFileSync(processedPath, 'utf-8');
      mergedContent += processedContent;
    } else {
      console.log(`  - Processed file not found, using markdown file`);
      mergedContent += content;
    }
    
    // Add separator between files (except for the last one)
    if (index < files.length - 1) {
      mergedContent += '\n\n---\n\n';
    }
  }

  // Verify that image descriptions are preserved in the merged content
  const mergedImageDescriptionCount = (mergedContent.match(/<image_description>/g) || []).length;
  console.log(`\nTotal image descriptions in merged content: ${mergedImageDescriptionCount}`);

  // Save merged content
  fs.writeFileSync(outputPath, mergedContent);
  console.log(`Merged content saved to: ${outputPath}`);

  return outputPath;
} 
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import * as fs from 'fs';
import * as path from 'path';
import { urlToFilePath } from '../utils/url.js';

/**
 * Ensures a directory exists, creating it if necessary
 * @param dirPath The directory path to ensure
 * @throws Error if directory creation fails
 */
function ensureDirectoryExists(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (error: any) {
    throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
  }
}

/**
 * Converts HTML content to Markdown
 * @param html The HTML content to convert
 * @returns The Markdown content
 * @throws Error if parsing fails
 */
export async function htmlToMarkdown(html: string): Promise<string> {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    const reader = new Readability(document);
    const article = reader.parse();
    
    if (!article) {
      throw new Error('Failed to parse article');
    }
    
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });

    // Add custom rules for table handling
    turndownService.addRule('table', {
      filter: 'table',
      replacement: function(content, node) {
        const table = node as HTMLTableElement;
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length === 0) return '';

        // Process header row
        const headers = Array.from(rows[0].querySelectorAll('th, td'))
          .map(cell => cell.textContent?.trim() || '')
          .map(text => text.replace(/\|/g, '\\|')); // Escape pipe characters

        // Create header separator
        const separator = headers.map(() => '---').join(' | ');

        // Process data rows
        const dataRows = rows.slice(1).map(row => {
          return Array.from(row.querySelectorAll('td'))
            .map(cell => {
              // Get the cell content
              let content = cell.textContent?.trim() || '';
              
              // Check if there's an example in the cell
              const exampleMatch = content.match(/Example:\s*(.+)$/);
              if (exampleMatch) {
                // Split the content into description and example
                const description = content.substring(0, content.indexOf('Example:')).trim();
                const example = exampleMatch[1].trim();
                
                // Format with a space between description and example
                content = `${description} (Example: ${example})`;
              }
              
              // Escape pipe characters
              return content.replace(/\|/g, '\\|');
            })
            .join(' | ');
        });

        // Combine all parts
        const markdownTable = [
          `| ${headers.join(' | ')} |`,
          `| ${separator} |`,
          ...dataRows.map(row => `| ${row} |`)
        ].join('\n');

        return '\n\n' + markdownTable + '\n\n';
      }
    });

    // Add rule for table cells to prevent double processing
    turndownService.addRule('tableCell', {
      filter: ['th', 'td'],
      replacement: function(content) {
        return content;
      }
    });
    
    return turndownService.turndown(article.content);
  } catch (error: any) {
    throw new Error(`Failed to convert HTML to Markdown: ${error.message}`);
  }
}

/**
 * Saves Markdown content to a file
 * @param markdown The Markdown content
 * @param url The URL of the original HTML content
 * @param outputDir The directory to save the Markdown file (default: 'tmp')
 * @returns The path to the saved Markdown file
 * @throws Error if file operations fail
 */
export function saveMarkdown(markdown: string, url: string, outputDir: string = 'tmp'): string {
  try {
    // Convert URL to file path, but change the extension to .md
    const filePath = urlToFilePath(url, outputDir).replace(/\.html$/, '.md');
    const dirPath = path.dirname(filePath);

    // Create directory if it doesn't exist
    ensureDirectoryExists(dirPath);

    // Save the Markdown content
    fs.writeFileSync(filePath, markdown);
    console.log(`Saved Markdown to ${filePath}`);

    return filePath;
  } catch (error: any) {
    throw new Error(`Failed to save Markdown: ${error.message}`);
  }
}

/**
 * Generates metadata for the Markdown content
 * @param markdown The Markdown content
 * @param url The URL of the original HTML content
 * @param outputDir The directory to save the metadata file (default: 'tmp')
 * @returns The path to the saved metadata file
 * @throws Error if file operations fail
 */
export function generateMetadata(markdown: string, url: string, outputDir: string = 'tmp'): string {
  try {
    // Count words (split by whitespace and filter out empty strings)
    const wordCount = markdown.split(/\s+/).filter(word => word.length > 0).length;
    const charCount = markdown.length;
    const lineCount = markdown.split('\n').length;
    
    // Estimate token count (rough approximation)
    const tokenCount = Math.ceil(charCount / 4);

    // Create metadata content
    const metadata = {
      url,
      title: markdown.split('\n')[0].replace(/^#\s+/, ''),
      wordCount,
      charCount,
      lineCount,
      tokenCount,
      generatedAt: new Date().toISOString(),
    };

    // Convert URL to file path, but change the extension to .metadata.txt
    const filePath = urlToFilePath(url, outputDir).replace(/\.html$/, '.metadata.txt');
    const dirPath = path.dirname(filePath);

    // Create directory if it doesn't exist
    ensureDirectoryExists(dirPath);

    // Save the metadata content
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
    console.log(`Saved metadata to ${filePath}`);

    return filePath;
  } catch (error: any) {
    throw new Error(`Failed to generate metadata: ${error.message}`);
  }
} 
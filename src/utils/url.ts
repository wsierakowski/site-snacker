import * as path from 'path';

/**
 * Converts a URL to a file path, preserving the domain and path structure
 * @param url The URL to convert
 * @param baseDir The base directory for the file path (default: 'tmp')
 * @returns A file path based on the URL
 */
export function urlToFilePath(url: string, baseDir: string = 'tmp'): string {
  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    
    // Get the pathname and remove leading/trailing slashes
    let urlPath = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');
    
    // If the path is empty, use 'index.html'
    if (!urlPath) {
      urlPath = 'index.html';
    }
    
    // Combine into a file path
    return path.join(baseDir, domain, urlPath);
  } catch (error) {
    console.error(`Error converting URL to file path: ${error}`);
    throw error;
  }
}

/**
 * Sanitizes a file path to ensure it's valid for the filesystem
 * @param filePath The file path to sanitize
 * @returns A sanitized file path
 */
export function sanitizeFilePath(filePath: string): string {
  // Replace invalid characters with underscores
  // This includes characters that are invalid in file paths on most operating systems
  return filePath.replace(/[<>:"|?*\\]/g, '_');
}

/**
 * Extracts the domain from a URL
 * @param url The URL to extract the domain from
 * @returns The domain of the URL
 */
export function extractDomain(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (error) {
    console.error(`Error extracting domain from URL: ${error}`);
    throw error;
  }
}

/**
 * Extracts the path from a URL
 * @param url The URL to extract the path from
 * @returns The path of the URL
 */
export function extractPath(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname;
  } catch (error) {
    console.error(`Error extracting path from URL: ${error}`);
    throw error;
  }
}

/**
 * Creates a directory path for a URL
 * @param url The URL to create a directory path for
 * @param baseDir The base directory for the directory path (default: 'tmp')
 * @returns A directory path based on the URL
 */
export function urlToDirPath(url: string, baseDir: string = 'tmp'): string {
  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    
    // Get the pathname and remove leading/trailing slashes
    let urlPath = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');
    
    // If the path is empty, use an empty string
    if (!urlPath) {
      urlPath = '';
    }
    
    // Combine into a directory path
    return path.join(baseDir, domain, urlPath);
  } catch (error) {
    console.error(`Error converting URL to directory path: ${error}`);
    throw error;
  }
} 
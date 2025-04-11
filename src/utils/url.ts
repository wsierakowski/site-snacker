import * as path from 'path';

/**
 * Converts a URL to a file path, preserving the domain and path structure
 * @param url The URL to convert
 * @param baseDir The base directory for the file path (default: 'tmp')
 * @param filename The name to use for the file (if not using original filename)
 * @returns A file path based on the URL
 */
export function urlToFilePath(url: string, baseDir: string = 'tmp', filename?: string): string {
  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    
    // Get the pathname and remove leading/trailing slashes
    let urlPath = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');
    
    // If the path is empty, use 'index'
    if (!urlPath) {
      urlPath = 'index';
    }
    
    // Get the original filename without extension
    const originalFilename = path.basename(urlPath, path.extname(urlPath));
    
    // Create directory path including the page name as a directory
    const dirPath = path.join(baseDir, domain, path.dirname(urlPath), originalFilename);
    
    // Use either the provided filename or the original filename with its extension
    const finalFilename = filename || path.basename(urlPath);
    
    // Return full file path with the specified filename
    return path.join(dirPath, finalFilename);
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
 * Gets the directory path for a URL's assets
 * @param url The URL to convert
 * @param baseDir The base directory (default: 'tmp')
 * @returns The directory path for the URL's assets
 */
export function urlToDirPath(url: string, baseDir: string = 'tmp'): string {
  // Remove any filename from the path
  const filePath = urlToFilePath(url, baseDir);
  return path.dirname(filePath);
} 
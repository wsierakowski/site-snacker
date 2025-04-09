import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { URL } from 'url';

/**
 * Ensures a directory exists, creating it if necessary
 * @param dirPath The directory path to ensure
 * @throws Error if directory creation fails
 */
export function ensureDirectoryExists(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (error: any) {
    throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
  }
}

/**
 * Downloads a file from a URL and saves it to a local path
 * @param url The URL to download from
 * @param outputPath The path to save the file to
 * @param baseUrl The base URL for resolving relative URLs
 * @returns The path to the saved file
 * @throws Error if download or save fails
 */
export async function downloadFile(url: string, outputPath: string, baseUrl: string): Promise<string> {
  try {
    // Resolve relative URLs
    const absoluteUrl = new URL(url, baseUrl).toString();
    console.log(`Downloading file from: ${absoluteUrl}`);
    
    let fileBuffer: Buffer;
    
    if (absoluteUrl.startsWith('file://')) {
      // For local files, read directly from the filesystem
      const localPath = absoluteUrl.replace('file://', '');
      fileBuffer = fs.readFileSync(localPath);
    } else {
      // For remote files, download using axios
      const response = await axios.get(absoluteUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Referer': baseUrl,
        }
      });
      fileBuffer = Buffer.from(response.data);
    }
    
    // Ensure the directory exists
    ensureDirectoryExists(path.dirname(outputPath));
    
    // Save the file
    fs.writeFileSync(outputPath, fileBuffer);
    console.log(`Saved file to: ${outputPath}`);
    
    return outputPath;
  } catch (error: any) {
    throw new Error(`Failed to download file from ${url}: ${error.message}`);
  }
}

/**
 * Checks if a file is an audio file based on its extension
 * @param url The URL of the file
 * @returns True if the file is likely an audio file
 */
export function isAudioFile(url: string): boolean {
  return /\.(mp3|wav|ogg|m4a|aac)$/i.test(url);
}

/**
 * Checks if a file is an image file based on its extension
 * @param url The URL of the file
 * @returns True if the file is likely an image file
 */
export function isImageFile(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(url);
} 
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import OpenAI from 'openai';
import { urlToFilePath, urlToDirPath } from '../utils/url.js';
import { downloadFile } from '../utils/download.js';
import * as yaml from 'js-yaml';
import { ProcessorConfig } from './types.js';
import sharp from 'sharp';
import { ChatCompletionMessageParam, ChatCompletionContentPart, ChatCompletionContentPartText, ChatCompletionContentPartImage } from 'openai/resources/chat/completions';
import { ChatCompletion } from 'openai/resources';
import { openai as globalOpenai, config as globalConfig } from './index.js';
import { URL } from 'url';

// Load configuration
const config = yaml.load(fs.readFileSync(path.join(__dirname, 'processor.conf.yml'), 'utf8')) as ProcessorConfig;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

interface ImageCache {
  description: string;
  timestamp: number;
  model: string;
}

interface ImageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

/**
 * Generate a cache key for an image URL
 * @param imageUrl The URL of the image
 * @returns A file path based on the URL
 */
function generateCacheKey(imageUrl: string): string {
  return urlToFilePath(imageUrl, 'cache');
}

/**
 * Get cached image description if available
 * @param cacheKey The cache key for the image
 * @param cacheDir The directory containing cache files
 * @returns The cached description or null if not found
 */
function getCachedDescription(cacheKey: string, cacheDir: string): ImageCache | null {
  const cachePath = path.join(cacheDir, cacheKey);
  if (fs.existsSync(cachePath)) {
    try {
      const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as ImageCache;
      return cache;
    } catch (error) {
      console.warn(`Error reading cache for ${cacheKey}:`, error);
      return null;
    }
  }
  return null;
}

/**
 * Save image description to cache
 * @param cacheKey The cache key for the image
 * @param cacheDir The directory containing cache files
 * @param description The image description
 * @param model The model used to generate the description
 */
function saveToCache(cacheKey: string, cacheDir: string, description: string, model: string): void {
  const cachePath = path.join(cacheDir, cacheKey);
  
  // Ensure the directory exists
  const cacheDirPath = path.dirname(cachePath);
  if (!fs.existsSync(cacheDirPath)) {
    fs.mkdirSync(cacheDirPath, { recursive: true });
  }
  
  const cache: ImageCache = {
    description,
    timestamp: Date.now(),
    model,
  };
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

/**
 * Process images in markdown content
 * @param markdown The markdown content to process
 * @param baseUrl The base URL of the original HTML content
 * @param outputDir The directory to save processed content
 * @returns The processed markdown content with image descriptions
 */
export async function processImages(
  markdown: string,
  baseUrl: string,
  outputDir: string
): Promise<string> {
  // Regular expression to find image markdown syntax: ![alt text](url)
  const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
  
  // Use the existing tmp directory structure
  const tmpDir = urlToDirPath(baseUrl);
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  // Create images subdirectory
  const imagesDir = path.join(tmpDir, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  // Process each image
  let processedMarkdown = markdown;
  let match;
  
  while ((match = imageRegex.exec(markdown)) !== null) {
    const [fullMatch, altText, imageUrl] = match;
    
    try {
      let imageBuffer: Buffer;
      let contentType: string | undefined;
      let originalUrl: string | undefined;
      
      if (imageUrl.startsWith('file://')) {
        // For local files, read directly from the filesystem
        const localPath = imageUrl.replace('file://', '');
        imageBuffer = fs.readFileSync(localPath);
      } else {
        // For remote files, download using the utility
        console.log('Downloading image...');
        const result = await downloadFile(imageUrl, baseUrl, {
          headers: {
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Sec-Fetch-Dest': 'image',
          }
        });
        imageBuffer = result.buffer;
        contentType = result.contentType;
        originalUrl = result.originalUrl;
      }
      
      // Extract file name and extension from the URL
      let imageFileName: string;
      
      if (originalUrl) {
        // If we have an original URL (from Next.js image URL), use that for the filename
        const originalUrlObj = new URL(originalUrl);
        imageFileName = path.basename(originalUrlObj.pathname);
      } else {
        // For direct URLs, use the basename
        const urlObj = new URL(imageUrl, baseUrl);
        imageFileName = path.basename(urlObj.pathname.split('?')[0]);
      }
      
      // If no extension, try to get it from content type or default to .png
      if (!path.extname(imageFileName)) {
        const ext = contentType ? `.${contentType.split('/')[1]}` : '.png';
        imageFileName += ext;
      }
      
      // Save the image to the images directory
      const imagePath = path.join(imagesDir, imageFileName);
      fs.writeFileSync(imagePath, imageBuffer);
      console.log('Image saved to:', imagePath);
      
      // Temporarily skip OpenAI processing
      // const description = await generateImageDescription(imagePath, altText);
      // const imageWithDescription = `${fullMatch}\n\n<image_description>${description}</image_description>\n\n`;
      // processedMarkdown = processedMarkdown.replace(fullMatch, imageWithDescription);
      
      console.log('Image processing completed successfully\n');
    } catch (error: any) {
      console.error('Error processing image:', error.message);
      // Add a note in the markdown about the failed processing
      const errorNote = `\n\n> ⚠️ Failed to process image: ${error.message}\n\n`;
      processedMarkdown = processedMarkdown.replace(fullMatch, `${fullMatch}${errorNote}`);
    }
  }
  
  return processedMarkdown;
}

/**
 * Generate a description for an image using OpenAI's multimodal model
 * @param imagePath Path to the image file
 * @param altText Alt text from the image markdown
 * @returns A description of the image
 */
async function generateImageDescription(imagePath: string, altText: string): Promise<string> {
  try {
    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Call OpenAI's API to analyze the image
    const response = await globalOpenai.chat.completions.create({
      model: globalConfig.image.model,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: globalConfig.image.prompt.replace('{altText}', altText) },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64Image}`,
              detail: "low"
            }
          }
        ]
      }],
      max_tokens: globalConfig.image.max_tokens
    });
    
    return response.choices[0].message.content || "No description available.";
  } catch (error) {
    console.error("Error generating image description:", error);
    return `[Error generating description for image: ${altText}]`;
  }
} 
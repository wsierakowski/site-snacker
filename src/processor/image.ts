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
import { openai as globalOpenai, config as globalConfig, costTracker } from './index.js';
import { URL } from 'url';

// Load configuration
const config = yaml.load(fs.readFileSync(path.join(__dirname, 'processor.conf.yml'), 'utf8')) as ProcessorConfig;

// Initialize OpenAI client
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
  // For Next.js image URLs, extract the original image URL from the query parameter
  if (imageUrl.includes('/_next/image?url=')) {
    try {
      const params = new URL(imageUrl).searchParams;
      const originalUrl = params.get('url');
      if (originalUrl) {
        // Decode the URL-encoded original URL
        const decodedUrl = decodeURIComponent(originalUrl);
        const urlObj = new URL(decodedUrl);
        const pathParts = urlObj.pathname.split('/');
        // Look for UUID pattern in the path
        const uuidPart = pathParts.find(part => part.includes('uuid-'));
        if (uuidPart) {
          return `${uuidPart}.json`;
        }
      }
    } catch (error) {
      console.error('Error parsing Next.js image URL:', error);
    }
  }
  
  // For regular URLs, extract UUID or use basename
  try {
    const urlObj = new URL(imageUrl);
    const pathParts = urlObj.pathname.split('/');
    // Look for UUID pattern in the path
    const uuidPart = pathParts.find(part => part.includes('uuid-'));
    if (uuidPart) {
      return `${uuidPart}.json`;
    }
  } catch (error) {
    console.error('Error parsing URL:', error);
  }
  
  // Fallback to using the basename if no UUID found
  return `${path.basename(imageUrl.split('?')[0])}.json`;
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
 * Save image description to a markdown file
 * @param descriptionPath Path to save the description file
 * @param description Generated description
 * @param altText Original alt text
 */
function saveDescriptionToFile(descriptionPath: string, description: string, altText: string): void {
  const content = `# Image Description\n\n## Original Alt Text\n${altText}\n\n## Generated Description\n${description}\n`;
  fs.writeFileSync(descriptionPath, content);
  console.log('Description saved to:', descriptionPath);
}

/**
 * Process images in markdown content
 * @param markdown The markdown content to process
 * @param baseUrl The base URL of the original HTML content
 * @param outputDir The directory to save processed content
 * @param markdownPath Optional parameter for the markdown file path
 * @returns The processed markdown content with image descriptions
 */
export async function processImages(
  markdown: string,
  baseUrl: string,
  outputDir: string,
  markdownPath?: string
): Promise<string> {
  // Regular expression to find image markdown syntax: ![alt text](url)
  const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
  let imageCount = 0;
  
  // Get the markdown file directory to use as the base for images and cache
  const markdownDir = markdownPath 
    ? path.dirname(markdownPath)
    : urlToDirPath(baseUrl);
  
  // Get the markdown file name without extension to use as subdirectory
  const markdownName = markdownPath 
    ? path.basename(markdownPath).replace(/\.[^.]+$/, '')
    : 'default';
  
  // Create page directory if it doesn't exist
  const pageDir = path.join(markdownDir, markdownName);
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
  }
  
  console.log('\nStarting image processing...');
  console.log('Base URL:', baseUrl);
  console.log('Markdown directory:', markdownDir);
  console.log('Page directory:', pageDir);
  
  // Process each image
  let processedMarkdown = markdown;
  let match;
  
  while ((match = imageRegex.exec(markdown)) !== null) {
    imageCount++;
    const [fullMatch, altText, imageUrl] = match;
    console.log(`\nProcessing image ${imageCount}:`);
    console.log('Alt text:', altText);
    console.log('Image URL:', imageUrl);
    
    try {
      // Resolve relative URLs against the base URL
      const resolvedImageUrl = imageUrl.startsWith('/') || imageUrl.startsWith('./') || imageUrl.startsWith('../') 
        ? new URL(imageUrl, baseUrl).toString() 
        : imageUrl;
      console.log('Resolved URL:', resolvedImageUrl);
      
      // Check cache first
      const cacheKey = generateCacheKey(resolvedImageUrl);
      console.log('Cache key:', cacheKey);
      const cachedData = getCachedDescription(cacheKey, pageDir);
      
      if (cachedData && cachedData.model === config.image.model) {
        console.log('Using cached description from:', path.join(pageDir, cacheKey));
        const imageWithDescription = `${fullMatch}\n\n<${config.image.markdown.description_tag}>${cachedData.description}</${config.image.markdown.description_tag}>\n\n`;
        processedMarkdown = processedMarkdown.replace(fullMatch, imageWithDescription);
        continue;
      }

      let imageBuffer: Buffer;
      let contentType: string | undefined;
      let originalUrl: string | undefined;
      
      if (resolvedImageUrl.startsWith('file://')) {
        // For local files, read directly from the filesystem
        const localPath = resolvedImageUrl.replace('file://', '');
        imageBuffer = fs.readFileSync(localPath);
        contentType = 'image/png'; // Default for local files
      } else {
        // For remote files, download using the utility
        console.log('Downloading image from:', resolvedImageUrl);
        const result = await downloadFile(resolvedImageUrl, baseUrl, {
          headers: {
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Sec-Fetch-Dest': 'image',
          }
        });
        imageBuffer = result.buffer;
        contentType = result.contentType;
        originalUrl = result.originalUrl;
        console.log('Download successful. Content type:', contentType);
        if (originalUrl) console.log('Original URL:', originalUrl);
      }
      
      // Extract UUID from the URL
      let imageFileName: string;
      
      if (originalUrl) {
        // Extract UUID from the original URL
        const uuidMatch = originalUrl.match(/uuid-[a-f0-9-]+/i);
        if (uuidMatch) {
          imageFileName = uuidMatch[0] + '.png';
          console.log('Using UUID from original URL:', imageFileName);
        } else {
          // If no UUID found, use a timestamp-based unique name
          imageFileName = `image-${Date.now()}.png`;
          console.log('No UUID found in original URL, using timestamp:', imageFileName);
        }
      } else {
        // For direct URLs, try to extract UUID
        const uuidMatch = resolvedImageUrl.match(/uuid-[a-f0-9-]+/i);
        if (uuidMatch) {
          imageFileName = uuidMatch[0] + '.png';
          console.log('Using UUID from URL:', imageFileName);
        } else {
          // If no UUID found, use a timestamp-based unique name
          imageFileName = `image-${Date.now()}.png`;
          console.log('No UUID found in URL, using timestamp:', imageFileName);
        }
      }
      
      console.log('Final image file name:', imageFileName);
      
      // Save the image directly in the page directory
      const imagePath = path.join(pageDir, imageFileName);
      fs.writeFileSync(imagePath, imageBuffer);
      console.log('Image saved to:', imagePath);
      
      // Generate image description using OpenAI's Vision model
      console.log('Generating image description...');
      try {
        const description = await generateImageDescription(imagePath, altText, contentType);
        const imageWithDescription = `${fullMatch}\n\n<${config.image.markdown.description_tag}>${description}</${config.image.markdown.description_tag}>\n\n`;
        processedMarkdown = processedMarkdown.replace(fullMatch, imageWithDescription);
        
        // Save description to cache in the page directory
        saveToCache(cacheKey, pageDir, description, config.image.model);
        
        // Save description to a separate file in the page directory
        const descriptionPath = path.join(pageDir, imageFileName.replace(/\.[^.]+$/, '.md'));
        saveDescriptionToFile(descriptionPath, description, altText);
        console.log('Description generated and cached successfully');
      } catch (aiError: any) {
        console.error('Error generating image description:', aiError.message);
        // Add a note about the failed AI description but keep the image
        const errorNote = `${fullMatch}\n\n<${config.image.markdown.description_tag}>Error generating description: ${aiError.message}</${config.image.markdown.description_tag}>\n\n`;
        processedMarkdown = processedMarkdown.replace(fullMatch, errorNote);
      }
    } catch (error: any) {
      console.error(`Error processing image ${imageCount}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      // Keep the original image markdown if processing fails
      continue;
    }
  }
  
  console.log(`\nProcessing completed. Total images found: ${imageCount}`);
  return processedMarkdown;
}

/**
 * Generate a description for an image using OpenAI's Vision model
 * @param imagePath Path to the image file
 * @param altText Alt text from the image markdown
 * @param contentType The content type of the image
 * @returns A description of the image
 */
async function generateImageDescription(imagePath: string, altText: string, contentType: string = 'image/png'): Promise<string> {
  // TEMPORARY: Skip OpenAI API calls during development
  console.log('Skipping OpenAI API call during development');
  return `[DEBUG] Image description skipped. Alt text: ${altText}`;

  // Original code commented out
  /*
  try {
    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    console.log('Calling OpenAI Vision API...');
    const response = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: config.image.prompt.replace('{altText}', altText)
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${contentType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      model: config.image.model,
      max_tokens: config.image.max_tokens
    });

    // Track the API cost
    costTracker.trackVisionAPI(response);

    const description = response.choices[0]?.message?.content;
    if (!description) {
      throw new Error('No description generated');
    }

    console.log('Description length:', description.length, 'characters');
    return description;
  } catch (error: any) {
    // Check for specific OpenAI API errors
    if (error.response?.status === 401) {
      throw new Error('OpenAI API key is invalid or missing');
    } else if (error.response?.status === 429) {
      throw new Error('OpenAI API rate limit exceeded');
    } else if (error.response?.status === 413) {
      throw new Error('Image file is too large for the API');
    }
    
    // Re-throw the error with more context
    throw new Error(`OpenAI API error: ${error.message}`);
  }
  */
} 
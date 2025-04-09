import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { load } from 'js-yaml';
import { processImages } from './image';
import { processAudio } from './audio';
import { ensureDirectoryExists } from './utils';
import { ProcessorConfig } from './types';

// Load configuration
const configPath = path.join(__dirname, 'processor.conf.yml');
const configFile = fs.readFileSync(configPath, 'utf8');
const config: ProcessorConfig = load(configFile) as ProcessorConfig;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || config.openai.api_key,
});

/**
 * Processes markdown content to handle images and audio
 * @param markdown The markdown content to process
 * @param baseUrl The base URL for resolving relative URLs
 * @param outputDir The directory to save processed files to
 * @returns The processed markdown content
 */
export async function processMarkdownContent(
  markdown: string,
  baseUrl: string,
  outputDir: string
): Promise<string> {
  try {
    // Ensure output directory exists
    ensureDirectoryExists(outputDir);

    // Process images
    const markdownWithProcessedImages = await processImages(markdown, baseUrl, outputDir);

    // Process audio
    const markdownWithProcessedAudio = await processAudio(markdownWithProcessedImages, baseUrl, outputDir);

    return markdownWithProcessedAudio;
  } catch (error: any) {
    console.error('Error processing markdown content:', error.message);
    throw error;
  }
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
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Describe this image in detail. If it's a UI screenshot, describe the interface elements. If it's a diagram, explain what it represents. Alt text: "${altText}"` 
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });
    
    return response.choices[0].message.content || "No description available.";
  } catch (error) {
    console.error("Error generating image description:", error);
    return `[Error generating description for image: ${altText}]`;
  }
}

/**
 * Generate a transcription for an audio file using OpenAI's API
 * @param audioPath Path to the audio file
 * @param linkText Text from the audio markdown link
 * @returns A transcription of the audio
 */
async function generateAudioTranscription(audioPath: string, linkText: string): Promise<string> {
  try {
    // Read the audio file
    const audioBuffer = fs.readFileSync(audioPath);
    
    // Call OpenAI's API to transcribe the audio
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
      language: "en",
      response_format: "text"
    });
    
    return response || "No transcription available.";
  } catch (error) {
    console.error("Error generating audio transcription:", error);
    return `[Error generating transcription for audio: ${linkText}]`;
  }
}

// Export OpenAI client and config for use in other modules
export { openai, config }; 
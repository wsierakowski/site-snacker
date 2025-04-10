import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { load } from 'js-yaml';
import { processImages } from './image';
import { processAudio } from './audio';
import { ensureDirectoryExists } from './utils';
import { ProcessorConfig } from './types';
import { CostTracker } from './cost-tracker';

// Load configuration
const configPath = path.join(__dirname, 'processor.conf.yml');
const configFile = fs.readFileSync(configPath, 'utf8');
const config: ProcessorConfig = load(configFile) as ProcessorConfig;

// Initialize OpenAI client
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize cost tracker
const costTracker = new CostTracker();

/**
 * Processes markdown content to handle images and audio
 * @param markdown The markdown content to process
 * @param baseUrl The base URL for resolving relative URLs
 * @param outputDir The directory to save processed files to
 * @returns The processed markdown content and cost summary
 */
export async function processMarkdownContent(
  markdown: string,
  baseUrl: string,
  outputDir: string
): Promise<{ content: string; costSummary: string }> {
  try {
    // Ensure output directory exists
    ensureDirectoryExists(outputDir);

    // Process images
    const markdownWithProcessedImages = await processImages(markdown, baseUrl, outputDir);

    // Process audio
    const markdownWithProcessedAudio = await processAudio(markdownWithProcessedImages, baseUrl, outputDir);

    // Get cost summary
    const costSummary = costTracker.getSummary();

    return {
      content: markdownWithProcessedAudio,
      costSummary
    };
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
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: config.image.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: config.image.prompt.replace('{altText}', altText) },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: config.image.max_tokens
    });

    costTracker.trackVisionAPI(response);
    return response.choices[0]?.message?.content || 'No description generated';
  } catch (error: any) {
    console.error('Error generating image description:', error);
    return `Error generating description: ${error?.message || 'Unknown error'}`;
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
    const audioFile = fs.createReadStream(audioPath);
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: config.audio.model,
      language: config.audio.language,
      response_format: config.audio.response_format as 'text'
    });

    // Get audio duration in minutes for cost tracking
    const stats = fs.statSync(audioPath);
    const durationInMinutes = stats.size / (1024 * 1024); // Rough estimate: 1MB per minute
    costTracker.trackAudioAPI(config.audio.model, durationInMinutes * 60); // Convert to seconds
    
    return response as string; // Whisper API returns the transcription directly as a string
  } catch (error: any) {
    console.error('Error generating audio transcription:', error);
    return `Error generating transcription: ${error?.message || 'Unknown error'}`;
  }
}

// Export OpenAI client, config, and cost tracker for use in other modules
export { openai, config, costTracker }; 
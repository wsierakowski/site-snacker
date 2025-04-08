import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { processImages } from './image.js';
import * as yaml from 'js-yaml';
import { ProcessorConfig } from './types.js';

// Load configuration
const config = yaml.load(fs.readFileSync(path.join(__dirname, 'processor.conf.yml'), 'utf8')) as ProcessorConfig;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

/**
 * Process markdown content to handle images and audio
 * @param markdown The markdown content to process
 * @param baseUrl The base URL of the original HTML content
 * @param outputDir The directory to save processed content (default: 'output')
 * @returns The processed markdown content
 */
export async function processMarkdownContent(
  markdown: string,
  baseUrl: string,
  outputDir: string = 'output'
): Promise<string> {
  // Override temp_dir from config if outputDir is provided
  if (outputDir !== 'output') {
    config.output.temp_dir = outputDir;
  }

  // Process images
  const processedMarkdown = await processImages(markdown, baseUrl, outputDir);
  
  // Skip audio processing for now
  // const finalMarkdown = await processAudio(processedMarkdown, baseUrl, outputDir);
  
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
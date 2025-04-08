import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import OpenAI from 'openai';
import { urlToFilePath } from '../utils/url.js';
import * as yaml from 'js-yaml';
import { ProcessorConfig } from './types.js';
import { TranscriptionCreateParams } from 'openai/resources/audio/transcriptions';

// Load configuration
const config = yaml.load(fs.readFileSync(path.join(__dirname, 'processor.conf.yml'), 'utf8')) as ProcessorConfig;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

/**
 * Process audio in markdown content
 * @param markdown The markdown content to process
 * @param baseUrl The base URL of the original HTML content
 * @param outputDir The directory to save processed content
 * @returns The processed markdown content with audio transcriptions
 */
export async function processAudio(
  markdown: string,
  baseUrl: string,
  outputDir: string
): Promise<string> {
  // Regular expression to find audio markdown syntax: [audio text](url)
  const audioRegex = /\[(.*?)\]\((.*?)\)/g;
  
  // Create a temporary directory for downloaded audio files
  const tmpDir = path.join(config.output.temp_dir, urlToFilePath(baseUrl).replace(/\.html$/, ''));
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  // Process each audio link
  let processedMarkdown = markdown;
  let match;
  
  while ((match = audioRegex.exec(markdown)) !== null) {
    const [fullMatch, linkText, audioUrl] = match;
    
    // Check if this is likely an audio file (by extension)
    const isAudioFile = /\.(mp3|wav|ogg|m4a|aac)$/i.test(audioUrl);
    
    if (isAudioFile) {
      // Resolve relative URLs
      const absoluteAudioUrl = new URL(audioUrl, baseUrl).toString();
      
      try {
        // Download the audio file
        const audioResponse = await axios.get(absoluteAudioUrl, { responseType: 'arraybuffer' });
        const audioBuffer = Buffer.from(audioResponse.data);
        
        // Save the audio file to the temporary directory
        const audioFileName = path.basename(audioUrl).split('?')[0] || 'audio.mp3';
        const audioPath = path.join(tmpDir, audioFileName);
        fs.writeFileSync(audioPath, audioBuffer);
        
        // Generate audio transcription using OpenAI's API
        const transcription = await generateAudioTranscription(audioPath, linkText);
        
        // Replace the audio markdown with the original + transcription
        const audioTranscriptionMarkdown = `<audio_transcript src="${absoluteAudioUrl}">${transcription}</audio_transcript>`;
        processedMarkdown = processedMarkdown.replace(
          fullMatch,
          `${fullMatch}\n\n${audioTranscriptionMarkdown}\n\n`
        );
        
        console.log(`Processed audio: ${absoluteAudioUrl}`);
      } catch (error) {
        console.error(`Error processing audio ${absoluteAudioUrl}:`, error);
        // Keep the original audio markdown if processing fails
      }
    }
  }
  
  return processedMarkdown;
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
    const params: TranscriptionCreateParams = {
      file: fs.createReadStream(audioPath),
      model: config.audio.model,
      language: config.audio.language,
      response_format: config.audio.response_format as "json" | "text" | "srt" | "verbose_json" | "vtt"
    };
    
    const response = await openai.audio.transcriptions.create(params);
    
    // Convert response to string if it's not already a string
    return typeof response === 'string' ? response : JSON.stringify(response);
  } catch (error) {
    console.error("Error generating audio transcription:", error);
    return `[Error generating transcription for audio: ${linkText}]`;
  }
} 
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import OpenAI from 'openai';
import { urlToFilePath, urlToDirPath } from '../utils/url.js';
import { TranscriptionCreateParams } from 'openai/resources/audio/transcriptions';
import { downloadFile } from '../utils/download.js';
import { getProcessorConfig } from '../config';
import { CostTracker } from './cost-tracker';
import { MediaRegistry } from './registry';

// Get configuration from the centralized config
const config = getProcessorConfig().audio;

// Initialize OpenAI client
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize cost tracker
const costTracker = new CostTracker();

// Initialize media registry
const mediaRegistry = new MediaRegistry({
  registryPath: 'tmp/media-registry.json',
  autoSave: true,
  backupOld: true
});

/**
 * Process audio in markdown content
 * @param markdown The markdown content to process
 * @param baseUrl The base URL of the original HTML content
 * @param outputDir The directory to save processed content
 * @param markdownPath Optional parameter for the markdown file path
 * @returns The processed markdown content with audio transcriptions
 */
export async function processAudio(
  markdown: string,
  baseUrl: string,
  outputDir: string,
  markdownPath?: string
): Promise<string> {
  // Regular expression to find audio markdown syntax: [audio text](url)
  const audioRegex = /\[(.*?)\]\((.*?)\)/g;
  let audioCount = 0;
  
  // Get the markdown file directory to use as the base for audio files
  const pageDir = markdownPath 
    ? path.dirname(markdownPath)
    : urlToDirPath(baseUrl);
  
  console.log('\nStarting audio processing...');
  console.log('Base URL:', baseUrl);
  console.log('Page directory:', pageDir);
  
  // Process each audio link
  let processedMarkdown = markdown;
  let match;
  
  while ((match = audioRegex.exec(markdown)) !== null) {
    const [fullMatch, linkText, audioUrl] = match;
    
    // Check if this is likely an audio file (by extension)
    const isAudioFile = /\.(mp3|wav|ogg|m4a|aac)$/i.test(audioUrl);
    
    if (isAudioFile) {
      audioCount++;
      console.log(`\nProcessing audio ${audioCount}:`);
      console.log('Link text:', linkText);
      console.log('Audio URL:', audioUrl);
      
      try {
        // Resolve relative URLs
        const resolvedAudioUrl = audioUrl.startsWith('/') || audioUrl.startsWith('./') || audioUrl.startsWith('../') 
          ? new URL(audioUrl, baseUrl).toString() 
          : audioUrl;
        console.log('Resolved URL:', resolvedAudioUrl);
        
        // Extract UUID from the URL
        let audioFileName: string;
        const uuidMatch = resolvedAudioUrl.match(/uuid-[a-f0-9-]+/i);
        if (uuidMatch) {
          audioFileName = uuidMatch[0] + path.extname(audioUrl);
          console.log('Using UUID from URL:', audioFileName);
        } else {
          // If no UUID found, use a timestamp-based unique name
          audioFileName = `audio-${Date.now()}${path.extname(audioUrl)}`;
          console.log('No UUID found in URL, using timestamp:', audioFileName);
        }
        
        // Check cache first
        const cacheKey = audioFileName + '.json';
        const cachedData = getCachedTranscription(cacheKey, pageDir);
        
        if (cachedData && cachedData.model === config.model) {
          console.log('Using cached transcription from:', path.join(pageDir, cacheKey));
          const audioWithTranscription = `${fullMatch}\n\n<${config.markdown.transcript_tag} src="${resolvedAudioUrl}">${cachedData.transcription}</${config.markdown.transcript_tag}>\n\n`;
          processedMarkdown = processedMarkdown.replace(fullMatch, audioWithTranscription);
          continue;
        }
        
        // Download the audio file
        console.log('Downloading audio from:', resolvedAudioUrl);
        const result = await downloadFile(resolvedAudioUrl, baseUrl, {
          headers: {
            'Accept': 'audio/*,*/*;q=0.8',
            'Sec-Fetch-Dest': 'audio',
          }
        });
        
        // Save the audio file directly in the page directory
        const audioPath = path.join(pageDir, audioFileName);
        fs.writeFileSync(audioPath, result.buffer);
        console.log('Audio saved to:', audioPath);
        
        // Check if this audio is already in the registry
        const registryEntry = mediaRegistry.getEntry(audioPath);
        let transcription: string;
        
        if (registryEntry) {
          console.log('Using transcription from registry for:', audioPath);
          transcription = registryEntry.content;
        } else {
          // Generate transcription using OpenAI's API
          console.log('Generating audio transcription...');
          try {
            transcription = await generateAudioTranscription(audioPath, linkText);
            
            // Add to registry
            mediaRegistry.addEntry(
              audioPath,
              'audio',
              transcription,
              { originalUrl: resolvedAudioUrl },
              costTracker.getLastAudioCost()
            );
          } catch (aiError: any) {
            console.error('Error generating audio transcription:', aiError.message);
            transcription = `Error generating transcription: ${aiError.message}`;
          }
        }
        
        const audioWithTranscription = `${fullMatch}\n\n<${config.markdown.transcript_tag} src="${resolvedAudioUrl}">${transcription}</${config.markdown.transcript_tag}>\n\n`;
        processedMarkdown = processedMarkdown.replace(fullMatch, audioWithTranscription);
        
        // Save transcription to cache in the page directory
        saveTranscriptionToCache(cacheKey, pageDir, transcription, config.model);
        
        // Save transcription to a separate file in the page directory
        const transcriptionPath = path.join(pageDir, audioFileName.replace(/\.[^.]+$/, '.md'));
        saveTranscriptionToFile(transcriptionPath, transcription, linkText);
        console.log('Transcription saved successfully');
      } catch (error: any) {
        console.error(`Error processing audio ${audioCount}:`, error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        // Keep the original audio markdown if processing fails
        continue;
      }
    }
  }
  
  console.log(`\nProcessing completed. Total audio files found: ${audioCount}`);
  return processedMarkdown;
}

/**
 * Save transcription to a markdown file
 * @param transcriptionPath Path to save the transcription file
 * @param transcription Generated transcription
 * @param linkText Original link text
 */
function saveTranscriptionToFile(transcriptionPath: string, transcription: string, linkText: string): void {
  const content = `# Audio Transcription\n\n## Original Link Text\n${linkText}\n\n## Generated Transcription\n${transcription}\n`;
  fs.writeFileSync(transcriptionPath, content);
  console.log('Transcription saved to:', transcriptionPath);
}

/**
 * Get cached transcription from file
 * @param cacheKey The cache key (filename)
 * @param pageDir The page directory
 * @returns The cached transcription data or null if not found
 */
function getCachedTranscription(cacheKey: string, pageDir: string): { transcription: string; model: string; timestamp: number } | null {
  const cachePath = path.join(pageDir, cacheKey);
  if (fs.existsSync(cachePath)) {
    try {
      const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      return cacheData;
    } catch (error) {
      console.error('Error reading cache file:', error);
    }
  }
  return null;
}

/**
 * Save transcription to cache file
 * @param cacheKey The cache key (filename)
 * @param pageDir The page directory
 * @param transcription The transcription to cache
 * @param model The model used to generate the transcription
 */
function saveTranscriptionToCache(cacheKey: string, pageDir: string, transcription: string, model: string): void {
  const cachePath = path.join(pageDir, cacheKey);
  const cacheData = {
    transcription,
    model,
    timestamp: Date.now()
  };
  fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
  console.log('Transcription cached to:', cachePath);
}

/**
 * Generate a transcription for an audio file using OpenAI's API
 * @param audioPath Path to the audio file
 * @param linkText Text from the audio markdown link
 * @returns A transcription of the audio
 */
async function generateAudioTranscription(audioPath: string, linkText: string): Promise<string> {
  console.log('Calling OpenAI Whisper API...');
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: config.model,
    language: config.language,
    response_format: config.response_format as "json" | "text" | "srt" | "verbose_json" | "vtt"
  });
  
  // Convert response to string if it's not already a string
  return typeof transcription === 'string' ? transcription : JSON.stringify(transcription);
}

/**
 * Get the duration of an audio file in seconds
 */
async function getAudioDuration(audioPath: string): Promise<{ duration: number }> {
  // For now, return a default duration as getting actual duration requires additional dependencies
  return { duration: 60 }; // Default to 1 minute for cost estimation
} 
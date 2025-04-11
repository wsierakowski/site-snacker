import { ChatCompletion } from 'openai/resources';
import { getOpenAIConfig } from '../config';

// Get pricing from configuration
const config = getOpenAIConfig();
const PRICING = config.pricing;

type ModelPricing = typeof PRICING;
type ModelName = keyof ModelPricing;

interface CostMetrics {
  timestamp: number;
  cost: number;
  details: {
    promptTokens?: number;
    completionTokens?: number;
    imageCount?: number;
    durationInSeconds?: number;
  };
}

interface ProcessingMetrics {
  images: CostMetrics[];
  audio: CostMetrics[];
  totalCost: number;
}

export class CostTracker {
  private visionCosts: CostMetrics[] = [];
  private audioCosts: CostMetrics[] = [];

  constructor() {
    // Initialize cost tracking
  }

  /**
   * Track the cost of a Vision API call
   */
  public trackVisionAPI(promptTokens: number, completionTokens: number, imageCount: number): void {
    const cost = this.calculateVisionCost(promptTokens, completionTokens, imageCount);
    this.visionCosts.push({
      timestamp: Date.now(),
      cost,
      details: {
        promptTokens,
        completionTokens,
        imageCount
      }
    });
  }

  /**
   * Track the cost of an audio transcription
   */
  public trackAudioAPI(durationInSeconds: number): void {
    const cost = this.calculateAudioCost(durationInSeconds);
    this.audioCosts.push({
      timestamp: Date.now(),
      cost,
      details: {
        durationInSeconds
      }
    });
  }

  /**
   * Get a summary of all costs
   */
  public getSummary(): string {
    const totalVisionCost = this.visionCosts.reduce((sum, cost) => sum + cost.cost, 0);
    const totalAudioCost = this.audioCosts.reduce((sum, cost) => sum + cost.cost, 0);
    const totalCost = totalVisionCost + totalAudioCost;

    const summary = [
      '\nCost Summary:',
      '-------------',
      `Vision API Calls: $${totalVisionCost.toFixed(4)}`,
      `Audio API Calls:  $${totalAudioCost.toFixed(4)}`,
      `Total Cost:       $${totalCost.toFixed(4)}`,
      ''
    ].join('\n');

    return summary;
  }

  /**
   * Calculate the cost of a Vision API call
   */
  private calculateVisionCost(promptTokens: number, completionTokens: number, imageCount: number): number {
    const model = 'gpt-4-vision-preview' as const;
    const pricing = PRICING[model];
    const inputCost = (promptTokens / 1000) * pricing.input;
    const outputCost = (completionTokens / 1000) * pricing.output;
    const imageCost = imageCount * pricing.image;
    return inputCost + outputCost + imageCost;
  }

  /**
   * Calculate the cost of an audio transcription
   */
  private calculateAudioCost(durationInSeconds: number): number {
    const durationInMinutes = durationInSeconds / 60;
    const model = 'whisper-1' as const;
    return durationInMinutes * PRICING[model].per_minute;
  }
}

/**
 * Calculate the cost of an audio transcription
 */
export function calculateAudioCost(durationInMinutes: number): number {
  const model = 'whisper-1' as const;
  return durationInMinutes * PRICING[model].per_minute;
} 
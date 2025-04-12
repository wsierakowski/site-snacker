import { ChatCompletion } from 'openai/resources';
import { getOpenAIConfig } from '../config';

// Get pricing from configuration
const config = getOpenAIConfig();
const PRICING = config.pricing;

type ModelPricing = {
  'gpt-4o': {
    input: number;
    output: number;
  };
  'gpt-4o-mini': {
    input: number;
    output: number;
  };
  'whisper-1': {
    per_minute: number;
  };
};

type ModelName = keyof ModelPricing;

interface CostMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

export class CostTracker {
  private imageCosts: CostMetrics = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cost: 0
  };
  private audioCosts: CostMetrics = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cost: 0
  };

  private calculateImageCost(response: ChatCompletion): number {
    const model = 'gpt-4o-mini' as const;
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const totalTokens = response.usage?.total_tokens || 0;

    const inputCost = promptTokens * PRICING[model].input / 1000;
    const outputCost = completionTokens * PRICING[model].output / 1000;
    const totalCost = inputCost + outputCost;

    this.imageCosts.promptTokens += promptTokens;
    this.imageCosts.completionTokens += completionTokens;
    this.imageCosts.totalTokens += totalTokens;
    this.imageCosts.cost += totalCost;

    return totalCost;
  }

  private calculateAudioCost(durationInSeconds: number): number {
    const model = 'whisper-1' as const;
    const durationInMinutes = durationInSeconds / 60;
    const cost = durationInMinutes * PRICING[model].per_minute;

    this.audioCosts.totalTokens += durationInSeconds;
    this.audioCosts.cost += cost;

    return cost;
  }

  public trackImageAPI(response: ChatCompletion): void {
    this.calculateImageCost(response);
  }

  public trackAudioAPI(durationInSeconds: number): void {
    this.calculateAudioCost(durationInSeconds);
  }

  public getSummary(): string {
    let summary = '\nOpenAI API Usage Summary:\n';
    summary += '------------------------\n';

    if (this.imageCosts.totalTokens > 0) {
      summary += '\nImage Processing:\n';
      summary += `  Prompt Tokens: ${this.imageCosts.promptTokens}\n`;
      summary += `  Completion Tokens: ${this.imageCosts.completionTokens}\n`;
      summary += `  Total Tokens: ${this.imageCosts.totalTokens}\n`;
      summary += `  Cost: $${this.imageCosts.cost.toFixed(4)}\n`;
    }

    if (this.audioCosts.totalTokens > 0) {
      summary += '\nAudio Processing:\n';
      summary += `  Duration: ${this.audioCosts.totalTokens} seconds\n`;
      summary += `  Cost: $${this.audioCosts.cost.toFixed(4)}\n`;
    }

    const totalCost = this.imageCosts.cost + this.audioCosts.cost;
    summary += `\nTotal Cost: $${totalCost.toFixed(4)}\n`;

    return summary;
  }
}

/**
 * Calculate the cost of an audio transcription
 */
export function calculateAudioCost(durationInMinutes: number): number {
  const model = 'whisper-1' as const;
  return durationInMinutes * PRICING[model].per_minute;
} 
import { ChatCompletion } from 'openai/resources';

interface CostMetrics {
  model: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  images?: number;
  audioSeconds?: number;
  estimatedCost: number;
}

interface ProcessingMetrics {
  images: CostMetrics[];
  audio: CostMetrics[];
  totalCost: number;
}

// Current pricing as of March 2024 (in USD)
const PRICING = {
  'gpt-4-vision-preview': {
    input: 0.01,    // per 1K tokens
    output: 0.03,   // per 1K tokens
    image: 0.00765  // per image
  },
  'whisper-1': {
    perMinute: 0.006  // $0.006 per minute
  },
  'gpt-4o-mini': {
    perToken: 0.00001,  // $0.01 per 1K tokens
    perImage: 0.00765,  // $0.00765 per image
  }
} as const;

export class CostTracker {
  private metrics: ProcessingMetrics = {
    images: [],
    audio: [],
    totalCost: 0
  };

  /**
   * Track cost for a vision API call
   */
  trackVisionAPI(response: ChatCompletion, imageCount: number = 1): void {
    const usage = response.usage;
    if (!usage) return;

    const metrics: CostMetrics = {
      model: response.model,
      tokens: {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens
      },
      images: imageCount,
      estimatedCost: this.calculateVisionCost(usage.prompt_tokens, usage.completion_tokens, imageCount)
    };

    this.metrics.images.push(metrics);
    this.metrics.totalCost += metrics.estimatedCost;
  }

  /**
   * Track cost for an audio API call
   */
  trackAudioAPI(model: string, durationInSeconds: number): void {
    const metrics: CostMetrics = {
      model,
      audioSeconds: durationInSeconds,
      estimatedCost: this.calculateAudioCost(durationInSeconds)
    };

    this.metrics.audio.push(metrics);
    this.metrics.totalCost += metrics.estimatedCost;
  }

  /**
   * Calculate cost for vision API usage
   */
  private calculateVisionCost(promptTokens: number, completionTokens: number, imageCount: number): number {
    const pricing = PRICING['gpt-4-vision-preview'];
    const inputCost = (promptTokens / 1000) * pricing.input;
    const outputCost = (completionTokens / 1000) * pricing.output;
    const imageCost = imageCount * pricing.image;
    return inputCost + outputCost + imageCost;
  }

  /**
   * Calculate cost for audio API usage
   */
  private calculateAudioCost(durationInSeconds: number): number {
    const durationInMinutes = durationInSeconds / 60;
    return durationInMinutes * PRICING['whisper-1'].perMinute;
  }

  /**
   * Get the summary of all API costs
   */
  getSummary(): string {
    let summary = '\nOpenAI API Usage Summary:\n';
    summary += '------------------------\n\n';

    if (this.metrics.images.length > 0) {
      summary += 'Image Processing:\n';
      this.metrics.images.forEach((m, i) => {
        summary += `  Image #${i + 1}:\n`;
        summary += `    Model: ${m.model}\n`;
        if (m.tokens) {
          summary += `    Tokens: ${m.tokens.total} (${m.tokens.prompt} prompt, ${m.tokens.completion} completion)\n`;
        }
        summary += `    Cost: $${m.estimatedCost.toFixed(4)}\n`;
      });
    }

    if (this.metrics.audio.length > 0) {
      summary += '\nAudio Processing:\n';
      this.metrics.audio.forEach((m, i) => {
        summary += `  Audio #${i + 1}:\n`;
        summary += `    Model: ${m.model}\n`;
        if (m.audioSeconds) {
          summary += `    Duration: ${m.audioSeconds.toFixed(1)} seconds\n`;
        }
        summary += `    Cost: $${m.estimatedCost.toFixed(4)}\n`;
      });
    }

    summary += '\nTotal Estimated Cost: $' + this.metrics.totalCost.toFixed(4) + '\n';
    return summary;
  }
}

export function calculateImageCost(response: ChatCompletion): number {
  const pricing = PRICING['gpt-4o-mini'];
  const tokens = response.usage?.total_tokens || 0;
  return tokens * pricing.perToken;
}

export function calculateAudioCost(durationInMinutes: number): number {
  return durationInMinutes * PRICING['whisper-1'].perMinute;
} 
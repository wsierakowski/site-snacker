// Processor Configuration Types
export interface ProcessorConfig {
  openai: {
    api_key: string;
  };
  image: {
    model: string;
    prompt: string;
    max_tokens: number;
  };
  audio: {
    model: string;
    language: string;
    response_format: string;
  };
  output: {
    base_dir: string;
    temp_dir: string;
  };
} 
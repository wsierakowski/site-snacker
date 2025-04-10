// Processor Configuration Types
export interface ProcessorConfig {
  openai: {
    // API key is read from .env file
  };
  image: {
    model: string;
    prompt: string;
    max_tokens: number;
    markdown: {
      description_tag: string;
      error_prefix: string;
    };
    directory: string;
  };
  audio: {
    model: string;
    language: string;
    response_format: string;
    markdown: {
      transcript_tag: string;
      error_prefix: string;
    };
    directory: string;
  };
  output: {
    base_dir: string;
    temp_dir: string;
  };
} 
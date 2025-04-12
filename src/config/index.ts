import * as fs from 'fs';
import * as path from 'path';
import { load } from 'js-yaml';

// Configuration types
export interface SiteSnackerConfig {
  openai: {
    // API key is read from .env file
    pricing: {
      'gpt-4-vision-preview': {
        input: number;
        output: number;
        image: number;
      };
      'whisper-1': {
        per_minute: number;
      };
    };
  };
  processor: {
    image: {
      model: string;
      max_tokens: number;
      prompt: string;
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
  };
  fetcher: {
    cloudflare: {
      wait_time: number;
      timeout: number;
      auto_detect: boolean;
    };
    puppeteer: {
      viewport: {
        width: number;
        height: number;
      };
      user_agent: string;
      headers: {
        accept_language: string;
        accept: string;
      };
    };
    cache: {
      enabled: boolean;
      skip_domains: string[];
    };
  };
  converter: {
    readability: {
      use_reader_mode: boolean;
    };
    markdown: {
      preserve_tables: boolean;
      preserve_links: boolean;
      preserve_images: boolean;
    };
  };
  directories: {
    base: string;
    output: {
      base: string;
      processed: string;
      merged: string;
    };
    temp: string;
    cache: string;
  };
  sitemap: {
    auto_merge: boolean;
    parallel: boolean;
    max_concurrent: number;
  };
  cost_tracking: {
    enabled: boolean;
    warn_threshold: number;
    stop_threshold: number;
  };
}

class ConfigLoader {
  private static instance: ConfigLoader;
  private config: SiteSnackerConfig;

  private constructor() {
    const configPath = path.join(process.cwd(), 'site-snacker.config.yml');
    if (!fs.existsSync(configPath)) {
      throw new Error('Configuration file not found: site-snacker.config.yml');
    }
    const configFile = fs.readFileSync(configPath, 'utf8');
    this.config = load(configFile) as SiteSnackerConfig;
  }

  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  // Get the entire configuration
  public getConfig(): SiteSnackerConfig {
    return this.config;
  }

  // Get processor configuration
  public getProcessorConfig() {
    return this.config.processor;
  }

  // Get fetcher configuration
  public getFetcherConfig() {
    return this.config.fetcher;
  }

  // Get converter configuration
  public getConverterConfig() {
    return this.config.converter;
  }

  // Get directory configuration
  public getDirectoryConfig() {
    return this.config.directories;
  }

  // Get sitemap configuration
  public getSitemapConfig() {
    return this.config.sitemap;
  }

  // Get cost tracking configuration
  public getCostTrackingConfig() {
    return this.config.cost_tracking;
  }

  // Get OpenAI configuration
  public getOpenAIConfig() {
    return this.config.openai;
  }

  // Load configuration from a specific file (for testing)
  public loadConfig(configPath: string) {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    const configFile = fs.readFileSync(configPath, 'utf8');
    this.config = load(configFile) as SiteSnackerConfig;
  }
}

// Export the ConfigLoader class for testing
export { ConfigLoader };

// Export a singleton instance
export const config = ConfigLoader.getInstance();

// Export individual config getters for convenience
export const getProcessorConfig = () => config.getProcessorConfig();
export const getFetcherConfig = () => config.getFetcherConfig();
export const getConverterConfig = () => config.getConverterConfig();
export const getDirectoryConfig = () => config.getDirectoryConfig();
export const getSitemapConfig = () => config.getSitemapConfig();
export const getCostTrackingConfig = () => config.getCostTrackingConfig();
export const getOpenAIConfig = () => config.getOpenAIConfig(); 
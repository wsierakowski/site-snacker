# Site Snacker Implementation Plan

## Project Overview
Site Snacker is a TypeScript-based tool that converts HTML websites into clean, readable Markdown format. It's built with Bun for optimal performance and developer experience.

## Module Architecture

### 1. HTML Page Fetcher Module
- **Purpose**: Download HTML content from public websites
- **Libraries**:
  - Axios for HTTP requests
  - Puppeteer for Cloudflare-protected sites
  - Simple file-based caching in tmp folder
  - Basic error handling with stdout logging
- **Implementation**:
  - Fetch HTML content from URLs
  - Handle redirects and basic error cases
  - Cache results in tmp/[domain]/[path]/[filename].html
  - Provide clean interface for other modules
  - Automatic fallback to Puppeteer when Cloudflare is detected

### 2. HTML to Markdown Converter Module
- **Purpose**: Convert HTML content to clean Markdown
- **Libraries**:
  - node-readability (Mozilla's algorithm) for content extraction
  - turndown for HTML-to-Markdown conversion
- **Implementation**:
  - Extract main content using Readability.js
  - Clean and normalize the extracted content
  - Convert HTML to Markdown
  - Handle special elements (tables, lists, etc.)
  - Preserve breadcrumbs and source information

### 3. Content Processor Module
- **Purpose**: Process images and audio in the markdown content
- **Implementation**:
  - Identify image tags in markdown
  - Send images to OpenAI Vision API for description
  - Format image descriptions in markdown
  - Identify audio elements and generate transcriptions using Whisper API
  - Format audio transcriptions in markdown
  - Track API costs and implement safety limits
  - Smart image caching system:
    - Calculate checksums for image deduplication
    - Maintain central image registry in tmp/image-cache.json
    - Track image occurrences across pages
    - Reuse AI-generated descriptions for identical images
    - Provide analytics on image usage patterns

### 3.1 Image Cache Registry
- **Purpose**: Optimize storage and API costs through image deduplication
- **Implementation**:
  - Store in `tmp/image-cache.json`
  - Structure:
    ```typescript
    interface ImageCache {
      images: {
        [hash: string]: {
          description: string;
          occurrences: Array<{
            pagePath: string;
            originalUrl: string;
          }>;
          firstProcessed: string;
          lastUsed: string;
        };
      };
      stats: {
        totalImages: number;
        uniqueImages: number;
        duplicateCount: number;
        lastUpdated: string;
      };
    }
    ```
  - Functions:
    - Calculate image checksums
    - Check for existing descriptions
    - Update occurrence records
    - Generate usage statistics
    - Maintain cache integrity

### 4. Merger Module
- **Purpose**: Combine multiple markdown files into a single document
- **Implementation**:
  - Preserve image descriptions in merged output
  - Maintain original markdown structure
  - Add metadata and section headers
  - Handle both single files and sitemaps
  - Organize output by domain

### 5. Sitemap Module
- **Purpose**: Process sitemaps to extract and process multiple URLs
- **Implementation**:
  - Parse XML sitemaps
  - Extract URLs from sitemap entries
  - Process each URL through the pipeline
  - Support parallel processing (experimental)
  - Auto-merge processed pages into a single document

### 6. Orchestrator Module
- **Purpose**: Coordinate the entire process
- **Implementation**:
  - Manage workflow between modules
  - Handle file I/O operations
  - Generate metadata files
  - Ensure idempotency (avoid reprocessing)
  - Provide progress tracking and reporting
  - Generate cost summaries

### 7. Configuration Module ✅
- **Purpose**: Manage project settings
- **Implementation**:
  - Centralized configuration through `site-snacker.config.yml`
  - Type-safe configuration with TypeScript interfaces
  - Environment variables for sensitive data (API keys)
  - Module-specific settings with sensible defaults
  - Cost tracking configuration
  - Directory structure configuration
  - Sitemap processing options
  - Cloudflare and Puppeteer settings
  - OpenAI API pricing and model settings

## File Structure
```
site-snacker/
├── src/
│   ├── fetcher/         # HTML fetching module
│   ├── converter/       # HTML to Markdown conversion
│   ├── processor/       # Content processing (images, audio)
│   ├── merger/          # Markdown file merging
│   ├── sitemap/         # Sitemap processing
│   ├── orchestrator/    # Process coordination
│   ├── config/          # Configuration management
│   │   ├── index.ts     # Configuration loader
│   │   ├── types.ts     # TypeScript interfaces
│   │   └── defaults.ts  # Default settings
│   ├── utils/           # Shared utilities
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Entry point
├── tmp/                 # Temporary files and cache
├── output/              # Generated markdown files
│   ├── processed/       # Processed markdown files
│   │   └── [domain]/    # Organized by domain
│   └── merged/          # Merged documentation
├── docs/                # Documentation
├── site-snacker.config.yml  # Configuration file
├── package.json         # Project dependencies
└── tsconfig.json        # TypeScript configuration
```

## Implementation Phases

### Phase 1: Core Infrastructure ✅
- Set up project structure
- Implement configuration module
- Create basic orchestrator

### Phase 2: HTML Fetching and Conversion ✅
- Implement HTML fetcher module
- Implement HTML to Markdown converter
- Test with various websites

### Phase 3: Content Processing ✅
- Implement image processing
- Implement audio processing
- Test with content containing media

### Phase 4: Sitemap and Merging ✅
- Implement sitemap processing
- Implement markdown merging
- Test with multi-page websites

### Phase 5: Monitoring and Optimization ✅
- Implement cost tracking
- Add safety limits
- Optimize performance

### Phase 6: Website Crawling (Future)
- Implement website crawling
- Add smart crawling strategies
- Handle site maps and robots.txt

## Testing Strategy
- Unit tests for each module
- Integration tests for the complete workflow
- Test with various website types and content
- Performance testing for large websites

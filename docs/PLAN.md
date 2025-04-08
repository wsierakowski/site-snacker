# Site Snacker Implementation Plan

## Project Overview
Site Snacker is a TypeScript-based tool that converts HTML websites into clean, readable Markdown format. It's built with Bun for optimal performance and developer experience.

## Module Architecture

### 1. HTML Page Fetcher Module
- **Purpose**: Download HTML content from public websites
- **Libraries**:
  - Axios for HTTP requests
  - Simple file-based caching in tmp folder
  - Basic error handling with stdout logging
- **Implementation**:
  - Fetch HTML content from URLs
  - Handle redirects and basic error cases
  - Cache results in tmp/[url-hash]/index.html
  - Provide clean interface for other modules

### 2. HTML to Markdown Converter Module
- **Purpose**: Convert HTML content to clean Markdown
- **Libraries**:
  - node-readability (Mozilla's algorithm) for content extraction
  - Cheerio for HTML parsing and post-processing
  - turndown or similar for HTML-to-Markdown conversion
- **Implementation**:
  - Extract main content using Readability.js
  - Clean and normalize the extracted content
  - Convert HTML to Markdown
  - Handle special elements (tables, lists, etc.)

### 3. Content Processor Module
- **Purpose**: Process images and audio in the markdown content
- **Implementation**:
  - Identify image tags in markdown
  - Send images to multimodal model for description
  - Format image descriptions in markdown
  - Identify audio elements and generate transcriptions
  - Format audio transcriptions in markdown

### 4. Orchestrator Module
- **Purpose**: Coordinate the entire process
- **Implementation**:
  - Manage workflow between modules
  - Handle file I/O operations
  - Generate metadata files
  - Ensure idempotency (avoid reprocessing)

### 5. Token Monitor Module
- **Purpose**: Track token usage and costs
- **Implementation**:
  - Count tokens in processed content
  - Estimate API costs
  - Implement safety limits

### 6. Configuration Module
- **Purpose**: Manage project settings
- **Implementation**:
  - Load settings from config file
  - Provide defaults
  - Validate configuration

## File Structure
```
site-snacker/
├── src/
│   ├── fetcher/         # HTML fetching module
│   ├── converter/       # HTML to Markdown conversion
│   ├── processor/       # Content processing (images, audio)
│   ├── orchestrator/    # Process coordination
│   ├── monitor/         # Token usage monitoring
│   ├── config/          # Configuration management
│   └── index.ts         # Entry point
├── tmp/                 # Temporary files
├── output/              # Generated markdown files
├── config.json          # Configuration file
├── package.json         # Project dependencies
└── tsconfig.json        # TypeScript configuration
```

## Implementation Phases

### Phase 1: Core Infrastructure
- Set up project structure
- Implement configuration module
- Create basic orchestrator

### Phase 2: HTML Fetching and Conversion
- Implement HTML fetcher module
- Implement HTML to Markdown converter
- Test with various websites

### Phase 3: Content Processing
- Implement image processing
- Implement audio processing
- Test with content containing media

### Phase 4: Monitoring and Optimization
- Implement token monitoring
- Add safety limits
- Optimize performance

### Phase 5: Website Crawling (Future)
- Implement website crawling
- Add smart crawling strategies
- Handle site maps and robots.txt

## Testing Strategy
- Unit tests for each module
- Integration tests for the complete workflow
- Test with various website types and content
- Performance testing for large websites

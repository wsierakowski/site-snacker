# Site Snacker

The script snacks on websites and spits out tasty Markdown.

## Description

Site Snacker is a TypeScript-based tool that converts HTML websites into clean, readable Markdown format. It's built with Bun for optimal performance and developer experience.

## Prerequisites

- [Bun](https://bun.sh/) installed on your system
- Node.js (optional, but recommended for development tools)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/wsierakowski/site-snacker.git
cd site-snacker
```

2. Install dependencies:
```bash
bun install
```

3. Set up your environment:
```bash
# Create a .env file and add your OpenAI API key
echo "OPENAI_API_KEY=your_api_key_here" > .env
```

## Quick Start Guide

Follow these steps to fetch, convert, and process a webpage:

1. **Fetch the webpage**:
```bash
# This will download the HTML and cache it in tmp/[domain]/[path]
bun run fetch https://example.com

# For Cloudflare-protected sites, use the Puppeteer option:
bun run fetch:puppeteer https://example.com
# or
bun run fetch https://example.com --puppeteer
```

2. **Convert HTML to Markdown**:
```bash
# This will convert the cached HTML to Markdown
bun run convert https://example.com
```

3. **Process the Markdown** (adds image descriptions and audio transcriptions):
```bash
# This will process the converted Markdown, adding AI-generated descriptions
bun run process https://example.com
```

### Example with Real URL

Here's a complete example using a Wikipedia article about the Golden Gate Bridge:

```bash
# 1. Fetch the page
bun run fetch https://en.wikipedia.org/wiki/Golden_Gate_Bridge

# 2. Convert to Markdown
bun run convert https://en.wikipedia.org/wiki/Golden_Gate_Bridge

# 3. Process with AI
bun run process https://en.wikipedia.org/wiki/Golden_Gate_Bridge
```

After running these commands:
- The HTML will be cached in `tmp/en.wikipedia.org/...`
- The Markdown will be saved in the same directory
- Processed Markdown with image descriptions will be in the same location
- Each image will have a corresponding `.md` file with its AI-generated description (e.g., `Golden_Gate_Bridge_0.jpg.md`)
- The AI will generate detailed descriptions of the bridge's architecture, historical photos, and technical diagrams

### Example with Cloudflare-Protected Site

If you encounter a Cloudflare challenge, the script will let you know and provide instructions. Here's how to handle it:

```bash
# First attempt might fail with Cloudflare challenge
bun run fetch https://example.com

# Retry using the Puppeteer option
bun run fetch:puppeteer https://example.com
# or
bun run fetch https://example.com --puppeteer

# Then proceed with convert and process as usual
bun run convert https://example.com
bun run process https://example.com
```

## Usage

### Basic Commands
```bash
# Run the main script
bun start

# Run in development mode with hot reload
bun dev

# Build the project
bun build

# Run all tests
bun test
```

### Fetching URLs
```bash
# Fetch a URL directly (automatically handles Cloudflare protection)
bun run fetch https://example.com

# Fetch a URL with explicit Puppeteer mode for Cloudflare-protected sites
bun run fetch:puppeteer https://example.com

# Fetch with custom options
bun run fetch https://example.com --puppeteer --wait=20000 --timeout=60000 --no-cache
```

### Converting URLs to Markdown
```bash
# Convert a URL to Markdown (uses cached HTML if available)
bun run convert https://example.com
```

### Running Tests
```bash
# Run fetcher integration tests
bun run test:fetcher

# Run fetcher tests with custom URL
bun run test:fetcher:custom

# Run converter integration tests
bun run test:converter

# Run processor integration tests
bun run test:processor

# Test OpenAI API integration
bun run test:openai
```

## Project Modules

Site Snacker is organized into several modules, each with a specific responsibility:

### Fetcher Module (`src/fetcher/`)

**Description**: Downloads HTML content from websites and caches it locally.

**How it works**:
- Uses Axios for basic HTML fetching
- Uses Puppeteer for Cloudflare-protected sites
- Converts URLs to file paths for caching
- Stores downloaded content in a `tmp/[domain]/[path]` structure
- Implements caching to avoid re-downloading the same content
- Automatically detects and handles Cloudflare protection

**Contract**:
```typescript
// Regular fetch with Cloudflare header support
async function fetchHtml(
  url: string, 
  useCache: boolean = true,
  options: {
    timeout?: number;
    useCloudflareHeaders?: boolean;
  } = {}
): Promise<string>

// Puppeteer-based fetch for Cloudflare-protected sites
async function fetchWithPuppeteer(
  url: string,
  options: {
    useCache?: boolean;
    waitTime?: number;
    timeout?: number;
    waitForSelector?: string;
  } = {}
): Promise<string>
```

**Usage**:
```bash
# Fetch any URL (automatically handles Cloudflare)
bun run fetch https://example.com

# Fetch with explicit Puppeteer mode
bun run fetch https://example.com --puppeteer

# Customize wait time for Cloudflare challenge
bun run fetch https://example.com --puppeteer --wait=20000

# Customize timeout and disable cache
bun run fetch https://example.com --timeout=60000 --no-cache
```

### Converter Module (`src/converter/`)

**Description**: Converts HTML content to clean Markdown format.

**How it works**:
- Uses Readability to extract the main content from HTML
- Removes noise like menus, sidebars, and ads
- Converts HTML to Markdown using Turndown
- Handles special cases like tables with custom rules

**Contract**:
```typescript
async function htmlToMarkdown(html: string): Promise<string>
function saveMarkdown(markdown: string, url: string): void
```
- **Input**: HTML content as a string, URL for file naming
- **Output**: Clean Markdown content as a string
- **Side effects**: Saves Markdown to filesystem

**Tests**:
```bash
# Run the converter tests
bun run test:converter
```

### Processor Module (`src/processor/`)

**Description**: Processes Markdown content to handle images and audio.

**How it works**:
- Identifies images and audio in Markdown content
- Downloads and saves media files locally
- Generates descriptions for images using OpenAI's API
- Transcribes audio using OpenAI's Whisper model
- Implements caching for processed content

**Contract**:
```typescript
async function processMarkdownContent(
  markdown: string,
  baseUrl: string,
  outputDir: string = 'output'
): Promise<string>
```
- **Input**: Markdown content, base URL, output directory
- **Output**: Processed Markdown with image descriptions and audio transcriptions
- **Side effects**: Downloads media files, creates cache files

**Tests**:
```bash
# Run the processor integration test
bun run test:processor:integration
```

### URL Utilities (`src/utils/url.ts`)

**Description**: Provides utilities for URL handling and file path conversion.

**How it works**:
- Converts URLs to file paths
- Extracts domains and paths from URLs
- Sanitizes file paths for filesystem compatibility

**Contract**:
```typescript
function urlToFilePath(url: string, baseDir: string = 'tmp'): string
function sanitizeFilePath(filePath: string): string
function extractDomain(url: string): string
function extractPath(url: string): string
function urlToDirPath(url: string, baseDir: string = 'tmp'): string
```
- **Input**: URL or file path
- **Output**: Converted file path or extracted components

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 
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

## Usage

```bash
# Run the script
bun start

# Run in development mode with hot reload
bun dev

# Build the project
bun build

# Fetch a URL directly
bun run fetch https://example.com
```

## Project Modules

Site Snacker is organized into several modules, each with a specific responsibility:

### Fetcher Module (`src/fetcher/`)

**Description**: Downloads HTML content from websites and caches it locally.

**How it works**:
- Uses Axios to fetch HTML content from URLs
- Converts URLs to file paths for caching
- Stores downloaded content in a `tmp/[domain]/[path]` structure
- Implements caching to avoid re-downloading the same content

**Contract**:
```typescript
async function fetchHtml(url: string, useCache: boolean = true): Promise<string>
```
- **Input**: URL to fetch, optional flag to use cache
- **Output**: HTML content as a string
- **Side effects**: Creates cache files in the filesystem

**Tests**:
```bash
# Run the integration test that verifies caching
bun run test:fetcher:integration

# Test with a custom URL
bun run test:fetcher:url https://your-custom-url.com

# Fetch a URL directly
bun run fetch https://your-custom-url.com
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
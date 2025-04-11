# Site Snacker

![Site Snacker](docs/site_snacker_logo_hz_sm.png)

The script snacks on websites and spits out tasty Markdown.

## Description

Site Snacker is a powerful tool that transforms web content into clean, accessible Markdown format. It goes beyond simple HTML conversion by:

- **Smart Content Extraction**: Uses reader mode to focus on what matters - main content, headings, and relevant sections while excluding navigation menus, sidebars, ads, and other distractions
- **AI-Powered Enhancements** (using OpenAI):
  - Automatically describes images, screenshots, and diagrams using GPT-4 Vision
  - Transcribes audio content using Whisper API when present in the page
- **Flexible Processing**:
  - Process a single webpage for quick documentation
  - Handle entire sitemaps to document full websites
  - Merge multiple pages into one cohesive document
- **Smart Fetching**:
  - Automatically detects Cloudflare-protected sites
  - Seamlessly switches to Puppeteer mode when needed
  - No manual intervention required for protected sites
- **Efficient Caching**:
  - Caches downloaded HTML, images, and audio files
  - Stores AI-generated descriptions and transcriptions
  - Skips re-processing of already processed content
  - Saves on API costs by reusing cached results

Built with TypeScript and Bun for optimal performance and developer experience.

## Prerequisites

- [Bun](https://bun.sh/) installed on your system
- Node.js (optional, but recommended for development tools)
- OpenAI API key (for GPT-4 Vision and Whisper API)

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

The fastest way to process a webpage is using the `snack` command. It works seamlessly with both single URLs and sitemaps:

```bash
# Process a single webpage (automatically handles Cloudflare protection)
bun run snack https://example.com

# Process a sitemap (automatically detects and processes all URLs)
bun run snack https://example.com/sitemap.xml

# Process a local sitemap file
bun run snack ./local-sitemap.xml

# You can still force Puppeteer mode if needed
bun run snack https://example.com --puppeteer
```

The script automatically detects whether you've provided a single URL or a sitemap and handles it appropriately. For Cloudflare-protected sites, it will automatically switch to Puppeteer mode without any manual intervention.

When processing a sitemap, you'll see detailed progress information:

```
=== Processing Sitemap ===
Found 34 URLs in sitemap

=== Processing URL 1/34 (2.9%) ===
URL: https://example.com/page1
...

=== Sitemap Processing Complete ===
Total URLs: 34
Successfully processed: 32
Failed: 2

Total Cost Summary:
=== URL 1: https://example.com/page1 ===
[Cost details for page 1]
...

Merged Markdown:
All pages have been merged into: output/merged/sitemap-merged.md
```

By default, when processing a sitemap, all markdown files are automatically merged into a single file in the `output/merged` directory. This merged file:
- Maintains the original order of pages from the sitemap
- Includes clear separators between pages
- Preserves breadcrumbs and source information
- Is perfect for uploading to ChatGPT or Claude projects

You can disable this merging behavior with the `--no-merge` option if you prefer to keep the files separate.

Alternatively, you can run each step separately:

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

After running these commands, the tool will generate:

### Output Files
The processed content will be available in the `output` directory:

```
output/
├── processed/           # Individual processed files
│   ├── page1.md        # Markdown with image descriptions
│   └── page2.md        # and audio transcriptions
└── merged/             # Combined documentation
    └── sitemap.md      # All pages merged into one file
```

Each processed markdown file includes:
- Clean, readable content
- AI-generated image descriptions
- Audio transcriptions (if available)
- Original source URL reference
- Generation timestamp

The merged output preserves all these features while combining multiple pages into a single document, perfect for use with AI assistants like ChatGPT or Claude.

For implementation details about temporary files and caching, see [Implementation Details](docs/IMPLEMENTATION.md).

### Handling Protected Sites

Site Snacker automatically handles Cloudflare-protected sites:

1. First attempts a standard fetch
2. If Cloudflare protection is detected, automatically switches to Puppeteer mode
3. Continues processing without requiring manual intervention

You can also force Puppeteer mode if you know a site needs it:

```bash
# Force Puppeteer mode
bun run snack https://example.com --puppeteer

# Customize Puppeteer behavior if needed
bun run snack https://example.com --puppeteer --wait=20000 --timeout=60000
```

### Merging Processed Files

If you need to merge multiple processed markdown files (especially when image descriptions are important), you can use the `merge:processed` command:

```bash
# Merge all processed files from the default directory (output/processed)
bun run merge:processed output/merged/all-files.md

# Merge files from a specific directory
bun run merge:processed output/merged/custom-merge.md output/processed/sitecore-search

# The script will preserve all image description tags
```

This is particularly useful when you need to ensure that image descriptions are properly preserved in the merged output.

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

# Run script integration tests
bun run test:fetch-url
bun run test:convert-url
bun run test:process-url

# Run all script integration tests
bun run test:scripts
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
# Site Snacker

![Site Snacker](docs/site_snacker_logo_hz.png)

The script snacks on websites and spits out tasty Markdown.

## Description

Site Snacker is a powerful tool that transforms web content into clean, accessible Markdown format. It goes beyond simple HTML conversion by:

- **Smart Content Extraction**: Uses reader mode to focus on what matters - main content, headings, and relevant sections while excluding navigation menus, sidebars, ads, and other distractions
- **AI-Powered Enhancements** (using OpenAI):
  - Automatically describes images, screenshots, and diagrams using multimodal AI
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
  - Smart image deduplication:
    - Uses checksums to identify duplicate images across pages
    - Maintains a central registry of image descriptions
    - Reuses AI-generated descriptions for identical images
    - Provides insights into image usage across pages

### Image Deduplication and Caching

Site Snacker implements a smart image deduplication system to optimize storage and API costs:

- **Checksum-based Detection**: 
  - Calculates unique checksums for each image
  - Identifies identical images even with different filenames
  - Maintains a central registry in `tmp/media-registry.json`

- **Description Reuse**:
  - Stores AI-generated descriptions with image checksums
  - Automatically reuses descriptions for identical images
  - Significantly reduces OpenAI API costs
  - Ensures consistent descriptions across pages

- **Usage Analytics**:
  - Tracks where each image appears across pages
  - Provides insights into image reuse patterns
  - Helps identify opportunities for content optimization
  - Example cache entry:
    ```json
    {
      "<image-hash>": {
        "description": "AI-generated description",
        "occurrences": [
          {
            "pagePath": "tmp/page1/images/image1.png",
            "originalUrl": "https://example.com/image1.png"
          },
          {
            "pagePath": "tmp/page2/images/different-name.png",
            "originalUrl": "https://example.com/different-name.png"
          }
        ]
      }
    }
    ```

This system ensures that each unique image is processed only once, regardless of how many times it appears across different pages.

Built with TypeScript and Bun for optimal performance and developer experience.

## Prerequisites

- [Bun](https://bun.sh/) installed on your system
- Node.js (optional, but recommended for development tools)
- OpenAI API key (for image descriptions and audio transcription)

## Configuration

Site Snacker uses a centralized configuration system through `site-snacker.config.yml`. This file contains all configurable settings for the application, including:

- OpenAI API settings:
  - Model configurations (gpt-4o, gpt-4o-mini, whisper-1)
  - Pricing information for cost tracking
  - API key configuration
- Module-specific configurations:
  - Processor settings for image and audio processing
  - Fetcher settings for HTTP requests and Cloudflare handling
  - Converter settings for markdown generation
  - Merger settings for file combination
- Directory paths for output and temporary files
- Sitemap processing options
- Cost tracking settings with configurable thresholds

The configuration is automatically loaded when the application starts, and all modules access their settings through the centralized configuration system. This ensures consistency across the application and makes it easy to modify settings in one place.

You can customize any of these settings by editing the `site-snacker.config.yml` file. For detailed configuration options, see [Implementation Details](docs/IMPLEMENTATION.md).

### Environment Variables

Some sensitive settings (like API keys) are loaded from environment variables. Create a `.env` file in the project root with:

```bash
OPENAI_API_KEY=your_api_key_here
```

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

# Process a local HTML file
bun run snack ./path/to/local/file.html

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

Site Snacker creates markdown files that capture the essence of the webpage:

- **Individual Pages**: Each page is stored in `output/pages/[domain]/[path].md`
- **Merged Content**: Optional combined markdown from sitemap processing stored in `output/merged/[sitemap-name]-merged.md`

Each processed markdown file includes:
- Clean, readable content
- AI-generated image descriptions
- Audio transcriptions (if available)
- Original source URL reference
- Generation timestamp
- HTML source code (for reference)

### Custom Tags
Site Snacker uses a standardized tag naming convention with the `md_` prefix for all custom tags:

- `<md_breadcrumb>` - Contains the page's breadcrumb navigation
- `<md_image-description src="image-url">` - Contains AI-generated descriptions of images, with the src attribute pointing to the original image URL
- `<md_audio-transcript src="audio-url">` - Contains AI-generated transcriptions of audio content, with the src attribute pointing to the original audio URL
- `<md_html-source>` - Contains the URL to the original HTML page
- `<md_html-title>` - Contains the title of the original HTML page
- `<md_last-modified>` - Contains the last modification date of the original HTML page in YYYY-MM-DD format

These tags are preserved in the merged output and can be used for post-processing or integration with other tools.

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

### Handling Failed URLs and Caching

The script implements a smart caching and retry system:

- **Successful URLs**: 
  - Content is cached in the `tmp` directory
  - On subsequent runs, cached content is used
  - No re-fetching of already processed URLs
  
- **Failed URLs**:
  - Only failed URLs are retried on subsequent runs
  - Successfully processed URLs are skipped (using cache)
  - You can retry a specific failed URL:
    ```bash
    # Retry a specific URL
    bun run snack https://example.com/failed-page.html
    
    # Increase timeout for challenging URLs
    bun run snack https://example.com/failed-page.html --timeout=120000
    ```

- **Automatic Remerging**:
  - When retrying a failed sitemap URL, if successful:
    - A new merged markdown file is automatically created
    - Includes all previously successful pages (from cache)
    - Maintains the original order and formatting
    - No manual intervention needed

- **Error Reporting**:
  - After processing a sitemap, a detailed error report is generated
  - Shows the number of failed URLs and their specific errors
  - Provides ready-to-use retry commands for each failed URL
  - Automatically suggests increased timeout for slow-loading pages
  - Example error report:
    ```
    === Error Report ===
    2 out of 10 URLs failed to process.

    Failed URLs:
    1. https://example.com/page1.html
      Error: Timeout after 60000ms
      Retry command: bun run snack "https://example.com/page1.html" --timeout=120000

    2. https://example.com/page2.html
      Error: Cloudflare challenge failed
      Retry command: bun run snack "https://example.com/page2.html" --timeout=120000
    ```

This ensures efficient processing of large sitemaps, as only problematic URLs need to be retried.

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
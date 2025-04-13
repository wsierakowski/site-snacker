# Implementation Details

## Module Architecture

### Fetcher Module
- Uses Axios for standard HTTP requests
- Implements Puppeteer for Cloudflare-protected sites
- Caches HTML content in tmp/[domain]/[path] structure
- Automatic fallback to Puppeteer when Cloudflare is detected
- Configurable retry mechanism and timeouts

### Converter Module
- Uses node-readability for content extraction
- Implements turndown for HTML to Markdown conversion
- Custom table conversion rules for proper formatting
- Breadcrumb extraction and conversion
- Proper escaping of special characters
- Standardized tag naming convention with `md_` prefix
- HTML source URL preservation in markdown output
- HTML title preservation in markdown output
- Last modification date extraction and preservation in markdown output

### Processor Module
- OpenAI Vision API for image descriptions
- OpenAI Whisper API for audio transcription
- File-based caching system
- Configurable model selection and prompts
- Cost tracking and reporting
- MediaRegistry for tracking and deduplicating media files
- Content-based hashing for efficient caching
- Automatic backup of registry files
- Cross-page media reuse to minimize API costs

### Merger Module
- Preserves image descriptions in merged output
- Uses processed files from output/processed directory
- Maintains original markdown structure
- Adds metadata and section headers
- Handles both single files and sitemaps

### Orchestrator Module
- Coordinates fetch, convert, and process operations
- Handles both single URLs and sitemaps
- Progress tracking and reporting
- Comprehensive error handling
- Cost summary generation

## Directory Structure

### Temporary Files (`tmp/`)
The `tmp` directory stores all intermediate files and caches:

```
tmp/
├── media-registry.json         # Central registry for all media files
├── media-registry.json.backup  # Backup of the registry file
└── [domain]/                   # Domain-specific content
    └── [path]/
        ├── [filename].html     # Cached HTML content
        ├── [filename].md       # Initial markdown conversion
        └── [filename]/         # Asset directory
            ├── uuid-xxxx.png   # Downloaded images
            ├── uuid-xxxx.md    # Image descriptions
            ├── uuid-xxxx.json  # Processing cache
            ├── uuid-xxxx.mp3   # Audio files
            └── uuid-xxxx.txt   # Audio transcriptions
```

For example, processing `https://doc.sitecore.com/search/en/users/search-user-guide/attributes.html` creates:
```text
tmp/
├── media-registry.json         # Central registry for all media files
├── media-registry.json.backup  # Backup of the registry file
└── doc.sitecore.com/
    └── search/
        └── en/
            └── users/
                └── search-user-guide/
                    ├── attributes.html      # Cached HTML
                    ├── attributes.md        # Initial markdown
                    └── attributes/          # Assets
                        ├── uuid-xxxx.png    # Image
                        ├── uuid-xxxx.md     # Description
                        └── uuid-xxxx.json   # Cache
```

### Media Registry Structure
The `media-registry.json` file contains a structured record of all processed media files:

```json
{
  "version": "1.0",
  "lastUpdated": "2023-06-15T12:34:56Z",
  "entries": {
    "hash-abc123def456": {
      "type": "image",
      "path": "tmp/doc.sitecore.com/search/en/users/search-user-guide/attributes/uuid-xxxx.png",
      "content": "A screenshot showing the attributes configuration panel with various options...",
      "metadata": {
        "originalUrl": "https://doc.sitecore.com/images/attributes.png",
        "altText": "Attributes configuration panel"
      },
      "apiCost": 0.00015,
      "occurrences": [
        "tmp/doc.sitecore.com/search/en/users/search-user-guide/attributes.md",
        "tmp/doc.sitecore.com/search/en/users/search-user-guide/advanced-attributes.md"
      ]
    },
    "hash-xyz789uvw123": {
      "type": "audio",
      "path": "tmp/doc.sitecore.com/search/en/users/search-user-guide/tutorial/uuid-yyyy.mp3",
      "content": "This tutorial covers the basic setup of Sitecore Search...",
      "metadata": {
        "originalUrl": "https://doc.sitecore.com/audio/tutorial.mp3",
        "linkText": "Tutorial Audio"
      },
      "apiCost": 0.006,
      "occurrences": [
        "tmp/doc.sitecore.com/search/en/users/search-user-guide/tutorial.md"
      ]
    }
  },
  "stats": {
    "totalEntries": 42,
    "imageEntries": 35,
    "audioEntries": 7,
    "totalApiCost": 0.125
  }
}
```

### Custom Tags with Source References
Site Snacker uses custom tags with source references to clearly associate descriptions and transcriptions with their original media files:

```markdown
![Image alt text](https://example.com/image.png)

<md_image-description src="https://example.com/image.png">AI-generated description of the image</md_image-description>

[Audio link text](https://example.com/audio.mp3)

<md_audio-transcript src="https://example.com/audio.mp3">AI-generated transcription of the audio</md_audio-transcript>

<md_html-source>https://example.com/page.html</md_html-source>
<md_html-title>Example Page Title</md_html-title>
<md_last-modified>2023-06-15</md_last-modified>
```

This approach ensures that each description or transcription is explicitly linked to its source media file, making it easier to understand which description corresponds to which image or audio file, especially in complex documents with multiple media elements.

### Source Code (`src/`)
```
src/
├── fetcher/      # HTML fetching and caching
├── converter/    # HTML to Markdown conversion
├── processor/    # Content processing (images, audio)
├── merger/       # Markdown file merging
├── orchestrator/ # Process coordination
└── utils/        # Shared utilities
```

### Other Directories
```
├── output/           # Final output
│   ├── processed/    # Processed markdown files
│   │   └── [domain]/ # Organized by domain
│   └── merged/       # Merged documentation
├── tmp/             # Temporary files and cache
└── docs/            # Documentation
```

## Configuration
The application uses a centralized configuration system through `site-snacker.config.yml`. This file contains all configurable settings and is automatically loaded when the application starts.

### Configuration Structure
```yaml
# OpenAI API Configuration
openai:
  # API key is read from .env file
  pricing:
    gpt-4o:
      input: 0.005   # $5 per 1M input tokens ($0.005 per 1K tokens)
      output: 0.015  # $15 per 1M output tokens ($0.015 per 1K tokens)
    gpt-4o-mini:
      input: 0.00015 # $0.15 per 1M input tokens ($0.00015 per 1K tokens)
      output: 0.0006 # $0.60 per 1M output tokens ($0.0006 per 1K tokens)
    whisper-1:
      per_minute: 0.006  # $0.006 per minute of audio

# Processor Module Configuration
processor:
  # Image Processing Configuration
  image:
    model: "gpt-4o-mini"  # Using gpt-4o-mini for image processing
    max_tokens: 500
    prompt: "Describe this image in detail..."
    markdown:
      description_tag: "md_image-description"
      error_prefix: "⚠️"
    directory: "images"

  # Audio Processing Configuration
  audio:
    model: "whisper-1"
    language: "en"
    response_format: "text"
    markdown:
      transcript_tag: "md_audio-transcript"
      error_prefix: "⚠️"
    directory: "audio"

# Fetcher Module Configuration
fetcher:
  cloudflare:
    wait_time: 15000
    timeout: 60000
    auto_detect: true
  puppeteer:
    viewport:
      width: 1920
      height: 1080
    user_agent: "Mozilla/5.0..."
    headers:
      accept_language: "en-US,en;q=0.9"
      accept: "text/html,application/xhtml+xml..."
  cache:
    enabled: true
    skip_domains: []

# Converter Module Configuration
converter:
  readability:
    use_reader_mode: true
  markdown:
    preserve_tables: true
    preserve_links: true
    preserve_images: true

# Directory Configuration
directories:
  base: "."
  output:
    base: "output"
    processed: "processed"
    merged: "merged"
  temp: "tmp"
  cache: "cache"

# Sitemap Module Configuration
sitemap:
  auto_merge: true
  parallel: false
  max_concurrent: 5

# Cost Tracking Configuration
cost_tracking:
  enabled: true
  warn_threshold: 10.0
  stop_threshold: 50.0
```

### Configuration Usage
- All modules access their settings through the centralized configuration system
- Environment variables are used for sensitive data (API keys)
- Directory paths are configurable but have sensible defaults
- Cost tracking can be enabled/disabled and thresholds configured
- Module-specific settings can be customized as needed
- Tag naming convention is standardized with the `md_` prefix

## Error Handling
- Network error recovery
- Cloudflare protection handling
- API rate limiting
- File system errors
- Processing failures

## Performance Considerations
- File-based caching
- Parallel processing
- Resource cleanup
- Memory management
- API usage optimization
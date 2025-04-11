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

### Processor Module
- OpenAI Vision API for image descriptions
- OpenAI Whisper API for audio transcription
- File-based caching system
- Configurable model selection and prompts
- Cost tracking and reporting

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
└── [domain]/                    # Domain-specific content
    └── [path]/
        ├── [filename].html      # Cached HTML content
        ├── [filename].md        # Initial markdown conversion
        └── [filename]/          # Asset directory
            ├── uuid-xxxx.png    # Downloaded images
            ├── uuid-xxxx.md     # Image descriptions
            ├── uuid-xxxx.json   # Processing cache
            ├── uuid-xxxx.mp3    # Audio files
            └── uuid-xxxx.txt    # Audio transcriptions
```

For example, processing `https://doc.sitecore.com/search/en/users/search-user-guide/attributes.html` creates:
```text
tmp/
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
  apiKey: ${OPENAI_API_KEY}
  models:
    gpt4o:
      name: "gpt-4o"
      pricing:
        input: 0.00001
        output: 0.00003
    gpt4oMini:
      name: "gpt-4o-mini"
      pricing:
        input: 0.000005
        output: 0.000015
    whisper:
      name: "whisper-1"
      pricing: 0.006

# Module-specific Settings
processor:
  image:
    model: "gpt-4o"
    prompt: "Describe this image in detail..."
  audio:
    model: "whisper-1"
    language: "en"

fetcher:
  http:
    timeout: 60000
    retries: 3
  puppeteer:
    timeout: 120000
    headless: true

converter:
  tableRules: true
  breadcrumbs: true

merger:
  preserveImages: true
  addMetadata: true

# Directory Configuration
directories:
  base: "."
  output:
    base: "output"
    processed: "processed"
    merged: "merged"
  temp: "tmp"
  cache: "cache"

# Cost Tracking
costTracking:
  enabled: true
  warningThreshold: 1.0
  errorThreshold: 5.0
```

### Configuration Usage
- All modules access their settings through the centralized configuration system
- Environment variables are used for sensitive data (API keys)
- Directory paths are configurable but have sensible defaults
- Cost tracking can be enabled/disabled and thresholds configured
- Module-specific settings can be customized as needed

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
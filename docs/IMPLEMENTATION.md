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
│   └── merged/       # Merged documentation
└── docs/             # Documentation
```

## Configuration
- Environment variables for API keys
- YAML-based configuration files
- Configurable processing options
- Model selection and parameters
- Cache settings

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
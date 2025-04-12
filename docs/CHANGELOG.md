# Changelog

This document tracks the progress of the Site Snacker project compared to the original plan in PLAN.md.

## Current Status

### Completed
- ✅ Basic project structure
- ✅ Core modules (fetcher, processor, merger)
- ✅ CLI interface
- ✅ Configuration management
- ✅ Documentation
- ✅ Orchestrator module
- ✅ Sitemap support
- ✅ Image description preservation in merger
- ✅ Centralized configuration system
- ✅ Directory structure standardization

### In Progress
- 🔄 Testing
- 🔄 Error handling improvements
- 🔄 Performance optimization

### Not Started
- ⏳ Advanced features (audio, video)
- ⏳ UI improvements
- ⏳ Deployment

## Detailed Changes

### Documentation Updates
- Updated PLAN.md to reflect the current state of the project:
  - Added Merger and Sitemap modules to the module architecture
  - Updated the file structure to match the actual implementation
  - Added checkmarks (✅) to completed implementation phases
  - Updated configuration details to reflect YAML format
  - Added details about the directory structure with domain-based organization
- Updated README.md to reflect the correct directory structure:
  - Clarified that processed files are organized by domain
  - Enhanced the configuration section with more details
  - Added information about automatic remerging after retrying failed URLs
- Updated IMPLEMENTATION.md with detailed configuration examples:
  - Added a complete YAML configuration example
  - Added a configuration usage section
  - Updated the directory structure to match the actual implementation

### Configuration System
- Created centralized configuration file `site-snacker.config.yml`
- Implemented TypeScript interfaces for configuration types
- Created singleton ConfigLoader class in `src/config/index.ts`
- Added convenience methods for module-specific configuration access
- Updated all modules to use the new configuration system:
  - Fetcher module now uses configuration for headers, timeouts, and Cloudflare settings
  - Puppeteer module now uses configuration for viewport, user agent, and headers
  - Converter module now uses configuration for markdown settings and directory paths
  - Merger module now uses configuration for directory paths
  - Sitemap module now uses configuration for parallel processing and user agent
  - Orchestrator module now uses configuration for all module settings and paths
- Updated image processing to use gpt-4o-mini model instead of deprecated gpt-4-vision-preview
- Updated OpenAI pricing configuration with current model rates:
  - Added gpt-4o pricing ($5/1M input tokens, $15/1M output tokens)
  - Added gpt-4o-mini pricing ($0.15/1M input tokens, $0.60/1M output tokens)
  - Maintained whisper-1 pricing ($0.006 per minute)

### HTML Fetcher Module
- Implemented `fetchHtml` function that takes a URL and returns HTML content
- Added caching mechanism that stores HTML in tmp/[domain]/[path] structure
- Implemented error handling for network issues and timeouts
- Added user-agent and other headers to avoid being blocked
- Cleaned up unused imports and improved code organization
- Updated to use mkdirp for directory creation

### URL Utilities Module
- Created shared utilities for URL handling
- Implemented `urlToFilePath` function to convert URLs to file paths
- Added `sanitizeFilePath` function to ensure valid file paths
- Implemented `extractDomain` and `extractPath` functions
- Added `urlToDirPath` function for directory path creation

### HTML to Markdown Converter Module
- Implemented basic HTML to Markdown conversion using node-readability and turndown
- Added custom table conversion rules to properly handle HTML tables
- Implemented proper escaping of pipe characters in table content
- Added support for table headers and data rows
- Ensured proper spacing around tables in the output
- Improved table cell formatting to add spacing between descriptions and examples

### Content Processor Module

### Caching System
- Implemented file-based caching for image descriptions
- Added cache directory structure alongside temporary files
- Changed cache keys to use URL-based file paths instead of MD5 hashes
- Added timestamp and model information to cache entries
- Added cache hit/miss logging
- Ensured cache directories are created as needed

### Modularization
- Split the processor module into separate modules for better organization
- Created separate modules for image and audio processing
- Added configuration file (processor.conf.yml) for centralized configuration
- Added type definitions for processor configuration
- Made model names and prompts configurable through the configuration file

### Image Processing
- Implemented image processing functionality in the content processor module
- Added support for downloading and saving images from markdown content
- Integrated with OpenAI's multimodal model for generating image descriptions
- Added error handling for image processing failures
- Increased max_tokens from 500 to 1000 for more detailed descriptions

### Audio Processing
- Implemented audio processing functionality in the content processor module
- Added support for downloading and saving audio files from markdown content
- Integrated with OpenAI's Whisper model for audio transcription
- Added error handling for audio processing failures
- Added detection of audio files by extension (.mp3, .wav, .ogg, .m4a, .aac)

## Next Steps
- Implement audio processing in the content processor module
- Begin work on the orchestrator module
- Implement token monitoring functionality

## [Unreleased]

### Changed
- Modified `convert-url.ts` to save markdown files to tmp directory instead of output
- Improved file organization by keeping intermediate files in tmp directory
- Fixed function name conflicts in processor module by removing local function declarations for `processImages` and `processAudio`
- Updated fetcher code to properly use `mkdirp` library and removed unused imports
- Fixed mkdirp import to use named import instead of default import
- Cleaned up fetcher module by removing unused imports (JSDOM, writeFile, urlToDirPath)
- Improved directory creation in fetcher module by using mkdirp consistently
- Added test scripts to package.json for easier test execution
- Added comprehensive module documentation to README.md
- Added custom URL test option for fetcher module
- Added direct URL fetcher script for quick access
- Removed redundant test-fetcher.ts file to reduce confusion
- Enhanced fetcher module with Cloudflare protection handling
- Added retry mechanism with configurable attempts and delays
- Added specialized headers for Cloudflare-protected sites
- Improved error handling for Cloudflare challenges
- Added command-line options to fetch-url.ts script
- Implemented Puppeteer-based fetching for Cloudflare-protected sites
- Removed redundant test-fetcher-url.ts in favor of fetch-url.ts
- Updated documentation to reflect new Puppeteer-based Cloudflare handling
- Simplified command-line interface with automatic Cloudflare detection
- Moved `fetch-url.ts` from root directory to `scripts/` directory for better organization
- Updated `package.json` scripts to reflect the new location of `fetch-url.ts`
- Simplified `fetch-url.ts` to use `fetchHtml` and `processMarkdownContent` directly
- Added proper directory creation for output files in `fetch-url.ts`
- Updated package.json scripts for better organization and clarity
- Added new `fetch:puppeteer` script for explicit Puppeteer mode
- Reorganized README.md usage section with clear command categories
- Fixed test:fetcher script path to point to integration tests
- Improved documentation of available test commands
- Updated package.json scripts for better organization and clarity
- Added new `fetch:puppeteer` script for explicit Puppeteer mode
- Reorganized README.md usage section with clear command categories
- Fixed test:fetcher script path to point to integration tests
- Improved documentation of available test commands
- Improved converter code with better error handling and code organization
- Extracted common directory creation logic in converter module
- Fixed JSDoc comments in converter module
- Refactored processor module to use shared utilities
- Fixed OpenAI client initialization and configuration loading
- Updated YAML parsing to use js-yaml instead of yaml package
- Improved type safety in processor module
- Fixed linter errors in processor module
- Corrected OpenAI API key configuration access
- Resolved code duplication in image and audio processing
- New `utils.ts` file in processor module with shared functionality
- Improved error handling in processor module
- Enabled audio processing in main processor module
- New `process-url.ts` script for processing cached markdown content
- Added `process` command to package.json for easy access to markdown processing
- Updated ProcessorConfig interface in types.ts to match processor.conf.yml structure
- Removed duplicate ProcessorConfig interface from image.ts to use the one from types.ts
- Removed OpenAI API key from processor.conf.yml in favor of using OPENAI_API_KEY environment variable
- Fixed inconsistent environment variable name (OPEN_AI_API_KEY -> OPENAI_API_KEY)
- Added environment variable validation for OPENAI_API_KEY
- Added feature to save image descriptions as separate markdown files alongside the images
- Separated fetch and process functionality in fetch-url.ts script to maintain single responsibility
- Updated fetch-url.ts to only handle HTML fetching and caching
- Removed redundant output directory creation from fetch script, now only uses tmp directory for caching
- Added OpenAI API cost tracking and reporting in processor module
- Updated process-url.ts to display cost summary after processing
- Updated image processor to use model from config instead of hardcoding "gpt-4-vision-preview"
- Fixed image model name in processor.conf.yml from "gpt-4o" to "gpt-4-vision-preview"
- Moved fetch-url.ts script to scripts directory for better organization
- Added new "fetch" script to package.json for direct URL fetching
- Updated README.md with fetch script usage instructions
- Updated converter module to use 'tmp' as the default output directory instead of 'output'
- Fixed urlToFilePath function to always add .html extension when not present
- Added integration tests for fetch-url.ts script
- Added integration tests for convert-url.ts script
- Added integration tests for process-url.ts script
- Added new test scripts to package.json for running script integration tests
- Image processing caching mechanism to avoid redundant processing of the same images
- Cache directory structure for storing image descriptions
- Cache validation based on the OpenAI model version
- Test cases to verify caching functionality
- Updated image processing to check cache before generating new descriptions
- Improved error handling in image processing to maintain original markdown on failure
- Enhanced logging to indicate when cached descriptions are being used
- Added support for relative image URLs in Next.js and other frameworks
- Modified audio file processing to match image handling pattern:
  - Audio files are now stored directly in the page directory
  - Using UUIDs from URLs when available
  - Saving transcriptions in MD files alongside audio files
  - Cache files are stored in the same directory
  - Improved error handling and logging
- Re-enabled OpenAI API calls for image and audio processing
- Fixed cost tracking for Vision API calls
- Updated process-url.ts script to accept HTML URLs directly instead of requiring markdown file paths
- Simplified URL handling in process-url.ts to be consistent with fetch and convert scripts
- Reorganized directory structure for better organization:
  - All page assets (images, audio, descriptions, cache) are now stored in a directory named after the page
  - Using consistent naming with UUIDs across all asset types
  - Improved file organization documentation in README.md
- Fixed URL handling in process-url.ts to properly handle HTML extensions
- Updated process-url.ts script to accept HTML URLs directly instead of requiring markdown file paths
- Simplified URL handling in process-url.ts to be consistent with fetch and convert scripts
- Re-enabled OpenAI API calls for image and audio processing
- Fixed cost tracking for Vision API calls
- Modified audio file processing to match image handling pattern:
  - Audio files are now stored directly in the page directory
  - Using UUIDs from URLs when available
  - Saving transcriptions in MD files alongside audio files
  - Cache files are stored in the same directory
  - Improved error handling and logging
- New orchestrator module to coordinate fetch, convert, and process operations:
  - Single command to process a webpage end-to-end
  - Detailed progress logging
  - Comprehensive error handling
  - Returns paths to all generated files
- New `snack` command for one-step webpage processing
- Added orchestrator documentation to README.md
- Automatic Puppeteer fallback in orchestrator when Cloudflare protection is detected:
  - First attempts standard fetch with Cloudflare headers
  - If Cloudflare protection is detected, automatically retries with Puppeteer
  - Uses increased timeouts and wait times for automatic fallback
  - Still allows explicit Puppeteer usage via --puppeteer flag
- Sitemap support:
  - Added ability to process XML sitemaps (both remote and local files)
  - Support for sitemap index files that contain multiple sitemaps
  - Automatic detection of sitemap URLs and files
  - Batch processing of all URLs in a sitemap
  - Detailed progress tracking and cost summary for sitemap processing
  - Updated CLI to handle both single URLs and sitemaps
- Enhanced merger module to properly preserve image descriptions:
  - Added debugging to identify missing image descriptions
  - Implemented fix to ensure image descriptions are included in merged output
  - Added verification to confirm image descriptions are preserved
  - Improved logging to track image description processing
- Fixed merger to use processed files instead of markdown files:
  - Now uses the processed files from output/processed directory
  - These files already contain the image description tags
  - Ensures image descriptions are preserved in the merged output
  - Added logging to track which files are being used
- Updated processor module to use centralized configuration system:
  - Removed module-specific configuration files (processor.conf.yml)
  - Updated image processor to use global config
  - Updated audio processor to use global config
  - Fixed configuration access in both processors
  - Improved type safety in configuration usage
- Removed default OpenAI model in favor of module-specific models:
  - Removed `default_model` from openai configuration
  - Updated image processor to use `gpt-4-vision-preview` model
  - Each module now explicitly specifies its required model
  - Improved clarity in model selection for each task
- Moved OpenAI API pricing to configuration file:
  - Added pricing section to openai configuration
  - Updated cost tracker to use pricing from configuration
  - Made pricing information configurable and maintainable
  - Improved type safety for pricing configuration
  - Fixed property name consistency (perMinute → per_minute)
- Updated tag naming convention to use `md_` prefix for all custom tags:
  - `<breadcrumb>` → `<md_breadcrumb>`
  - `<image_description>` → `<md_image-description>`
  - `<audio_transcript>` → `<md_audio-transcript>`
  - Added new `<md_html-source>` tag
- Improved error handling in sitemap processing
- Enhanced caching system for processed content

### Fixed
- Resolved duplicate ProcessorConfig interface definition
- Fixed mkdirp import to use named import
- Corrected OpenAI API types in image processor
- Removed duplicate function declarations in processor/index.ts
- Fixed issue with processing relative image URLs (like those from Next.js)
- Improved URL resolution for images with relative paths
- Fixed image cache file extensions to use .json instead of .html
- Fixed issue with directory creation when processing URLs with .html extension
- Fixed image filename handling to properly use UUIDs from URLs
- Fixed audio filename handling to match image processing pattern
- Fixed issue with image descriptions not being preserved in merged markdown files
- Fixed merger to use processed files that already contain image descriptions
- Resolved circular dependency issues in processor module:
  - Restructured imports to avoid initialization errors
  - Moved configuration initialization to the top of index.ts
  - Updated image and audio processors to import config directly
  - Fixed costTracker initialization in each module
  - Improved module organization for better dependency management
- Fixed directory structure to ensure processed and merged files are in the output directory
- Fixed error handling in the processor module

### Added
- Implemented audio processing functionality in content processor module
- Added integration test for processor module
- Added caching mechanism for processed content
- Added test scripts for fetcher module in package.json
- Added detailed documentation for each module in README.md
- Added direct URL fetcher script for quick access to the fetcher module
- Added Cloudflare detection and handling capabilities
- Added Puppeteer-based fetching for Cloudflare-protected sites
- Added automatic fallback to Puppeteer when Cloudflare is detected
- Added configurable wait times for Cloudflare challenges
- Added integration test for converter module (`tests/integration/converter.test.ts`)
- Added `convert-url.ts` script for converting HTML to Markdown
- Added `convert` command to package.json
- Added `test:converter` command to package.json
- Added documentation for converter test and convert-url script in README.md
- New `process-url.ts` script for processing cached markdown content
- Added `process` command to package.json for easy access to markdown processing
- New cost-tracker.ts module for tracking OpenAI API usage and costs
- Cost estimation for GPT-4 Vision and Whisper API calls
- Detailed cost breakdown in processing output
- New breadcrumb extraction functionality in converter module:
  - Added breadcrumb-extractor.ts helper module
  - Support for common breadcrumb selectors
  - Automatic extraction of breadcrumb navigation
  - Conversion of breadcrumbs to markdown format
  - Integration with main converter module
- Centralized configuration system using `site-snacker.config.yml`
- Documentation for configuration system in README.md
- Environment variables support for sensitive settings
- Added error reporting for failed URLs in sitemap processing
- Added HTML source tag to markdown output

### Removed
- Removed redundant test-fetcher.ts file
- Removed test-fetcher-url.ts in favor of unified fetch-url.ts
- Removed fetch-page.ts in favor of more capable fetch-url.ts
- Removed outdated Cloudflare header-based approach
- Removed retry mechanism in favor of Puppeteer-based solution

### Tested
- Verified HTML to Markdown conversion with test URL
- Confirmed proper async/await handling
- Validated output formatting and file saving
- Tested table conversion with various table structures
- Tested image processing with sample markdown
- Tested fetcher module with example.com and hahment.com URLs
- Tested Puppeteer-based fetching with Cloudflare-protected sites
- Verified automatic fallback to Puppeteer when needed

### Added
- Orchestrator module for coordinating URL processing
- Sitemap support with progress tracking
- Support for both remote and local sitemaps
- Progress display with percentage completion
- Comprehensive documentation for sitemap usage

### Changed
- Enhanced merger module to preserve image descriptions
  - Added debugging and verification steps
  - Improved logging for image description preservation
  - Merger now uses processed files from output/processed directory
  - Image description tags are now included in merged output
- Fixed duplicate ProcessorConfig interface definitions
- Fixed image filename handling in processor
- Fixed audio filename handling in processor
- Updated documentation with sitemap usage examples

### Fixed
- Image description preservation in merged output
- Sitemap URL validation and error handling
- Progress display formatting
- Documentation clarity and completeness

### Documentation
- Added sitemap usage examples to README
- Added progress output examples
- Updated CLI documentation with sitemap support
- Added troubleshooting section for common issues
- Added examples for different sitemap types
- Added best practices for large sitemaps
- Added image description preservation documentation

## [0.1.0] - 2023-01-01

### Added
- Initial release
- Basic HTML to Markdown conversion
- Image description generation using OpenAI Vision API
- Audio transcription using OpenAI Whisper API
- Sitemap processing
- Cloudflare protection handling
- Caching system for downloaded content

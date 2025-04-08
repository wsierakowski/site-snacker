# Changelog

This document tracks the progress of the Site Snacker project compared to the original plan in PLAN.md.

## Current Status

### Completed
- Set up basic project structure
- Implemented HTML fetcher module with Axios
- Created URL utilities module for URL-to-path conversion
- Implemented file-based caching in tmp directory with URL-based structure
- Implemented HTML to Markdown converter with table support
- Implemented content processor module for image processing

### In Progress
- Content processor module for audio processing
- Orchestrator module

### Not Started
- Token monitor module
- Configuration module
- Website crawling functionality

## Detailed Changes

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

### Added
- Implemented audio processing functionality in content processor module
- Added integration test for processor module
- Added caching mechanism for processed content
- Added test scripts for fetcher module in package.json
- Added detailed documentation for each module in README.md
- Added new test script for testing fetcher with custom URLs
- Added direct URL fetcher script for quick access to the fetcher module

### Tested
- Verified HTML to Markdown conversion with test URL
- Confirmed proper async/await handling
- Validated output formatting and file saving
- Tested table conversion with various table structures
- Tested image processing with sample markdown
- Tested fetcher module with example.com and hahment.com URLs

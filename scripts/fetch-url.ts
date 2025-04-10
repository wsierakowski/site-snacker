#!/usr/bin/env bun

import { fetchHtml } from '../src/fetcher';
import { fetchWithPuppeteer } from '../src/fetcher/puppeteer';
import path from 'path';
import { urlToFilePath } from '../src/utils/url.js';

/**
 * Simple script to fetch a URL directly using the fetcher module
 */
async function main() {
  const args = process.argv.slice(2);
  const url = args[0];
  const usePuppeteer = args.includes('--puppeteer');

  if (!url) {
    console.error('Please provide a URL to fetch');
    console.error('Usage: bun run fetch <url> [--puppeteer]');
    process.exit(1);
  }

  try {
    console.log(`Fetching ${url}${usePuppeteer ? ' using Puppeteer' : ''}...`);
    
    // fetchHtml and fetchWithPuppeteer both handle caching automatically
    const html = usePuppeteer ? 
      await fetchWithPuppeteer(url) : 
      await fetchHtml(url);
    
    const cacheFile = urlToFilePath(url);
    console.log('Content fetched and cached successfully!');
    console.log(`Cached at: ${cacheFile}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 
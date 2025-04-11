#!/usr/bin/env bun

import { orchestrate } from '../src/orchestrator';

/**
 * Script to process a URL through the entire Site Snacker pipeline
 * Usage: bun snack-url.ts <url> [--puppeteer] [--wait=20000] [--timeout=60000] [--no-cache]
 */
async function main() {
  const args = process.argv.slice(2);
  const url = args[0];

  if (!url) {
    console.error('Please provide a URL to process');
    console.error('\nUsage: bun snack-url.ts <url> [--puppeteer] [--wait=20000] [--timeout=60000] [--no-cache]');
    process.exit(1);
  }

  // Parse command line options
  const options = {
    usePuppeteer: args.includes('--puppeteer'),
    waitTime: parseInt(args.find(arg => arg.startsWith('--wait='))?.split('=')[1] || '20000'),
    timeout: parseInt(args.find(arg => arg.startsWith('--timeout='))?.split('=')[1] || '60000'),
    useCache: !args.includes('--no-cache')
  };

  try {
    const result = await orchestrate(url, options);
    process.exit(0);
  } catch (error: any) {
    console.error('\nFatal error:', error.message);
    process.exit(1);
  }
}

main(); 
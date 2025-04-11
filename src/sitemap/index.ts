import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { extractDomain } from '../utils/url.js';
import * as fs from 'fs';
import * as path from 'path';
import { getFetcherConfig, getSitemapConfig } from '../config';

// Get configuration
const fetcherConfig = getFetcherConfig();
const sitemapConfig = getSitemapConfig();

interface SitemapURL {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

interface SitemapIndex {
  sitemapindex: {
    sitemap: SitemapURL[];
  };
}

interface Sitemap {
  urlset: {
    url: SitemapURL[];
  };
}

/**
 * Fetches and parses a sitemap from either a URL or a local file path
 * @param source The URL or local file path of the sitemap
 * @returns Array of URLs from the sitemap
 */
export async function parseSitemap(source: string): Promise<string[]> {
  try {
    let xmlContent: string;
    
    // Check if source is a local file path
    if (fs.existsSync(source)) {
      console.log(`Reading sitemap from local file: ${source}`);
      xmlContent = fs.readFileSync(source, 'utf-8');
    } else {
      // Treat as URL
      console.log(`Fetching sitemap from URL: ${source}`);
      const response = await axios.get(source, {
        headers: {
          'User-Agent': fetcherConfig.puppeteer.user_agent,
          'Accept': 'application/xml, text/xml, */*',
        }
      });
      xmlContent = response.data;
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });

    const parsed = parser.parse(xmlContent);
    const urls: string[] = [];

    // Handle sitemap index files
    if ('sitemapindex' in parsed) {
      const sitemapIndex = parsed as SitemapIndex;
      console.log(`Found sitemap index with ${sitemapIndex.sitemapindex.sitemap.length} sitemaps`);
      
      // Process each sitemap in the index
      if (sitemapConfig.parallel) {
        // Process sitemaps in parallel with a limit on concurrent requests
        const chunks = [];
        for (let i = 0; i < sitemapIndex.sitemapindex.sitemap.length; i += sitemapConfig.max_concurrent) {
          const chunk = sitemapIndex.sitemapindex.sitemap.slice(i, i + sitemapConfig.max_concurrent);
          chunks.push(chunk);
        }

        for (const chunk of chunks) {
          const chunkResults = await Promise.all(
            chunk.map(sitemap => parseSitemap(sitemap.loc))
          );
          urls.push(...chunkResults.flat());
        }
      } else {
        // Process sitemaps sequentially
        for (const sitemap of sitemapIndex.sitemapindex.sitemap) {
          const sitemapUrls = await parseSitemap(sitemap.loc);
          urls.push(...sitemapUrls);
        }
      }
    }
    // Handle regular sitemap files
    else if ('urlset' in parsed) {
      const sitemap = parsed as Sitemap;
      console.log(`Found sitemap with ${sitemap.urlset.url.length} URLs`);
      
      // Extract URLs from the sitemap
      for (const url of sitemap.urlset.url) {
        urls.push(url.loc);
      }
    }
    else {
      throw new Error('Invalid sitemap format');
    }

    return urls;
  } catch (error: any) {
    throw new Error(`Failed to parse sitemap: ${error.message}`);
  }
}

/**
 * Checks if a source is a sitemap
 * @param source The URL or file path to check
 * @returns True if the source is likely a sitemap
 */
export function isSitemapSource(source: string): boolean {
  try {
    // Check if it's a local file
    if (fs.existsSync(source)) {
      return source.toLowerCase().endsWith('.xml');
    }
    
    // Check if it's a URL
    const domain = extractDomain(source);
    return source.toLowerCase().includes('sitemap') || 
           source.toLowerCase().endsWith('.xml') ||
           domain.includes('sitemap');
  } catch {
    return false;
  }
} 
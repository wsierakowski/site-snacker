import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { extractDomain } from '../utils/url.js';
import * as fs from 'fs';
import * as path from 'path';
import { getFetcherConfig, getSitemapConfig } from '../config';
import { fetchWithPuppeteer } from '../fetcher/puppeteer.js';

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
 * Extracts sitemap URL from HTML content
 * @param html HTML content that might contain a sitemap link
 * @returns The sitemap URL if found, null otherwise
 */
function extractSitemapUrlFromHtml(html: string): string | null {
  // Look for common sitemap link patterns in HTML
  const sitemapLinkRegex = /<link[^>]*rel=["']sitemap["'][^>]*href=["']([^"']+)["'][^>]*>/i;
  const match = html.match(sitemapLinkRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Also check for sitemap in robots.txt link
  const robotsLinkRegex = /<a[^>]*href=["']([^"']*robots\.txt)["'][^>]*>/i;
  const robotsMatch = html.match(robotsLinkRegex);
  
  if (robotsMatch && robotsMatch[1]) {
    return robotsMatch[1];
  }
  
  return null;
}

/**
 * Extracts URLs from HTML content
 * @param html HTML content to extract URLs from
 * @param baseUrl Base URL for resolving relative links
 * @returns Array of extracted URLs
 */
function extractUrlsFromHtml(html: string, baseUrl: string): string[] {
  // Make sure we have the base URL for resolving relative links
  const baseUrlObj = new URL(baseUrl);
  
  // Use a simple regex to extract links from the HTML
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/g;
  const links: string[] = [];
  let match;
  
  // Debug: Log the HTML content length
  console.log(`HTML content length: ${html.length} characters`);
  
  // Try a more comprehensive approach to extract links
  // First try the regex approach
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    // Skip anchors, javascript, and other non-HTTP links
    if (href.startsWith('#') || href.startsWith('javascript:') || 
        href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }
    
    // Make sure the URL is absolute
    try {
      const absoluteUrl = new URL(href, baseUrlObj.origin).toString();
      links.push(absoluteUrl);
    } catch (e) {
      // Skip invalid URLs
    }
  }
  
  // If regex approach didn't find links, try a more aggressive approach
  if (links.length === 0) {
    console.log("Regex approach didn't find links, trying a more aggressive approach...");
    
    // Look for any href attribute in the HTML
    const hrefRegex = /href=["']([^"']+)["']/gi;
    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1];
      // Skip anchors, javascript, and other non-HTTP links
      if (href.startsWith('#') || href.startsWith('javascript:') || 
          href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }
      
      // Make sure the URL is absolute
      try {
        const absoluteUrl = new URL(href, baseUrlObj.origin).toString();
        links.push(absoluteUrl);
      } catch (e) {
        // Skip invalid URLs
      }
    }
  }
  
  // If still no links, try to extract URLs from the page content
  if (links.length === 0) {
    console.log("Still no links found, trying to extract URLs from page content...");
    
    // Look for URLs in the text content
    const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
    while ((match = urlRegex.exec(html)) !== null) {
      const url = match[1];
      try {
        // Validate the URL
        new URL(url);
        links.push(url);
      } catch (e) {
        // Skip invalid URLs
      }
    }
  }
  
  // Debug: Log the number of links found
  console.log(`Found ${links.length} links in the HTML content`);
  
  if (links.length > 0) {
    // Filter out non-content URLs
    const filteredLinks = links.filter(url => {
      // Skip XML/HTML namespace URLs
      if (url.includes('www.w3.org') || 
          url.includes('www.sitemaps.org') ||
          url.includes('www.w3.org/TR') ||
          url.includes('www.w3.org/1999') ||
          url.includes('www.w3.org/2000')) {
        return false;
      }
      
      // Skip data URLs
      if (url.startsWith('data:')) {
        return false;
      }
      
      // Skip fragment identifiers
      if (url.includes('#')) {
        return false;
      }
      
      // Skip non-HTTP(S) URLs
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return false;
      }
      
      return true;
    });
    
    console.log(`Filtered out ${links.length - filteredLinks.length} non-content URLs`);
    console.log(`Extracted ${filteredLinks.length} content URLs from the HTML page`);
    
    // Log the first 5 links for debugging
    if (filteredLinks.length > 0) {
      console.log("First 5 content links:", filteredLinks.slice(0, 5));
    }
    
    return filteredLinks;
  }
  
  return [];
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
      console.log(`Reading from local file: ${source}`);
      
      // Check if it's an HTML file
      if (source.toLowerCase().endsWith('.html') || source.toLowerCase().endsWith('.htm')) {
        console.log(`Detected local HTML file: ${source}`);
        const htmlContent = fs.readFileSync(source, 'utf-8');
        
        // Extract URLs from the HTML
        const baseUrl = `file://${path.resolve(source)}`;
        const links = extractUrlsFromHtml(htmlContent, baseUrl);
        
        if (links.length > 0) {
          console.log(`Extracted ${links.length} URLs from the local HTML file`);
          return links;
        } else {
          throw new Error('No URLs found in the local HTML file');
        }
      } else {
        // Assume it's an XML file (sitemap)
        console.log(`Reading sitemap from local file: ${source}`);
        xmlContent = fs.readFileSync(source, 'utf-8');
      }
    } else {
      // Treat as URL
      console.log(`Fetching sitemap from URL: ${source}`);
      try {
        // First try with standard HTTP request
        const response = await axios.get(source, {
          headers: {
            'User-Agent': fetcherConfig.puppeteer.user_agent,
            'Accept': 'application/xml, text/xml, */*',
          }
        });
        xmlContent = response.data;
      } catch (error: any) {
        // If we get a 403 or Cloudflare error, try with Puppeteer
        if (error.response?.status === 403 || 
            error.message.includes('Cloudflare') || 
            error.message.includes('challenge')) {
          console.log('Cloudflare protection detected, using Puppeteer to fetch sitemap...');
          const htmlContent = await fetchWithPuppeteer(source, {
            useCache: false, // Don't cache sitemap content
            waitTime: fetcherConfig.cloudflare.wait_time,
            timeout: fetcherConfig.cloudflare.timeout
          });
          
          // Debug: Log the first 1000 characters of the HTML content
          console.log("HTML content received (first 1000 chars):", htmlContent.substring(0, 1000));
          
          // Check if we got HTML instead of XML
          if (htmlContent.trim().toLowerCase().startsWith('<!doctype html') || 
              htmlContent.trim().toLowerCase().startsWith('<html')) {
            console.log('Received HTML instead of XML. Attempting to extract sitemap URL...');
            
            // Try to extract sitemap URL from the HTML
            const sitemapUrl = extractSitemapUrlFromHtml(htmlContent);
            
            if (sitemapUrl) {
              console.log(`Found sitemap URL in HTML: ${sitemapUrl}`);
              
              // Make sure the URL is absolute
              const baseUrl = new URL(source);
              const absoluteSitemapUrl = new URL(sitemapUrl, baseUrl.origin).toString();
              
              // Try to fetch the sitemap directly
              try {
                const sitemapResponse = await axios.get(absoluteSitemapUrl, {
                  headers: {
                    'User-Agent': fetcherConfig.puppeteer.user_agent,
                    'Accept': 'application/xml, text/xml, */*',
                  }
                });
                xmlContent = sitemapResponse.data;
              } catch (sitemapError: any) {
                // If direct fetch fails, try with Puppeteer
                console.log(`Direct fetch failed, trying with Puppeteer: ${sitemapError.message}`);
                xmlContent = await fetchWithPuppeteer(absoluteSitemapUrl, {
                  useCache: false,
                  waitTime: fetcherConfig.cloudflare.wait_time,
                  timeout: fetcherConfig.cloudflare.timeout
                });
              }
            } else {
              // If we can't find a sitemap URL, try to extract URLs from the HTML
              console.log('No sitemap URL found in HTML. Attempting to extract URLs from the page...');
              
              // Make sure we have the base URL for resolving relative links
              const baseUrl = new URL(source);
              
              // Use a simple regex to extract links from the HTML
              const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/g;
              const links: string[] = [];
              let match;
              
              // Debug: Log the HTML content length
              console.log(`HTML content length: ${htmlContent.length} characters`);
              
              // Try a more comprehensive approach to extract links
              // First try the regex approach
              while ((match = linkRegex.exec(htmlContent)) !== null) {
                const href = match[1];
                // Skip anchors, javascript, and other non-HTTP links
                if (href.startsWith('#') || href.startsWith('javascript:') || 
                    href.startsWith('mailto:') || href.startsWith('tel:')) {
                  continue;
                }
                
                // Make sure the URL is absolute
                try {
                  const absoluteUrl = new URL(href, baseUrl.origin).toString();
                  links.push(absoluteUrl);
                } catch (e) {
                  // Skip invalid URLs
                }
              }
              
              // If regex approach didn't find links, try a more aggressive approach
              if (links.length === 0) {
                console.log("Regex approach didn't find links, trying a more aggressive approach...");
                
                // Look for any href attribute in the HTML
                const hrefRegex = /href=["']([^"']+)["']/gi;
                while ((match = hrefRegex.exec(htmlContent)) !== null) {
                  const href = match[1];
                  // Skip anchors, javascript, and other non-HTTP links
                  if (href.startsWith('#') || href.startsWith('javascript:') || 
                      href.startsWith('mailto:') || href.startsWith('tel:')) {
                    continue;
                  }
                  
                  // Make sure the URL is absolute
                  try {
                    const absoluteUrl = new URL(href, baseUrl.origin).toString();
                    links.push(absoluteUrl);
                  } catch (e) {
                    // Skip invalid URLs
                  }
                }
              }
              
              // If still no links, try to extract URLs from the page content
              if (links.length === 0) {
                console.log("Still no links found, trying to extract URLs from page content...");
                
                // Look for URLs in the text content
                const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
                while ((match = urlRegex.exec(htmlContent)) !== null) {
                  const url = match[1];
                  try {
                    // Validate the URL
                    new URL(url);
                    links.push(url);
                  } catch (e) {
                    // Skip invalid URLs
                  }
                }
              }
              
              // Debug: Log the number of links found
              console.log(`Found ${links.length} links in the HTML content`);
              
              if (links.length > 0) {
                // Filter out non-content URLs
                const filteredLinks = links.filter(url => {
                  // Skip XML/HTML namespace URLs
                  if (url.includes('www.w3.org') || 
                      url.includes('www.sitemaps.org') ||
                      url.includes('www.w3.org/TR') ||
                      url.includes('www.w3.org/1999') ||
                      url.includes('www.w3.org/2000')) {
                    return false;
                  }
                  
                  // Skip data URLs
                  if (url.startsWith('data:')) {
                    return false;
                  }
                  
                  // Skip fragment identifiers
                  if (url.includes('#')) {
                    return false;
                  }
                  
                  // Skip non-HTTP(S) URLs
                  if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    return false;
                  }
                  
                  return true;
                });
                
                console.log(`Filtered out ${links.length - filteredLinks.length} non-content URLs`);
                console.log(`Extracted ${filteredLinks.length} content URLs from the HTML page`);
                
                // Log the first 5 links for debugging
                if (filteredLinks.length > 0) {
                  console.log("First 5 content links:", filteredLinks.slice(0, 5));
                }
                
                return filteredLinks;
              } else {
                // If we still can't find links, try to navigate to the robots.txt
                console.log("No links found, trying to fetch robots.txt...");
                try {
                  const robotsUrl = new URL('/robots.txt', baseUrl.origin).toString();
                  console.log(`Fetching robots.txt from ${robotsUrl}`);
                  
                  const robotsResponse = await axios.get(robotsUrl, {
                    headers: {
                      'User-Agent': fetcherConfig.puppeteer.user_agent,
                    }
                  });
                  
                  // Extract sitemap URL from robots.txt
                  const sitemapMatch = robotsResponse.data.match(/Sitemap:\s*(https?:\/\/[^\s]+)/i);
                  if (sitemapMatch && sitemapMatch[1]) {
                    console.log(`Found sitemap URL in robots.txt: ${sitemapMatch[1]}`);
                    return parseSitemap(sitemapMatch[1]);
                  }
                } catch (robotsError: any) {
                  console.log(`Failed to fetch robots.txt: ${robotsError.message}`);
                }
                
                throw new Error('Could not extract URLs from the HTML page');
              }
            }
          } else {
            // If it's not HTML, assume it's XML
            xmlContent = htmlContent;
          }
        } else {
          throw error;
        }
      }
    }

    // Try to parse the content as XML
    try {
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
    } catch (parseError: any) {
      console.error(`XML parsing error: ${parseError.message}`);
      console.error('Content received:', xmlContent.substring(0, 500) + '...');
      throw new Error(`Failed to parse sitemap: ${parseError.message}`);
    }
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
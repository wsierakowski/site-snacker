import { JSDOM } from 'jsdom';

interface Breadcrumb {
  text: string;
  url?: string;
}

/**
 * Extracts breadcrumb navigation from HTML content
 * @param html The HTML content to extract breadcrumbs from
 * @returns Array of breadcrumb items with text and optional URLs
 */
export function extractBreadcrumbs(html: string): Breadcrumb[] {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Common breadcrumb selectors
    const selectors = [
      '.breadcrumb', // Bootstrap and common class
      '.breadcrumbs',
      '[aria-label="breadcrumb"]',
      'nav[aria-label="Breadcrumb"]',
      '.navigation-path',
      '.path',
      '#breadcrumb',
      '#breadcrumbs'
    ];

    // Find the first matching breadcrumb container
    let breadcrumbContainer: Element | null = null;
    for (const selector of selectors) {
      breadcrumbContainer = document.querySelector(selector);
      if (breadcrumbContainer) break;
    }

    if (!breadcrumbContainer) {
      return [];
    }

    // Find all breadcrumb items
    const items = breadcrumbContainer.querySelectorAll('li, span[itemprop="name"], *[class*="breadcrumb-"]');
    const breadcrumbs: Breadcrumb[] = [];

    items.forEach(item => {
      // Try to find a link first
      const link = item.querySelector('a');
      if (link) {
        breadcrumbs.push({
          text: link.textContent?.trim() || '',
          url: link.getAttribute('href') || undefined
        });
      } else {
        // If no link, just get the text content
        const text = item.textContent?.trim();
        if (text) {
          breadcrumbs.push({ text });
        }
      }
    });

    return breadcrumbs;
  } catch (error) {
    console.error('Error extracting breadcrumbs:', error);
    return [];
  }
}

/**
 * Converts breadcrumbs to markdown format
 * @param breadcrumbs Array of breadcrumb items
 * @returns Markdown string representation of breadcrumbs
 */
export function breadcrumbsToMarkdown(breadcrumbs: Breadcrumb[]): string {
  if (!breadcrumbs.length) return '';

  const parts = breadcrumbs.map((crumb, index) => {
    if (crumb.url) {
      return `[${crumb.text}](${crumb.url})`;
    }
    return crumb.text;
  });

  return `> ${parts.join(' > ')}\n\n`;
} 
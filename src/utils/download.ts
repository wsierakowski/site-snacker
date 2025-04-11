import axios from 'axios';
import { URL } from 'url';

interface DownloadOptions {
  headers?: Record<string, string>;
  validateStatus?: ((status: number) => boolean) | null;
}

interface DownloadResult {
  buffer: Buffer;
  contentType?: string;
  originalUrl?: string;
}

/**
 * Downloads a file from a URL and returns it as a buffer
 * @param url The URL to download from
 * @param baseUrl The base URL for resolving relative URLs
 * @param options Additional options for the download
 * @returns The downloaded file as a buffer and associated metadata
 */
export async function downloadFile(url: string, baseUrl: string, options: DownloadOptions = {}): Promise<DownloadResult> {
  console.log('\nDownload request:');
  console.log('Input URL:', url);
  console.log('Base URL:', baseUrl);

  // For Next.js image URLs, extract the original URL from the query parameter
  let urlToDownload = url;
  let originalUrl = url;

  if (url.includes('/_next/image?url=')) {
    try {
      // First resolve relative URL if needed
      console.log('Detected Next.js image URL');
      const resolvedUrl = new URL(url, baseUrl).toString();
      console.log('Resolved URL:', resolvedUrl);
      
      const params = new URL(resolvedUrl).searchParams;
      const encodedUrl = params.get('url');
      console.log('Encoded URL from params:', encodedUrl);
      
      if (encodedUrl) {
        originalUrl = decodeURIComponent(encodedUrl);
        urlToDownload = originalUrl;
        console.log('Decoded original URL:', originalUrl);
      } else {
        console.log('No URL parameter found in Next.js image URL');
      }
    } catch (error) {
      console.error('Error parsing Next.js image URL:', error);
      throw error;
    }
  } else {
    // For non-Next.js URLs, resolve relative URLs
    try {
      console.log('Regular URL, resolving against base URL');
      urlToDownload = new URL(url, baseUrl).toString();
      originalUrl = urlToDownload;
      console.log('Resolved URL:', urlToDownload);
    } catch (error) {
      console.error('Error resolving URL:', error);
      throw error;
    }
  }

  console.log('\nFinal download configuration:');
  console.log('URL to download:', urlToDownload);
  console.log('Original URL:', originalUrl);

  try {
    console.log('\nStarting download...');
    const response = await axios.get(urlToDownload, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'Referer': baseUrl,
        ...options.headers,
      },
      validateStatus: options.validateStatus ?? null,
      maxRedirects: 5,
    });

    console.log('Download successful');
    console.log('Response status:', response.status);
    console.log('Content type:', response.headers['content-type']);
    console.log('Content length:', response.headers['content-length']);

    if (response.status !== 200) {
      console.error('Response Status:', response.status);
      console.error('Response Headers:', JSON.stringify(response.headers, null, 2));
      
      // Try to get the first 100 chars of the response data
      let responsePreview = '';
      if (response.data) {
        if (Buffer.isBuffer(response.data)) {
          try {
            responsePreview = response.data.toString('utf8', 0, 100);
          } catch (e) {
            responsePreview = '<Binary data>';
          }
        } else if (typeof response.data === 'string') {
          responsePreview = response.data.slice(0, 100);
        } else {
          responsePreview = JSON.stringify(response.data).slice(0, 100);
        }
      }
      console.error('Response Preview:', responsePreview);
      console.error('Attempted URL:', urlToDownload);
      
      throw new Error(`Failed to download file (HTTP ${response.status})`);
    }

    return {
      buffer: Buffer.from(response.data),
      contentType: response.headers['content-type'],
      originalUrl: originalUrl !== urlToDownload ? originalUrl : undefined
    };
  } catch (error: any) {
    console.error('\nDownload error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Attempted URL:', urlToDownload);
      
      // Try to get the first 100 chars of the response data
      let responsePreview = '';
      if (error.response.data) {
        if (Buffer.isBuffer(error.response.data)) {
          try {
            responsePreview = error.response.data.toString('utf8', 0, 100);
          } catch (e) {
            responsePreview = '<Binary data>';
          }
        } else if (typeof error.response.data === 'string') {
          responsePreview = error.response.data.slice(0, 100);
        } else {
          responsePreview = JSON.stringify(error.response.data).slice(0, 100);
        }
      }
      console.error('Response Preview:', responsePreview);
    }
    throw error;
  }
} 
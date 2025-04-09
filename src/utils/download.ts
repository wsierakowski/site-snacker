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
  // Resolve relative URLs
  const absoluteUrl = new URL(url, baseUrl).toString();
  console.log('\nDownloading from:', absoluteUrl);

  // Handle Next.js image URLs
  const originalUrl = absoluteUrl.includes('_next/image?url=')
    ? decodeURIComponent(new URL(absoluteUrl).searchParams.get('url') || absoluteUrl)
    : absoluteUrl;

  try {
    const response = await axios.get(originalUrl, {
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
    });

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
      console.error('Attempted URL:', originalUrl);
      
      throw new Error(`Failed to download file (HTTP ${response.status})`);
    }

    return {
      buffer: Buffer.from(response.data),
      contentType: response.headers['content-type'],
      originalUrl: originalUrl !== absoluteUrl ? originalUrl : undefined
    };
  } catch (error: any) {
    console.error('Error downloading file:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Attempted URL:', originalUrl);
      
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
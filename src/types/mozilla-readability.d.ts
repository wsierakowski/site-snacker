declare module '@mozilla/readability' {
  export class Readability {
    constructor(document: Document);
    parse(): Article | null;
  }

  export interface Article {
    title: string;
    content: string;
    textContent: string;
    length: number;
    excerpt: string;
    byline: string;
    dir: string | null;
    siteName: string | null;
    lang: string | null;
  }
} 
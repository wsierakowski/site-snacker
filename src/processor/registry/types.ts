/**
 * Types of media that can be registered in the cache
 */
export type MediaType = 'image' | 'audio';

/**
 * Common metadata fields for all media types
 */
interface BaseMetadata {
  format?: string;
  size?: number;  // in bytes
  mimeType?: string;
}

/**
 * Image-specific metadata
 */
interface ImageMetadata extends BaseMetadata {
  width?: number;
  height?: number;
}

/**
 * Audio-specific metadata
 */
interface AudioMetadata extends BaseMetadata {
  duration?: number;  // in seconds
  bitrate?: number;
  channels?: number;
  sampleRate?: number;
}

/**
 * Represents where a media file appears in the processed content
 */
export interface MediaOccurrence {
  pagePath: string;      // Path in tmp directory where the file is stored
  originalUrl: string;   // Original URL where the file was downloaded from
  timestamp: string;     // When this occurrence was registered
}

/**
 * A single entry in the registry
 */
export interface RegistryEntry {
  type: MediaType;
  hash: string;
  content: string;       // Description for images, transcript for audio
  occurrences: MediaOccurrence[];
  firstProcessed: string;
  lastUsed: string;
  metadata: ImageMetadata | AudioMetadata;
  apiCost?: number;      // Track API cost for this processing
}

/**
 * Statistics about the registry
 */
export interface RegistryStats {
  totalFiles: number;
  uniqueFiles: {
    [K in MediaType]: number;
  };
  duplicateCount: {
    [K in MediaType]: number;
  };
  totalApiCost: number;
  lastUpdated: string;
}

/**
 * The complete registry structure
 */
export interface Registry {
  entries: {
    [hash: string]: RegistryEntry;
  };
  stats: RegistryStats;
}

/**
 * Options for registry operations
 */
export interface RegistryOptions {
  registryPath?: string;  // Path to the registry file
  autoSave?: boolean;     // Whether to save after each operation
  backupOld?: boolean;    // Whether to backup old registry before saving
}

/**
 * Error types that can occur during registry operations
 */
export enum RegistryErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_HASH = 'INVALID_HASH',
  SAVE_FAILED = 'SAVE_FAILED',
  LOAD_FAILED = 'LOAD_FAILED',
  INVALID_FORMAT = 'INVALID_FORMAT',
}

/**
 * Custom error class for registry operations
 */
export class RegistryError extends Error {
  constructor(
    public type: RegistryErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'RegistryError';
  }
} 
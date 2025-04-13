import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import {
  Registry,
  RegistryEntry,
  RegistryOptions,
  MediaType,
  MediaOccurrence,
  RegistryError,
  RegistryErrorType,
  RegistryStats
} from './types';

const DEFAULT_OPTIONS: Required<RegistryOptions> = {
  registryPath: 'tmp/media-registry.json',
  autoSave: true,
  backupOld: true,
};

export class MediaRegistry {
  private registry: Registry;
  private options: Required<RegistryOptions>;
  private isDirty: boolean = false;

  constructor(options: RegistryOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.registry = this.loadRegistry();
  }

  /**
   * Calculate hash for a file
   */
  private calculateHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Load registry from disk or create new if doesn't exist
   */
  private loadRegistry(): Registry {
    try {
      if (fs.existsSync(this.options.registryPath)) {
        const content = fs.readFileSync(this.options.registryPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      throw new RegistryError(
        RegistryErrorType.LOAD_FAILED,
        `Failed to load registry from ${this.options.registryPath}`,
        error as Error
      );
    }

    // Return new registry if file doesn't exist
    return {
      entries: {},
      stats: {
        totalFiles: 0,
        uniqueFiles: {
          image: 0,
          audio: 0,
        },
        duplicateCount: {
          image: 0,
          audio: 0,
        },
        totalApiCost: 0,
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  /**
   * Save registry to disk
   */
  private saveRegistry(): void {
    if (!this.isDirty && fs.existsSync(this.options.registryPath)) {
      return; // No changes to save
    }

    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(this.options.registryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Backup old file if it exists and option is enabled
      if (this.options.backupOld && fs.existsSync(this.options.registryPath)) {
        const backupPath = `${this.options.registryPath}.backup`;
        fs.copyFileSync(this.options.registryPath, backupPath);
      }

      // Save new content
      fs.writeFileSync(
        this.options.registryPath,
        JSON.stringify(this.registry, null, 2)
      );
      
      this.isDirty = false;
    } catch (error) {
      throw new RegistryError(
        RegistryErrorType.SAVE_FAILED,
        `Failed to save registry to ${this.options.registryPath}`,
        error as Error
      );
    }
  }

  /**
   * Update registry statistics
   */
  private updateStats(): void {
    const stats: RegistryStats = {
      totalFiles: 0,
      uniqueFiles: {
        image: 0,
        audio: 0,
      },
      duplicateCount: {
        image: 0,
        audio: 0,
      },
      totalApiCost: 0,
      lastUpdated: new Date().toISOString(),
    };

    // Calculate stats from entries
    for (const entry of Object.values(this.registry.entries)) {
      stats.totalFiles += entry.occurrences.length;
      stats.uniqueFiles[entry.type]++;
      stats.duplicateCount[entry.type] += Math.max(0, entry.occurrences.length - 1);
      stats.totalApiCost += entry.apiCost || 0;
    }

    this.registry.stats = stats;
    this.isDirty = true;
  }

  /**
   * Check if a file exists in the registry
   */
  public hasFile(filePath: string): boolean {
    const hash = this.calculateHash(filePath);
    return hash in this.registry.entries;
  }

  /**
   * Get entry for a file if it exists
   */
  public getEntry(filePath: string): RegistryEntry | null {
    const hash = this.calculateHash(filePath);
    return this.registry.entries[hash] || null;
  }

  /**
   * Add or update a media entry
   */
  public addEntry(
    filePath: string,
    type: MediaType,
    content: string,
    metadata: any = {},
    apiCost: number = 0
  ): RegistryEntry {
    const hash = this.calculateHash(filePath);
    const now = new Date().toISOString();

    // Check if entry exists
    if (hash in this.registry.entries) {
      const entry = this.registry.entries[hash];
      
      // Add new occurrence if not already present
      const occurrence: MediaOccurrence = {
        pagePath: filePath,
        originalUrl: metadata.originalUrl || '',
        timestamp: now,
      };

      if (!entry.occurrences.some(o => o.pagePath === filePath)) {
        entry.occurrences.push(occurrence);
      }

      entry.lastUsed = now;
      this.isDirty = true;
      this.updateStats();

      if (this.options.autoSave) {
        this.saveRegistry();
      }

      return entry;
    }

    // Create new entry
    const newEntry: RegistryEntry = {
      type,
      hash,
      content,
      occurrences: [{
        pagePath: filePath,
        originalUrl: metadata.originalUrl || '',
        timestamp: now,
      }],
      firstProcessed: now,
      lastUsed: now,
      metadata,
      apiCost,
    };

    this.registry.entries[hash] = newEntry;
    this.isDirty = true;
    this.updateStats();

    if (this.options.autoSave) {
      this.saveRegistry();
    }

    return newEntry;
  }

  /**
   * Get registry statistics
   */
  public getStats(): RegistryStats {
    return { ...this.registry.stats };
  }

  /**
   * Find all duplicates of a file
   */
  public findDuplicates(filePath: string): MediaOccurrence[] {
    const entry = this.getEntry(filePath);
    return entry ? [...entry.occurrences] : [];
  }

  /**
   * Force save registry to disk
   */
  public save(): void {
    this.saveRegistry();
  }
} 
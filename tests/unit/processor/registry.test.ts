import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { MediaRegistry, MediaType, RegistryError, RegistryErrorType } from "../../../src/processor/registry";
import * as fs from 'fs';
import * as path from 'path';

const TEST_REGISTRY_PATH = 'tmp/test-media-registry.json';
const TEST_IMAGE_PATH = 'tests/fixtures/test-image.png';
const TEST_AUDIO_PATH = 'tests/fixtures/test-audio.mp3';

describe('MediaRegistry', () => {
  let registry: MediaRegistry;

  beforeEach(() => {
    // Create test files
    if (!fs.existsSync('tmp')) {
      fs.mkdirSync('tmp', { recursive: true });
    }
    if (!fs.existsSync('tests/fixtures')) {
      fs.mkdirSync('tests/fixtures', { recursive: true });
    }
    
    // Create dummy test files if they don't exist
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      fs.writeFileSync(TEST_IMAGE_PATH, 'dummy image content');
    }
    if (!fs.existsSync(TEST_AUDIO_PATH)) {
      fs.writeFileSync(TEST_AUDIO_PATH, 'dummy audio content');
    }

    registry = new MediaRegistry({ registryPath: TEST_REGISTRY_PATH });
  });

  afterEach(() => {
    // Cleanup test files
    if (fs.existsSync(TEST_REGISTRY_PATH)) {
      fs.unlinkSync(TEST_REGISTRY_PATH);
    }
    if (fs.existsSync(`${TEST_REGISTRY_PATH}.backup`)) {
      fs.unlinkSync(`${TEST_REGISTRY_PATH}.backup`);
    }
  });

  test('should create new registry if none exists', () => {
    registry.save(); // Ensure registry is saved to disk
    expect(fs.existsSync(TEST_REGISTRY_PATH)).toBe(true);
    const stats = registry.getStats();
    expect(stats.totalFiles).toBe(0);
    expect(stats.uniqueFiles.image).toBe(0);
    expect(stats.uniqueFiles.audio).toBe(0);
  });

  test('should add new image entry', () => {
    const entry = registry.addEntry(
      TEST_IMAGE_PATH,
      'image',
      'test description',
      { originalUrl: 'http://test.com/image.png' },
      0.02
    );

    expect(entry.type).toBe('image');
    expect(entry.content).toBe('test description');
    expect(entry.apiCost).toBe(0.02);
    expect(entry.occurrences).toHaveLength(1);
    expect(entry.occurrences[0].originalUrl).toBe('http://test.com/image.png');

    const stats = registry.getStats();
    expect(stats.totalFiles).toBe(1);
    expect(stats.uniqueFiles.image).toBe(1);
  });

  test('should detect duplicate files', () => {
    // Add initial entry
    registry.addEntry(
      TEST_IMAGE_PATH,
      'image',
      'test description',
      { originalUrl: 'http://test.com/image1.png' }
    );

    // Add same file with different path
    const duplicatePath = 'tests/fixtures/duplicate-image.png';
    fs.copyFileSync(TEST_IMAGE_PATH, duplicatePath);

    const entry = registry.addEntry(
      duplicatePath,
      'image',
      'test description',
      { originalUrl: 'http://test.com/image2.png' }
    );

    expect(entry.occurrences).toHaveLength(2);
    
    const stats = registry.getStats();
    expect(stats.totalFiles).toBe(2);
    expect(stats.uniqueFiles.image).toBe(1);
    expect(stats.duplicateCount.image).toBe(1);

    // Cleanup
    fs.unlinkSync(duplicatePath);
  });

  test('should find duplicates of a file', () => {
    // Add initial entry
    registry.addEntry(
      TEST_IMAGE_PATH,
      'image',
      'test description',
      { originalUrl: 'http://test.com/image1.png' }
    );

    // Add duplicate
    const duplicatePath = 'tests/fixtures/duplicate-image.png';
    fs.copyFileSync(TEST_IMAGE_PATH, duplicatePath);
    registry.addEntry(
      duplicatePath,
      'image',
      'test description',
      { originalUrl: 'http://test.com/image2.png' }
    );

    const duplicates = registry.findDuplicates(TEST_IMAGE_PATH);
    expect(duplicates).toHaveLength(2);
    expect(duplicates[0].originalUrl).toBe('http://test.com/image1.png');
    expect(duplicates[1].originalUrl).toBe('http://test.com/image2.png');

    // Cleanup
    fs.unlinkSync(duplicatePath);
  });

  test('should handle both image and audio files', () => {
    // Add image
    registry.addEntry(
      TEST_IMAGE_PATH,
      'image',
      'test description',
      { originalUrl: 'http://test.com/image.png' }
    );

    // Add audio
    registry.addEntry(
      TEST_AUDIO_PATH,
      'audio',
      'test transcript',
      { originalUrl: 'http://test.com/audio.mp3' }
    );

    const stats = registry.getStats();
    expect(stats.uniqueFiles.image).toBe(1);
    expect(stats.uniqueFiles.audio).toBe(1);
    expect(stats.totalFiles).toBe(2);
  });

  test('should track API costs', () => {
    registry.addEntry(
      TEST_IMAGE_PATH,
      'image',
      'test description',
      { originalUrl: 'http://test.com/image.png' },
      0.02
    );

    registry.addEntry(
      TEST_AUDIO_PATH,
      'audio',
      'test transcript',
      { originalUrl: 'http://test.com/audio.mp3' },
      0.03
    );

    const stats = registry.getStats();
    expect(stats.totalApiCost).toBe(0.05);
  });

  test('should create backup of existing registry', () => {
    // Add an entry and save
    registry.addEntry(
      TEST_IMAGE_PATH,
      'image',
      'test description'
    );
    registry.save();

    // Force sync to ensure file is written
    fs.writeFileSync(TEST_REGISTRY_PATH, fs.readFileSync(TEST_REGISTRY_PATH));

    // Create new registry instance (should create backup)
    const newRegistry = new MediaRegistry({ registryPath: TEST_REGISTRY_PATH });
    
    // Add an entry to trigger a save and backup
    newRegistry.addEntry(
      TEST_IMAGE_PATH,
      'image',
      'test description'
    );
    newRegistry.save();
    
    expect(fs.existsSync(`${TEST_REGISTRY_PATH}.backup`)).toBe(true);
  });
}); 
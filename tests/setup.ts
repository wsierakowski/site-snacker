import { ConfigLoader } from '../src/config/index.js';
import * as path from 'path';
import * as fs from 'fs';

// Set up test environment
process.env.NODE_ENV = 'test';

// Create test directories
const testDirs = [
  'tests/output',
  'tests/tmp'
];

for (const dir of testDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Initialize configuration with test config
const configPath = path.join(process.cwd(), 'tests', 'fixtures', 'test-config.yml');
ConfigLoader.getInstance().loadConfig(configPath);

// Clean up function to be called after tests
export function cleanup() {
  for (const dir of testDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
} 
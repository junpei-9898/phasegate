/**
 * @layer infrastructure
 * @unit config-foundation
 */
import * as fs from 'node:fs/promises';
import path from 'node:path';
import type { ConfigRepositoryPort } from '../../domain/ports/config-repository-port.js';

const DEFAULT_CONFIG_FILE_NAME = 'phasegate.config.json';
const PERSONAL_CONFIG_PATH = path.join('.phasegate-local', DEFAULT_CONFIG_FILE_NAME);

export class ConfigNotFoundError extends Error {
  readonly configPath: string;

  constructor(configPath: string) {
    super(`Config file not found: ${configPath}`);
    this.name = 'ConfigNotFoundError';
    this.configPath = configPath;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConfigPersistenceError extends Error {
  readonly configPath: string;
  readonly cause?: unknown;

  constructor(configPath: string, cause?: unknown) {
    super(`Failed to persist config: ${configPath}`);
    this.name = 'ConfigPersistenceError';
    this.configPath = configPath;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findNearestConfig(startDirectory: string): Promise<string | null> {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    const candidates = [
      path.join(currentDirectory, DEFAULT_CONFIG_FILE_NAME),
      path.join(currentDirectory, PERSONAL_CONFIG_PATH),
    ];

    for (const candidate of candidates) {
      if (await exists(candidate)) {
        return candidate;
      }
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

export class FileSystemConfigRepository implements ConfigRepositoryPort {
  async load(configPath?: string): Promise<{ path: string; document: unknown }> {
    const resolvedPath = configPath
      ? path.resolve(configPath)
      : await findNearestConfig(process.cwd());

    if (!resolvedPath) {
      throw new ConfigNotFoundError(
        path.resolve(process.cwd(), DEFAULT_CONFIG_FILE_NAME),
      );
    }

    if (!(await exists(resolvedPath))) {
      throw new ConfigNotFoundError(resolvedPath);
    }

    try {
      const raw = await fs.readFile(resolvedPath, 'utf8');

      return {
        path: resolvedPath,
        document: JSON.parse(raw) as unknown,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ConfigPersistenceError(resolvedPath, error);
      }

      throw error;
    }
  }

  async save(configPath: string, document: unknown): Promise<void> {
    const resolvedPath = path.resolve(configPath);

    try {
      const serialized = `${JSON.stringify(document, null, 2)}\n`;
      await fs.writeFile(resolvedPath, serialized, 'utf8');
    } catch (error) {
      throw new ConfigPersistenceError(resolvedPath, error);
    }
  }
}

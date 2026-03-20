/**
 * @layer infrastructure
 * @unit traceability-model
 *
 * ファイルシステムからソースコードを読み込み MetadataReaderPort を実装するゲートウェイ
 */
import { readFile } from 'node:fs/promises';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MetadataReaderPort, MetadataTagLike } from '../../domain/ports/metadata-reader-port.js';
import type { ProjectRelativePathLike } from '../../domain/value-objects/chain-link.js';
import {
  parseImplementationTags,
  parseTestTags,
} from '../parsers/source-metadata-parser.js';

const SUPPORTED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
]);

export class MetadataReadInfrastructureError extends Error {
  readonly originalError: Error | undefined;

  constructor(filePath: string, cause?: unknown) {
    super(`メタデータ読み取りに失敗しました: ${filePath}`);
    this.name = 'MetadataReadInfrastructureError';
    this.originalError = cause instanceof Error ? cause : undefined;
  }
}

export interface FileSystemMetadataReaderDeps {
  readonly rootDir: string;
}

export class FileSystemMetadataReader implements MetadataReaderPort {
  private readonly rootDir: string;

  constructor(deps: FileSystemMetadataReaderDeps) {
    this.rootDir = deps.rootDir;
  }

  async readImplementationTags(
    filePath: ProjectRelativePathLike,
  ): Promise<readonly MetadataTagLike[]> {
    const content = await this.readFileContent(filePath);
    const parsed = parseImplementationTags(content);

    return parsed.map((tag) => ({
      type: tag.type,
      value: tag.value,
      lineNumber: tag.lineNumber,
      filePath,
    }));
  }

  async readTestTags(
    filePath: ProjectRelativePathLike,
  ): Promise<readonly MetadataTagLike[]> {
    const content = await this.readFileContent(filePath);
    const parsed = parseTestTags(content);

    return parsed.map((tag) => ({
      type: tag.type,
      value: tag.value,
      lineNumber: tag.lineNumber,
      filePath,
    }));
  }

  private async readFileContent(
    filePath: ProjectRelativePathLike,
  ): Promise<string> {
    const absolutePath = path.join(this.rootDir, filePath.value);
    const ext = path.extname(absolutePath);

    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      throw new MetadataReadInfrastructureError(
        filePath.value,
        new Error(`サポートされていない拡張子です: ${ext}`),
      );
    }

    if (!fs.existsSync(absolutePath)) {
      throw new MetadataReadInfrastructureError(
        filePath.value,
        new Error(`ファイルが存在しません: ${absolutePath}`),
      );
    }

    try {
      return await readFile(absolutePath, 'utf8');
    } catch (err) {
      throw new MetadataReadInfrastructureError(filePath.value, err);
    }
  }
}

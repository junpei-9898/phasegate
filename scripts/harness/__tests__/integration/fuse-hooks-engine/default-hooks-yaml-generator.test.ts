/**
 * @unit fuse-hooks-engine
 * @layer infrastructure
 *
 * DefaultHooksYamlGenerator テスト (I8)
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DefaultHooksYamlGenerator } from '../../../fuse-hooks-engine/infrastructure/adapters/default-hooks-yaml-generator.js';

describe('DefaultHooksYamlGenerator', () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  it('デフォルトYAMLが正しい構造を持つ', () => {
    // Arrange
    const generator = new DefaultHooksYamlGenerator();

    // Act
    const yaml = generator.generate();

    // Assert
    expect(yaml).toContain('version: "1.0"');
    expect(yaml).toContain('preWrite:');
    expect(yaml).toContain('postWrite:');
    expect(yaml).toContain('preRead:');
    expect(yaml).toContain('preBash:');
    expect(yaml).toContain('onComplete:');
    expect(yaml).toContain('protect-config');
    expect(yaml).toContain('protect-principles');
    expect(yaml).toContain('protect-secrets');
    expect(yaml).toContain('block-destructive');
  });

  it('ファイルが存在しない場合に生成する', async () => {
    // Arrange
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-yaml-'));
    tmpDirs.push(tmpDir);
    const generator = new DefaultHooksYamlGenerator();

    // Act
    const result = await generator.writeIfNotExists(tmpDir);

    // Assert
    expect(result.created).toBe(true);
    expect(fs.existsSync(result.path)).toBe(true);
    const content = fs.readFileSync(result.path, 'utf-8');
    expect(content).toContain('version: "1.0"');
  });

  it('ファイルが既存の場合は上書きしない', async () => {
    // Arrange
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-yaml-'));
    tmpDirs.push(tmpDir);
    const existingPath = path.join(tmpDir, '.harness-hooks.yml');
    fs.writeFileSync(existingPath, 'existing content', 'utf-8');
    const generator = new DefaultHooksYamlGenerator();

    // Act
    const result = await generator.writeIfNotExists(tmpDir);

    // Assert
    expect(result.created).toBe(false);
    const content = fs.readFileSync(existingPath, 'utf-8');
    expect(content).toBe('existing content');
  });
});

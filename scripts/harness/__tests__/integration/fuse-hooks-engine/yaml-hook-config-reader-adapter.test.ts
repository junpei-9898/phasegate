import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { YamlHookConfigReaderAdapter } from '../../../fuse-hooks-engine/infrastructure/adapters/yaml-hook-config-reader-adapter.js';

let tmpDir = '';

target('YamlHookConfigReaderAdapter', () => {
  afterEach(async () => {
    if (tmpDir !== '') {
      await fs.rm(tmpDir, { recursive: true, force: true });
      tmpDir = '';
    }
  });

  it('IT-HF-022 JSON互換YAMLを読み込めること', async () => {
    // Arrange
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-yaml-'));
    const filePath = path.join(tmpDir, '.harness-hooks.yml');
    await fs.writeFile(
      filePath,
      JSON.stringify({
        version: 1,
        hooks: [
          {
            type: 'pre-write',
            files: { include: ['**/*.env'] },
            action: { type: 'block-write', config: { reason: 'Protected', notifyUser: true } },
          },
        ],
      }),
      'utf8',
    );
    const sut = new YamlHookConfigReaderAdapter();
    // Act
    const actual = await sut.read(filePath);
    // Assert
    expect(actual.isOk()).toBe(true);
    const config = actual._unsafeUnwrap();
    expect(config.version).toBe(1);
    expect(config.hooks).toHaveLength(1);
    expect(config.hooks[0].type).toBe('pre-write');
    expect(config.hooks[0].action.type).toBe('block-write');
  });

  it('IT-HF-023 ネイティブYAML構文を読み込めること', async () => {
    // Arrange
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-yaml-'));
    const filePath = path.join(tmpDir, '.harness-hooks.yml');
    const yamlContent = `
version: 1
hooks:
  - type: pre-write
    files:
      include:
        - "**/*.env"
        - "**/*.pem"
      exclude:
        - "test/**"
    action:
      type: block-write
      config:
        reason: Protected file
        notifyUser: true
    description: 環境ファイル保護
protectedResources:
  - docs/principles/
  - ".env"
completionGates:
  - storyId: US-001
    magicFilePath: .harness/DONE
    requiredFields:
      - testsPassed
      - reviewApproved
`;
    await fs.writeFile(filePath, yamlContent, 'utf8');
    const sut = new YamlHookConfigReaderAdapter();
    // Act
    const actual = await sut.read(filePath);
    // Assert
    expect(actual.isOk()).toBe(true);
    const config = actual._unsafeUnwrap();
    expect(config.version).toBe(1);
    expect(config.hooks).toHaveLength(1);
    expect(config.hooks[0].type).toBe('pre-write');
    expect(config.hooks[0].files.include).toEqual(['**/*.env', '**/*.pem']);
    expect(config.hooks[0].files.exclude).toEqual(['test/**']);
    expect(config.hooks[0].description).toBe('環境ファイル保護');
    expect(config.protectedResources).toEqual(['docs/principles/', '.env']);
    expect(config.completionGates).toHaveLength(1);
    expect(config.completionGates[0].storyId).toBe('US-001');
  });

  it('IT-HF-024 不正なYAML構文でパースエラーが返されること', async () => {
    // Arrange
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-yaml-'));
    const filePath = path.join(tmpDir, '.harness-hooks.yml');
    const invalidYaml = `
version: 1
hooks:
  - type: pre-write
    files: [invalid
`;
    await fs.writeFile(filePath, invalidYaml, 'utf8');
    const sut = new YamlHookConfigReaderAdapter();
    // Act
    const actual = await sut.read(filePath);
    // Assert
    expect(actual.isErr()).toBe(true);
    const errors = actual._unsafeUnwrapErr();
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('HOOK_YAML_PARSE_ERROR');
  });

  it('IT-HF-025 スキーマバリデーション: versionが欠落している場合エラーが返されること', async () => {
    // Arrange
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-yaml-'));
    const filePath = path.join(tmpDir, '.harness-hooks.yml');
    const yamlContent = `
hooks:
  - type: pre-write
    files:
      include:
        - "**/*.env"
    action:
      type: block-write
      config: {}
`;
    await fs.writeFile(filePath, yamlContent, 'utf8');
    const sut = new YamlHookConfigReaderAdapter();
    // Act
    const actual = await sut.read(filePath);
    // Assert
    expect(actual.isErr()).toBe(true);
    const errors = actual._unsafeUnwrapErr();
    expect(errors[0].code).toBe('HOOK_YAML_INVALID_VERSION');
  });

  it('IT-HF-026 存在しないファイルパスでエラーが返されること', async () => {
    // Arrange
    const sut = new YamlHookConfigReaderAdapter();
    // Act
    const actual = await sut.read('/nonexistent/path/.harness-hooks.yml');
    // Assert
    expect(actual.isErr()).toBe(true);
    const errors = actual._unsafeUnwrapErr();
    expect(errors[0].code).toBe('HOOK_YAML_PARSE_ERROR');
  });

  it('IT-HF-027 YAMLアンカー・エイリアス構文を正しく処理できること', async () => {
    // Arrange
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-yaml-'));
    const filePath = path.join(tmpDir, '.harness-hooks.yml');
    const yamlContent = `
version: 1
_defaults: &default_action
  type: block-write
  config:
    reason: Default protection
    notifyUser: true
hooks:
  - type: pre-write
    files:
      include:
        - "**/*.env"
    action: *default_action
  - type: pre-write
    files:
      include:
        - "**/*.pem"
    action: *default_action
`;
    await fs.writeFile(filePath, yamlContent, 'utf8');
    const sut = new YamlHookConfigReaderAdapter();
    // Act
    const actual = await sut.read(filePath);
    // Assert
    expect(actual.isOk()).toBe(true);
    const config = actual._unsafeUnwrap();
    expect(config.hooks).toHaveLength(2);
    expect(config.hooks[0].action.config).toEqual({ reason: 'Default protection', notifyUser: true });
    expect(config.hooks[1].action.config).toEqual({ reason: 'Default protection', notifyUser: true });
  });

  it('IT-HF-028 hooks配列が欠落している場合エラーが返されること', async () => {
    // Arrange
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-yaml-'));
    const filePath = path.join(tmpDir, '.harness-hooks.yml');
    await fs.writeFile(filePath, 'version: 1\n', 'utf8');
    const sut = new YamlHookConfigReaderAdapter();
    // Act
    const actual = await sut.read(filePath);
    // Assert
    expect(actual.isErr()).toBe(true);
    const errors = actual._unsafeUnwrapErr();
    expect(errors[0].code).toBe('HOOK_YAML_INVALID_HOOKS');
  });

  it('IT-HF-070 ルートがオブジェクトでない場合エラーが返されること', async () => {
    // Arrange
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-yaml-'));
    const filePath = path.join(tmpDir, '.harness-hooks.yml');
    await fs.writeFile(filePath, '"just a string"', 'utf8');
    const sut = new YamlHookConfigReaderAdapter();
    // Act
    const actual = await sut.read(filePath);
    // Assert
    expect(actual.isErr()).toBe(true);
    const errors = actual._unsafeUnwrapErr();
    expect(errors[0].code).toBe('HOOK_YAML_INVALID_ROOT');
  });

  it('IT-HF-071 空ファイルの場合エラーが返されること', async () => {
    // Arrange
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fuse-hooks-yaml-'));
    const filePath = path.join(tmpDir, '.harness-hooks.yml');
    await fs.writeFile(filePath, '', 'utf8');
    const sut = new YamlHookConfigReaderAdapter();
    // Act
    const actual = await sut.read(filePath);
    // Assert
    expect(actual.isErr()).toBe(true);
  });
});

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { PlaywrightTemplateGeneratorAdapter } from '../../../phase2-extensions/infrastructure/adapters/playwright-template-generator-adapter.js';

let tmpDir = '';

target('PlaywrightTemplateGeneratorAdapter', () => {
  afterEach(async () => {
    if (tmpDir !== '') {
      await fs.rm(tmpDir, { recursive: true, force: true });
      tmpDir = '';
    }
  });

  context('テンプレートファイル生成', () => {
    it('IT-P2-030 playwright.config.tsが生成されること', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'playwright-gen-'));
      const sut = new PlaywrightTemplateGeneratorAdapter({
        projectName: 'test-project',
        baseUrl: 'http://localhost:3000',
      });
      // Act
      const result = await sut.generate(tmpDir);
      // Assert
      expect(result.generatedFiles).toContain('playwright.config.ts');
      const configPath = path.join(tmpDir, 'playwright.config.ts');
      const content = await fs.readFile(configPath, 'utf8');
      expect(content).toContain('defineConfig');
      expect(content).toContain('http://localhost:3000');
    });

    it('IT-P2-031 ページオブジェクトベースクラスが生成されること', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'playwright-gen-'));
      const sut = new PlaywrightTemplateGeneratorAdapter({
        projectName: 'test-project',
        baseUrl: 'http://localhost:3000',
      });
      // Act
      const result = await sut.generate(tmpDir);
      // Assert
      expect(result.generatedFiles.some((f) => f.includes('base-page'))).toBe(true);
      const pagePath = path.join(tmpDir, 'pages', 'base-page.ts');
      const content = await fs.readFile(pagePath, 'utf8');
      expect(content).toContain('Page');
      expect(content).toContain('class');
    });

    it('IT-P2-032 シードデータ管理ファイルが生成されること', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'playwright-gen-'));
      const sut = new PlaywrightTemplateGeneratorAdapter({
        projectName: 'test-project',
        baseUrl: 'http://localhost:3000',
      });
      // Act
      const result = await sut.generate(tmpDir);
      // Assert
      expect(result.generatedFiles.some((f) => f.includes('seed'))).toBe(true);
      const seedPath = path.join(tmpDir, 'fixtures', 'seed-data.ts');
      const content = await fs.readFile(seedPath, 'utf8');
      expect(content).toContain('SeedData');
    });

    it('IT-P2-033 サンプルテストファイルが生成されること', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'playwright-gen-'));
      const sut = new PlaywrightTemplateGeneratorAdapter({
        projectName: 'test-project',
        baseUrl: 'http://localhost:3000',
      });
      // Act
      const result = await sut.generate(tmpDir);
      // Assert
      expect(result.generatedFiles.some((f) => f.includes('.spec.ts'))).toBe(true);
    });
  });

  context('設定オプション', () => {
    it('IT-P2-034 カスタムbaseUrlが反映されること', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'playwright-gen-'));
      const sut = new PlaywrightTemplateGeneratorAdapter({
        projectName: 'my-app',
        baseUrl: 'https://staging.example.com',
      });
      // Act
      await sut.generate(tmpDir);
      // Assert
      const content = await fs.readFile(path.join(tmpDir, 'playwright.config.ts'), 'utf8');
      expect(content).toContain('https://staging.example.com');
    });

    it('IT-P2-035 生成結果にエラーがないこと', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'playwright-gen-'));
      const sut = new PlaywrightTemplateGeneratorAdapter({
        projectName: 'test-project',
        baseUrl: 'http://localhost:3000',
      });
      // Act
      const result = await sut.generate(tmpDir);
      // Assert
      expect(result.errors).toHaveLength(0);
      expect(result.generatedFiles.length).toBeGreaterThanOrEqual(4);
    });
  });

  context('異常系', () => {
    it('IT-P2-036 書き込み不可ディレクトリで生成するとエラーが返されること', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'playwright-gen-'));
      const readonlyDir = path.join(tmpDir, 'readonly');
      await fs.mkdir(readonlyDir);
      await fs.chmod(readonlyDir, 0o444);
      const sut = new PlaywrightTemplateGeneratorAdapter({
        projectName: 'test-project',
        baseUrl: 'http://localhost:3000',
      });
      // Act
      const result = await sut.generate(readonlyDir);
      // Assert
      expect(result.errors.length).toBeGreaterThan(0);
      // Cleanup: restore permissions for afterEach rm
      await fs.chmod(readonlyDir, 0o755);
    });

    it('IT-P2-037 既存ファイルがある場合に上書きできること', async () => {
      // Arrange
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'playwright-gen-'));
      const sut = new PlaywrightTemplateGeneratorAdapter({
        projectName: 'test-project',
        baseUrl: 'http://localhost:3000',
      });
      // 1回目の生成
      await sut.generate(tmpDir);
      // Act — 2回目の生成（上書き）
      const result = await sut.generate(tmpDir);
      // Assert
      expect(result.errors).toHaveLength(0);
      expect(result.generatedFiles.length).toBeGreaterThanOrEqual(4);
    });
  });
});

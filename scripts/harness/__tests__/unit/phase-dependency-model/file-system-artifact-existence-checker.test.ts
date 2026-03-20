import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { FileSystemArtifactExistenceChecker } from '../../../phase-dependency-model/infrastructure/filesystem/file-system-artifact-existence-checker.js';
import { Artifact } from '../../../phase-dependency-model/domain/values/artifact.js';

let tmpDir: string;

function createTmpDir(): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdm-artifact-'));
  return tmpDir;
}

function writeFile(rootDir: string, relativePath: string, content: string): void {
  const filePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

target('FileSystemArtifactExistenceChecker.checkAll', () => {
  describe('ファイルシステム上のアーティファクト存在を確認する', () => {
    context('対象ファイルが存在する場合', () => {
      it('該当アーティファクトがtrueで返される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(rootDir, 'docs/units/my-unit/design.md', '# Design');
        const artifact = Artifact.create({
          name: 'design-doc',
          path: 'docs/units/{unit}/design.md',
          required: true,
        });
        const sut = new FileSystemArtifactExistenceChecker({ rootDir });

        // Act
        const actual = await sut.checkAll([artifact], { unitId: 'my-unit' });

        // Assert
        expect(actual.get('design-doc')).toBe(true);
      });
    });

    context('対象ファイルが存在しない場合', () => {
      it('該当アーティファクトがfalseで返される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        const artifact = Artifact.create({
          name: 'design-doc',
          path: 'docs/units/{unit}/design.md',
          required: false,
        });
        const sut = new FileSystemArtifactExistenceChecker({ rootDir });

        // Act
        const actual = await sut.checkAll([artifact], { unitId: 'my-unit' });

        // Assert
        expect(actual.get('design-doc')).toBe(false);
      });
    });

    context('複数アーティファクトを指定する場合', () => {
      it('各アーティファクトの存在結果がMapで返される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(rootDir, 'docs/units/u1/design.md', '# Design');
        const existing = Artifact.create({
          name: 'design-doc',
          path: 'docs/units/{unit}/design.md',
          required: true,
        });
        const missing = Artifact.create({
          name: 'test-plan',
          path: 'docs/units/{unit}/test-plan.md',
          required: false,
        });
        const sut = new FileSystemArtifactExistenceChecker({ rootDir });

        // Act
        const actual = await sut.checkAll([existing, missing], { unitId: 'u1' });

        // Assert
        expect(actual.get('design-doc')).toBe(true);
        expect(actual.get('test-plan')).toBe(false);
      });
    });

    context('storyIdプレースホルダを含むパスの場合', () => {
      it('storyIdがパスに展開される', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(rootDir, 'docs/units/u1/stories/s1_plan.md', '# Plan');
        const artifact = Artifact.create({
          name: 'story-plan',
          path: 'docs/units/{unit}/stories/{storyId}_plan.md',
          required: true,
        });
        const sut = new FileSystemArtifactExistenceChecker({ rootDir });

        // Act
        const actual = await sut.checkAll([artifact], {
          unitId: 'u1',
          storyId: 's1',
        });

        // Assert
        expect(actual.get('story-plan')).toBe(true);
      });
    });
  });
});

// @layer test
// @unit phase-dependency-model
// @story H02-01
// @work-item-id WI-085
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
        expect(actual.get('docs/units/my-unit/design.md')).toBe(true);
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
        expect(actual.get('docs/units/my-unit/design.md')).toBe(false);
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
        expect(actual.get('docs/units/u1/design.md')).toBe(true);
        expect(actual.get('docs/units/u1/test-plan.md')).toBe(false);
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
        expect(actual.get('docs/units/u1/stories/s1_plan.md')).toBe(true);
      });
    });

    // IT-PD-126
    context('pathRoots 引数でカスタム root を指定する場合', () => {
      it('カスタム root 配下のファイルを判定対象とする（WI-085）', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(rootDir, 'mydocs/inception/my-unit/H99-01/logical_design.md', '# logical');
        const artifact = Artifact.create({
          name: 'story-logical-design',
          path: '{inceptionDocsRoot}/{unit}/{storyId}/logical_design.md',
          required: false,
        });
        const sut = new FileSystemArtifactExistenceChecker({ rootDir });
        const pathRoots = {
          designDocsRoot: 'mydocs/product',
          inceptionDocsRoot: 'mydocs/inception',
        };

        // Act
        const actual = await sut.checkAll(
          [artifact],
          { unitId: 'my-unit', storyId: 'H99-01' },
          pathRoots,
        );

        // Assert
        expect(actual.get('mydocs/inception/my-unit/H99-01/logical_design.md')).toBe(true);
      });
    });

    // IT-PD-127
    context('pathRoots を省略した場合', () => {
      it('デフォルト docs/inception / docs/product/construction 配下を判定対象とする（WI-085: 後方互換）', async () => {
        // Arrange
        const rootDir = createTmpDir();
        writeFile(rootDir, 'docs/inception/_shared/product_overview_plan.md', '# plan');
        const artifact = Artifact.create({
          name: 'product-overview-plan',
          path: '{inceptionDocsRoot}/_shared/product_overview_plan.md',
          required: true,
        });
        const sut = new FileSystemArtifactExistenceChecker({ rootDir });

        // Act
        const actual = await sut.checkAll([artifact], {});

        // Assert
        expect(actual.get('docs/inception/_shared/product_overview_plan.md')).toBe(true);
      });
    });
  });
});

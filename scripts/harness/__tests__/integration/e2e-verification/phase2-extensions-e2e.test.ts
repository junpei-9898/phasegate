// @layer test
// @unit phase2-extensions
// @story H08-01
/**
 * T-041: Phase2 Extensions 実docs対象 E2E検証
 * p2:check-freshness / p2:validate-pointers が有意な結果を返すこと
 */
import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { target, context } from '../../helpers/test-helpers.js';
import { buildPhase2Extensions } from '../../../phase2-extensions/composition-root.js';

function resolveProjectRoot(): string {
  if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
    return process.cwd();
  }
  return path.resolve(process.cwd(), '../../..');
}

const projectRoot = resolveProjectRoot();

target('Phase2 Extensions E2E検証', () => {
  context('p2:check-freshness', () => {
    it('T-041-01 実プロジェクトのdocsに対して経過日数を正しく返すこと', async () => {
      // Arrange
      const mod = buildPhase2Extensions(projectRoot);
      // Act
      const actual = await mod.checkDocFreshnessUseCase.execute({});
      // Assert — スタブ「0件」ではなく有意な結果が返る
      expect(actual.results.length).toBeGreaterThan(0);
      expect(actual.summary.total).toBeGreaterThan(0);
    });
  });

  context('p2:validate-pointers', () => {
    it('T-041-02 実プロジェクトのdocsに対してポインタ検証結果を返すこと', async () => {
      // Arrange
      const mod = buildPhase2Extensions(projectRoot);
      // Act
      const actual = await mod.validateDocPointersUseCase.execute({});
      // Assert — スタブ「空配列」ではなく有意な結果
      expect(actual.summary.totalPointers).toBeGreaterThan(0);
      expect(actual.summary.totalDocuments).toBeGreaterThan(0);
    });
  });

  context('p2:generate-e2e-template', () => {
    it('T-041-03 テンプレート生成が有意なコンテンツを返すこと', async () => {
      // Arrange
      const mod = buildPhase2Extensions(projectRoot);
      // Act
      const actual = await mod.generateE2ETemplateUseCase.execute({
        targetPhase: 'Phase-1',
      });
      // Assert
      expect(actual.templateContent.length).toBeGreaterThan(0);
      expect(actual.errors).toHaveLength(0);
    });
  });
});

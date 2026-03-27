/**
 * T-041: Phase2 Extensions 実docs対象 E2E検証
 * p2:check-freshness / p2:validate-pointers が有意な結果を返すこと
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { buildPhase2Extensions } from '../../../phase2-extensions/composition-root.js';

// E2Eテストはプロジェクトルートから実行される前提（vitest.config.ts の root 設定による）
const projectRoot = process.cwd();

target('Phase2 Extensions E2E検証', () => {
  context('p2:check-freshness', () => {
    it('T-041-01 実プロジェクトのdocsに対して経過日数を正しく返すこと', async () => {
      // Arrange
      const mod = buildPhase2Extensions(projectRoot);
      // Act
      const result = await mod.checkDocFreshnessUseCase.execute({
        targetPattern: 'docs/**/*.md',
      });
      // Assert — スタブ「0件」ではなく有意な結果が返る
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.summary.total).toBeGreaterThan(0);
    });
  });

  context('p2:validate-pointers', () => {
    it('T-041-02 実プロジェクトのdocsに対してポインタ検証結果を返すこと', async () => {
      // Arrange
      const mod = buildPhase2Extensions(projectRoot);
      // Act
      const result = await mod.validateDocPointersUseCase.execute({
        targetPattern: 'docs/**/*.md',
      });
      // Assert — スタブ「空配列」ではなく有意な結果
      expect(result.summary.totalPointers).toBeGreaterThan(0);
      expect(result.summary.totalDocuments).toBeGreaterThan(0);
    });
  });

  context('p2:generate-e2e-template', () => {
    it('T-041-03 テンプレート生成が有意なコンテンツを返すこと', async () => {
      // Arrange
      const mod = buildPhase2Extensions(projectRoot);
      // Act
      const result = await mod.generateE2ETemplateUseCase.execute({
        targetPhase: 'Phase-1',
      });
      // Assert
      expect(result.templateContent.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});

// @unit skill-quality
// @layer test
// @story H10-04
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';

/**
 * H10-04: quick-implementor スキル定義のアーティファクト適合性テスト。
 *
 * このスキルの受け入れ基準は「SKILL.md というマークダウン成果物が特定のディレクティブを
 * 記述していること」であり、実行可能なハーネスコードが存在しない。存在ベースの弱い証拠
 * （ファイルがあるだけ）ではなく、AC が要求する具体的な文言を SKILL.md が実際に含むことを
 * 検証する。したがってマークダウンの読み込み結果そのものがテスト対象システムである。
 *
 * @unit: skill-quality — スキル定義の妥当性（skill validity）を検証する責務であり、
 *   skill-structure / skill-structure-validator と同じ Unit に属するのが自然。
 */

const SKILL_PATH = path.resolve(
  __dirname,
  '../../../../../skills/quick-implementor/SKILL.md',
);

function readSkill(): string {
  return readFileSync(SKILL_PATH, 'utf-8');
}

target('H10-04 quick-implementor SKILL.md アーティファクト適合性', () => {
  context('AC-1: quick-implementor の SKILL.md が作成されている', () => {
    it('SKILL.md が frontmatter で name: quick-implementor を宣言していること', () => {
      // Arrange
      const actual = readSkill();
      // Act / Assert
      expect(actual).toContain('name: quick-implementor');
      expect(actual).toContain('# Quick Implementor');
    });
  });

  context('AC-2: Quick Mode 判定（H10-02）を前提条件として使用する', () => {
    it('適用条件チェックを必須として宣言し、Quick Mode 適用可能性を前提としていること', () => {
      // Arrange
      const actual = readSkill();
      // Act / Assert
      expect(actual).toContain('## 適用条件チェック（必須）');
      expect(actual).toContain('Quick Mode 適用可能か判定する');
    });

    it('適用可能カテゴリ（bugfix/docs/test/config）を Quick Mode 対象として列挙していること', () => {
      // Arrange
      const actual = readSkill();
      // Act / Assert
      expect(actual).toContain('bugfix');
      expect(actual).toContain('docs');
      expect(actual).toContain('config');
    });

    it('適用除外を検出したら story-implementor へエスカレーションするよう規定していること', () => {
      // Arrange
      const actual = readSkill();
      // Act / Assert
      expect(actual).toContain('story-implementor');
      expect(actual).toContain('エスカレーション');
    });
  });

  context('AC-3: バリデータ緩和設定（H10-03）に基づいて品質チェックが実行される', () => {
    it('Quick Mode 品質ゲート表で L1 全ルール維持を明記していること', () => {
      // Arrange
      const actual = readSkill();
      // Act / Assert
      expect(actual).toContain('## Quick Mode 品質ゲート');
      expect(actual).toContain('全8ルール維持');
    });

    it('L2 は phase-gate 緩和、metadata/test-quality 維持と規定していること', () => {
      // Arrange
      const actual = readSkill();
      // Act / Assert
      expect(actual).toContain('metadata + test-quality 維持、phase-gate 緩和');
    });

    it('L3 は security のみ、L4 はスキップという緩和プロファイルを規定していること', () => {
      // Arrange
      const actual = readSkill();
      // Act / Assert
      expect(actual).toContain('security のみ');
      expect(actual).toContain('スキップ');
    });
  });

  context('AC-4: Atomic commit が維持される（Quick Mode でもコミット単位は保持）', () => {
    it('コミット手順で Atomic commit を明示していること', () => {
      // Arrange
      const actual = readSkill();
      // Act / Assert
      expect(actual).toContain('Atomic commit');
    });

    it('コミットメッセージに [quick] プレフィックスを付与するよう規定していること', () => {
      // Arrange
      const actual = readSkill();
      // Act / Assert
      expect(actual).toContain('[quick]');
    });
  });
});

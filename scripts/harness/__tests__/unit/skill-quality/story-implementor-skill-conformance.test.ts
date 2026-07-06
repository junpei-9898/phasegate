// @unit skill-quality
// @layer test
// @story H12-01
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { context, target } from "../../helpers/test-helpers.js";

/**
 * H12-01-AC-4: story-implementor スキル定義に TDD 品質契約（Red→Green→Refactor）が
 * 定義されていることのアーティファクト適合性テスト。
 *
 * この AC の受け入れ基準は「TDD 品質契約が SKILL.md に定義されている」ことであり、
 * 検証対象は実行可能ハーネスコードではなく `skills/story-implementor/SKILL.md` という
 * マークダウン成果物そのものである。したがって実ファイルをディスクから読み込み（モック無し）、
 * AC が要求する RED→GREEN→REFACTOR サイクルの記述が実際に含まれることを検証する。
 * 存在ベースの弱い証拠（ファイルがあるだけ）や、コード内ハードコード文字列ではなく、
 * 実成果物の安定した文言を assert する。
 *
 * @unit: skill-quality — スキル定義の妥当性（skill validity）を検証する責務であり、
 *   skill-structure / skill-structure-validator と同じ Unit に属する。
 */

const SKILL_PATH = path.resolve(__dirname, "../../../../../skills/story-implementor/SKILL.md");

function readSkill(): string {
  return readFileSync(SKILL_PATH, "utf-8");
}

target("H12-01 story-implementor SKILL.md TDD品質契約 アーティファクト適合性", () => {
  context("前提: 検証対象が実 skills/story-implementor/SKILL.md である", () => {
    // UT-SISkill-001
    it("SKILL.md が frontmatter で name: story-implementor を宣言していること", () => {
      // Arrange
      const actual = readSkill();
      // Act / Assert
      expect(actual).toContain("name: story-implementor");
      expect(actual).toContain("# Story Implementor");
    });
  });

  context("AC-4: TDD品質契約（Red→Green→Refactor）が SKILL.md に定義されている", () => {
    // @ac H12-01-AC-4
    // UT-SISkill-002
    it("Unit/IT/E2Eの各テスト段で RED→GREEN→REFACTOR サイクルが定義されていること", () => {
      // Arrange — 実成果物をディスクから読み込む（モック無し）。
      const actual = readSkill();
      // Act / Assert — TDD 実装順序セクションが 3 段のテストピラミッドとして
      // Red→Green→Refactor サイクルを明示的に定義していることを検証する。
      expect(actual).toContain("## 3. TDD実装順序（テストピラミッド準拠）");
      expect(actual).toContain("### 1. Unitテスト (RED → GREEN → REFACTOR)");
      expect(actual).toContain("### 2. ITテスト (RED → GREEN → REFACTOR)");
      expect(actual).toContain("### 3. E2E/シナリオテスト (RED → GREEN → REFACTOR)");
    });

    // @ac H12-01-AC-4
    // UT-SISkill-003
    it("Phase2実行ワークフローが各層の RED→GREEN→REFACTOR サイクルを規定していること", () => {
      // Arrange
      const actual = readSkill();
      // Act / Assert — Phase 2（execution）のワークフローが Unit→IT→E2E の各層で
      // TDD サイクルを回すこと、およびテストピラミッド原則への準拠を規定している。
      expect(actual).toContain("Unitテスト TDDサイクル");
      expect(actual).toContain("ドメインモデルの RED→GREEN→REFACTOR");
      expect(actual).toContain("アプリケーション層の RED→GREEN→REFACTOR");
      expect(actual).toContain("フロントエンドの RED→GREEN→REFACTOR");
      expect(actual).toContain("テストピラミッドの原則に準拠");
    });
  });
});

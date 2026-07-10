// @unit validator-system
// @layer infrastructure
// @story WI-248
/**
 * @layer test
 * @unit validator-system
 * @story WI-248
 *
 * WI-248 回帰テスト: AdrFoundationReferenceAdapter が実在 ADR コーパス
 * (docs/ADR) を rootDir 経由で解決できることを検証する統合テスト。
 *
 * process.cwd() には依存せず、__dirname からリポジトリ root を算出する。
 * mock で exists=true を偽装せず、実在の docs/ADR/013-story-reflection-gate.md
 * を実際に readdir/readFile する経路で検証する。
 */
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AdrFoundationReferenceAdapter } from "../../../../validator-system/infrastructure/adapters/adr-foundation-reference-adapter.js";
import { context, target } from "../../../helpers/test-helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// __tests__/integration/validator-system/adapters -> リポジトリ root は 6 階層上
const repoRoot = path.resolve(__dirname, "../../../../../..");

target("AdrFoundationReferenceAdapter (実 ADR コーパス)", () => {
  describe("exists", () => {
    context("rootDir 配下の docs/ADR に実在する ADR を渡した場合", () => {
      it("trueが返る (WI-248 AC-1)", async () => {
        // Arrange
        const adapter = new AdrFoundationReferenceAdapter(repoRoot);

        // Act
        const actual = await adapter.exists("ADR-013");

        // Assert
        expect(actual).toBe(true);
      });
    });

    context("実在しない ADR 参照を渡した場合", () => {
      it("falseが返る (WI-248 AC-3)", async () => {
        // Arrange
        const adapter = new AdrFoundationReferenceAdapter(repoRoot);

        // Act
        const actual = await adapter.exists("ADR-999");

        // Assert
        expect(actual).toBe(false);
      });
    });
  });

  describe("getMetadata", () => {
    context("rootDir 配下の docs/ADR に実在する ADR を渡した場合", () => {
      it("正しいメタデータが返る (WI-248 AC-2)", async () => {
        // Arrange
        const adapter = new AdrFoundationReferenceAdapter(repoRoot);

        // Act
        const actual = await adapter.getMetadata("ADR-013");

        // Assert
        expect(actual).not.toBeNull();
        expect(actual?.adrId).toBe("ADR-013");
        expect(actual?.title).toBe("storyReflection ゲート（inception → product 反映の機械強制）");
        expect(actual?.status).toBe("Accepted");
      });
    });

    context("実在しない ADR 参照を渡した場合", () => {
      it("nullが返る (WI-248 AC-3)", async () => {
        // Arrange
        const adapter = new AdrFoundationReferenceAdapter(repoRoot);

        // Act
        const actual = await adapter.getMetadata("ADR-999");

        // Assert
        expect(actual).toBeNull();
      });
    });
  });
});

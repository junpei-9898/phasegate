// @layer test
// @unit biome-ast-engine
// @story WI-239
import { describe, expect, it } from "vitest";
import { parseCommentDensity } from "../../../biome-ast-engine/infrastructure/parsers/comment-density-parser.js";
import { context, target } from "../../helpers/test-helpers.js";

target("parseCommentDensity (WI-239: 密度分子の定義訂正)", () => {
  describe("メタデータヘッダとJSDocは密度分子から除外される", () => {
    context("produce-attestation-input.ts を模した DTO ファイルの場合", () => {
      it("先頭メタデータヘッダとフィールド毎JSDocが分子から外れ ratio が 0.35 以下になる", () => {
        // Arrange
        const input = [
          "// @unit attestation",
          "// @layer application",
          "",
          "import type { SignatureMode } from './signature-block.js';",
          "",
          "/**",
          " * attest usecase 入力 DTO（logical_design §4.1）。",
          " */",
          "export interface ProduceAttestationInput {",
          "  /** record 出力先パス。 */",
          "  readonly out: string;",
          '  /** gateResult != "pass" なら record を出力せず exit 1。 */',
          "  readonly requirePass: boolean;",
          "  /** 生成 document を stdout へエコーするか。 */",
          "  readonly emitJson: boolean;",
          "  /** 署名モード。signed は not-yet-implemented。 */",
          "  readonly mode: SignatureMode;",
          "}",
        ].join("\n");

        // Act
        const actual = parseCommentDensity(input);
        const ratio = actual.logicalLineCount === 0 ? 0 : actual.commentLineCount / actual.logicalLineCount;

        // Assert
        expect(ratio).toBeLessThanOrEqual(0.35);
        expect(actual.commentLineCount).toBe(0);
      });
    });
  });

  describe("ポートインタフェースの宣言前JSDocは除外される", () => {
    context("gate-result-source-port.ts を模した port ファイルの場合", () => {
      it("宣言前 JSDoc が分子から外れ ratio が 0.35 以下になる", () => {
        // Arrange
        const input = [
          "// @unit attestation",
          "// @layer application",
          "",
          "/**",
          " * ci-check の1バリデータ結果を写す plain DTO。",
          " */",
          "export interface GateValidatorResult {",
          "  readonly validatorId: string;",
          "  readonly passed: boolean;",
          "  readonly skipped: boolean;",
          "}",
          "",
          "/**",
          " * gate 実行結果を取得する調停ポート（application 所有）。",
          " * black-box observation: 実体は subprocess phasegate:ci-check --json。",
          " * 集約不変条件に関与しないため domain ではなく application に配置する。",
          " */",
          "export interface GateResultSourcePort {",
          "  fetchGateResult(): Promise<{",
          "    readonly allPassed: boolean;",
          "    readonly validatorResults: readonly GateValidatorResult[];",
          "  }>;",
          "}",
        ].join("\n");

        // Act
        const actual = parseCommentDensity(input);
        const ratio = actual.logicalLineCount === 0 ? 0 : actual.commentLineCount / actual.logicalLineCount;

        // Assert
        expect(ratio).toBeLessThanOrEqual(0.35);
        expect(actual.commentLineCount).toBe(0);
      });
    });
  });

  describe("narrativeな//コメント洪水は依然として検出される", () => {
    context("実コードに大量の説明コメントが混在する場合", () => {
      it("density-relevant コメント数が保たれ ratio が 0.35 を超える", () => {
        // Arrange
        const input = [
          "export function compute(a: number, b: number): number {",
          "  // step 1: normalize the first operand",
          "  const x = a * 2;",
          "  // step 2: normalize the second operand as well",
          "  const y = b * 3;",
          "  // step 3: combine both normalized operands",
          "  const z = x + y;",
          "  // step 4: apply the final correction factor here",
          "  // step 5: this extra note explains nothing new at all",
          "  // step 6: yet another redundant narrative line here",
          "  const w = z - 1;",
          "  // step 7: and one more filler comment before return",
          "  return w;",
          "}",
        ].join("\n");

        // Act
        const actual = parseCommentDensity(input);
        const ratio = actual.logicalLineCount === 0 ? 0 : actual.commentLineCount / actual.logicalLineCount;

        // Assert
        expect(ratio).toBeGreaterThan(0.35);
      });
    });
  });
});

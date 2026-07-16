// @layer test
// @unit validator-system
// @story H08-01
// @work-item-id WI-156
/**
 * T-042: L0 runtime hook 案内 E2E検証
 * validate --layer L0 が legacy validator ではなく runtime hook 案内を返すこと
 */
import { describe, expect, it } from "vitest";
import { createValidatorSystemModule } from "../../../validator-system/composition-root.js";
import { context, target } from "../../helpers/test-helpers.js";

target("L0 Runtime Hook E2E検証", () => {
  context("5層防御モデル", () => {
    it("T-042-01 レジストリにL2-L4のバリデータのみが登録されていること", () => {
      // Arrange
      const mod = createValidatorSystemModule();
      // Act
      const actual = mod.registry.getAllDefinitions();
      // Assert — L2(7) + L3(7) + L4(7) = 21
      // WI-222 (HF2-05): L4-007 (ac-level-traceability, default-OFF advisory) を registry に追加。
      // WI-227 (H16-03): L3-005 (ac-bound-coverage, default-OFF fail-closed) を registry に追加。
      // WI-258 (L2-016): coverage-report attestation gate (warning-only) を registry に追加。
      // WI-259 (L3-006): injection-scan (advisory, warning-only) を registry に追加。
      // WI-268 (L3-007): coverage-attestation-verification (fail-closed) を registry に追加。
      expect(actual.map((d) => d.validatorId.value)).toEqual([
        "L2-001",
        "L2-002",
        "L2-003",
        "L2-013",
        "L2-014",
        "L2-015",
        "L2-016",
        "L3-001",
        "L3-002",
        "L3-003",
        "L3-004",
        "L3-005",
        "L3-006",
        "L3-007",
        "L4-001",
        "L4-002",
        "L4-003",
        "L4-004",
        "L4-005",
        "L4-006",
        "L4-007",
      ]);
      const layers = new Set(actual.map((d) => d.validatorId.layer));
      expect(layers.has("L0")).toBe(false);
      expect(layers.has("L2")).toBe(true);
      expect(layers.has("L3")).toBe(true);
      expect(layers.has("L4")).toBe(true);
    });

    it("T-042-02 L2-L4バリデータが引き続き登録されていること", () => {
      // Arrange
      const mod = createValidatorSystemModule();
      // Act
      const actual = {
        l2Defs: mod.registry.listByLayer("L2"),
        l3Defs: mod.registry.listByLayer("L3"),
        l4Defs: mod.registry.listByLayer("L4"),
      };
      // Assert
      // WI-258 (L2-016): coverage-report attestation gate (warning-only) が registry に登録されている。
      expect(actual.l2Defs.map((d) => d.validatorId.value)).toEqual([
        "L2-001",
        "L2-002",
        "L2-003",
        "L2-013",
        "L2-014",
        "L2-015",
        "L2-016",
      ]);
      // WI-259 (L3-006): injection-scan (advisory, warning-only) が registry に登録されている。
      // WI-268 (L3-007): coverage-attestation-verification (fail-closed) が registry に登録されている。
      expect(actual.l3Defs.map((d) => d.validatorId.value)).toEqual([
        "L3-001",
        "L3-002",
        "L3-003",
        "L3-004",
        "L3-005",
        "L3-006",
        "L3-007",
      ]);
      // WI-222 (HF2-05): L4-007 (default-OFF advisory) が registry に登録されている。
      expect(actual.l4Defs.map((d) => d.validatorId.value)).toEqual([
        "L4-001",
        "L4-002",
        "L4-003",
        "L4-004",
        "L4-005",
        "L4-006",
        "L4-007",
      ]);
    });

    it("T-042-03 L0設定がなくてもL2-L4が機能すること", () => {
      // Arrange
      const mod = createValidatorSystemModule({
        preset: "standard",
        layers: {
          L2: { enabled: true, validators: ["L2-001", "L2-002", "L2-003", "L2-013", "L2-014", "L2-015"] },
          L3: { enabled: true, validators: ["L3-001", "L3-002", "L3-003", "L3-004"] },
          L4: { enabled: true, validators: ["L4-001", "L4-002", "L4-003", "L4-004", "L4-005", "L4-006"] },
        },
      });
      // Act
      const actual = mod.registry.listByLayer("L2");
      // Assert — registry は config の validators 配列に依存せず全 L2 定義を登録する
      // （config 側リストは L0 設定なしでも機能する意図を保つため最小のまま。
      //  WI-258 で L2-016 が registry に常設されたため期待リストへ追加）。
      expect(actual.map((d) => d.validatorId.value)).toEqual([
        "L2-001",
        "L2-002",
        "L2-003",
        "L2-013",
        "L2-014",
        "L2-015",
        "L2-016",
      ]);
    });
  });

  context("RunValidatorsHandler L0案内", () => {
    it("T-042-04 ハンドラがruntime hook案内を返すこと", async () => {
      // Arrange
      const mod = createValidatorSystemModule();
      // Act
      const actual = await mod.handlers.runValidators.execute({
        layer: "L0",
        format: "agent",
      });
      // Assert
      expect(actual.exitCode).toBe(0);
      expect(actual.output).toContain("L0 validator execution has been retired");
      expect(actual.output).toContain("agent-integration hooks");
      expect(actual.output).not.toContain("L0-001");
    });
  });
});

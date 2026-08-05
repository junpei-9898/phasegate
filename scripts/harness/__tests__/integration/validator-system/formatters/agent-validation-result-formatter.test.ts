/**
 * @layer test
 * @unit validator-system
 * @story H08-05
 * @work-item-id WI-357
 */
import { describe, expect, it } from "vitest";
import type { AggregatedValidationReport } from "../../../../validator-system/application/dto/aggregated-validation-report.js";
import { buildPhaseGateRecoverySuggestion } from "../../../../validator-system/infrastructure/adapters/phase-dependency-phase-gate-policy-adapter.js";
import { AgentValidationResultFormatter } from "../../../../validator-system/presentation/formatters/agent-validation-result-formatter.js";
import { context, target } from "../../../helpers/test-helpers.js";

function buildReport(suggestion: string): AggregatedValidationReport {
  return {
    overallPassed: false,
    totalValidators: 1,
    passedValidators: 0,
    failedValidators: 1,
    skippedValidators: 0,
    allErrors: [],
    summary: {
      totalErrors: 1,
      totalWarnings: 0,
      errorsByLayer: { L2: 1, L3: 0, L4: 0 },
    },
    results: [
      {
        validatorId: "phase-gate",
        passed: false,
        errors: [{ code: "L2-001", severity: "error", message: "prerequisites missing", suggestion }],
        durationMs: 10,
        skipped: false,
      },
    ],
  };
}

target("AgentValidationResultFormatter — 複数行 suggestion (WI-357 / issue #29)", () => {
  describe("SUGGESTION の出力", () => {
    context("単一行 suggestion の場合", () => {
      it("SUGGESTION 行がそのまま 1 行で出力されること", () => {
        // Arrange
        const report = buildReport("sync design");

        // Act
        const actual = new AgentValidationResultFormatter().format(report);

        // Assert
        expect(actual).toContain("    SUGGESTION: sync design");
      });
    });

    context("複数行 suggestion の場合", () => {
      it("2 行目以降が継続行としてインデントされること", () => {
        // Arrange
        const report = buildReport("first line\nsecond line\nthird line");

        // Act
        const actual = new AgentValidationResultFormatter().format(report);

        // Assert
        expect(actual).toContain("    SUGGESTION: first line");
        expect(actual).toContain("      second line");
        expect(actual).toContain("      third line");
      });

      it("インデントされていない継続行を出力しないこと", () => {
        // Arrange
        const report = buildReport("first line\nsecond line");

        // Act
        const actual = new AgentValidationResultFormatter().format(report);

        // Assert
        expect(actual.split("\n")).not.toContain("second line");
      });
    });
  });
});

target("buildPhaseGateRecoverySuggestion (WI-357 / issue #29)", () => {
  describe("L2-001 の suggestion 内容", () => {
    context("unitName が与えられた場合", () => {
      it("scaffold-design コマンドに unit 名が埋め込まれること", () => {
        // Arrange
        const unitName = "payments";

        // Act
        const actual = buildPhaseGateRecoverySuggestion(unitName);

        // Assert
        expect(actual).toContain("npx phasegate scaffold-design --unit payments");
      });

      it("文書構成の参照先として SKILL.md が案内されること", () => {
        // Arrange
        const unitName = "payments";

        // Act
        const actual = buildPhaseGateRecoverySuggestion(unitName);

        // Assert
        expect(actual).toContain("skills/logical-designer/SKILL.md");
        expect(actual).toContain("npx phasegate skills info");
      });

      it("到達不能な templates/ 配下のパスを案内しないこと", () => {
        // Arrange
        const unitName = "payments";

        // Act
        const actual = buildPhaseGateRecoverySuggestion(unitName);

        // Assert
        expect(actual).not.toContain("templates/logical_design.template.md");
      });
    });

    context("unitName が空文字の場合", () => {
      it("プレースホルダ <unit-id> にフォールバックすること", () => {
        // Arrange
        const unitName = "   ";

        // Act
        const actual = buildPhaseGateRecoverySuggestion(unitName);

        // Assert
        expect(actual).toContain("npx phasegate scaffold-design --unit <unit-id>");
      });
    });
  });
});

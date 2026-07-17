/**
 * @layer test
 * @unit validator-system
 * @story H08-02
 * @work-item-id WI-317
 * @work-item-id WI-324
 */
import { describe, expect, it, vi } from "vitest";
import { ValidationResultContractMapper } from "../../../../validator-system/application/mappers/validation-result-contract-mapper.js";
import {
  CoverageReportNotFoundError,
  RunL3ValidatorsUseCase,
} from "../../../../validator-system/application/use-cases/run-l3-validators-usecase.js";
import type { AcCoveragePolicyPort } from "../../../../validator-system/domain/ports/ac-coverage-policy-port.js";
import { ValidatorExecutionService } from "../../../../validator-system/domain/services/validator-execution-service.js";
import { context, target } from "../../../helpers/test-helpers.js";
import { createFullRegistry, createLayerConfig } from "../helpers.js";

function createL3UseCase(
  layerConfigOverrides?: Partial<{ enabled: boolean; strictOnly: boolean; thresholds: Record<string, number> }>,
  coveragePort?: {
    getCoverage: () => Promise<{
      overallCoverage: number;
      perFileCoverage: readonly { filePath: string; coverage: number }[];
    }>;
  },
  acCoveragePolicyPort?: AcCoveragePolicyPort,
) {
  const registry = createFullRegistry();
  const executionService = new ValidatorExecutionService({});
  const mapper = new ValidationResultContractMapper();
  const mockValidatorConfigPort = {
    getLayerConfig: vi.fn().mockResolvedValue(createLayerConfig("L3", layerConfigOverrides ?? {})),
  };
  return new RunL3ValidatorsUseCase({
    validatorRegistry: registry,
    validatorExecutionService: executionService,
    validatorConfigPort: mockValidatorConfigPort,
    contractMapper: mapper,
    coverageReportPort: coveragePort,
    acCoveragePolicyPort,
  });
}

target("RunL3ValidatorsUseCase", () => {
  describe("全L3バリデータの実行", () => {
    context("validatorIdsを省略した場合", () => {
      it("全L3バリデータ（L3-001〜L3-004, L3-006）が実行され5件の結果が返る (IT-UC-RunL3-001)", async () => {
        // Arrange
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockResolvedValue({ overallCoverage: 92, perFileCoverage: [] }),
        };
        const usecase = createL3UseCase({}, mockCoverageReportPort);
        const input = { targetPaths: ["src/"] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        // WI-259: L3-006 (injection-scan, advisory default-ON) が加わり 5 件。
        // injectionScanPolicyPort 未配線のため L3-006 は skip（passed=true）で返る。
        expect(actual).toHaveLength(5);
        expect(actual.every((r) => r.passed === true)).toBe(true);
      });
    });

    context('preset="standard"でstrictOnly=falseの場合', () => {
      it("L3-002（strictOnly）がskipped=trueで返る (IT-UC-RunL3-002)", async () => {
        // Arrange
        const usecase = createL3UseCase({ strictOnly: false });
        const input = { targetPaths: ["src/"] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l3002 = actual.find((r) => r.validatorId === "L3-002");
        expect(l3002?.skipped).toBe(true);
      });
    });

    context('preset="strict"でstrictOnly=trueの場合', () => {
      it("L3-002も実行対象になりskipped=falseで返る (IT-UC-RunL3-003)", async () => {
        // Arrange
        const usecase = createL3UseCase({ strictOnly: true });
        const input = { targetPaths: ["src/"] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l3002 = actual.find((r) => r.validatorId === "L3-002");
        expect(l3002?.skipped).toBe(false);
      });
    });

    context("LayerConfig.enabled=falseの場合", () => {
      it("空のValidationResultContract[]が返る (IT-UC-RunL3-004)", async () => {
        // Arrange
        const usecase = createL3UseCase({ enabled: false });
        const input = { targetPaths: ["src/"] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        expect(actual).toHaveLength(0);
      });
    });

    context("coverageReportPathを指定した場合", () => {
      it("L3-003がpassする (IT-UC-RunL3-005)", async () => {
        // Arrange
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockResolvedValue({ overallCoverage: 92, perFileCoverage: [] }),
        };
        const usecase = createL3UseCase(
          { thresholds: { coverageThreshold: 90, bundleSizeLimit: 512000 } },
          mockCoverageReportPort,
        );
        const input = { targetPaths: ["src/"], coverageReportPath: "coverage/summary.json" };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        // WI-259: L3-006 (advisory default-ON) が加わり 5 件。
        expect(actual).toHaveLength(5);
        const l3003 = actual.find((r) => r.validatorId === "L3-003");
        expect(l3003?.passed).toBe(true);
      });
    });
  });

  describe("異常系", () => {
    context("coverageThresholdが設定済みだがカバレッジレポートが存在しない場合（FAIL-CLOSED）", () => {
      it("L3-003がpassed=falseで返り例外は送出されず兄弟バリデータも結果を返すこと (IT-UC-RunL3-006)", async () => {
        // Arrange
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockRejectedValue(new CoverageReportNotFoundError("nonexistent/coverage.json")),
        };
        const usecase = createL3UseCase(
          { thresholds: { coverageThreshold: 90, bundleSizeLimit: 512000 } },
          mockCoverageReportPort,
        );
        const input = { targetPaths: ["src/"], coverageReportPath: "nonexistent/coverage.json" };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        // WI-259: L3-006 (advisory default-ON) が加わり 5 件。
        expect(actual).toHaveLength(5);
        const l3003 = actual.find((r) => r.validatorId === "L3-003");
        expect(l3003?.passed).toBe(false);
        expect(l3003?.skipped).toBe(false);
        expect(l3003?.errors[0]?.message ?? "").toContain("カバレッジレポートが見つかりません");
        // 兄弟バリデータがクラッシュせず結果を返していること（all-error にならない）
        const siblingIds = actual.map((r) => r.validatorId).filter((id) => id !== "L3-003");
        expect(siblingIds).toEqual(["L3-001", "L3-002", "L3-004", "L3-006"]);
      });
    });

    context("coverageThresholdが未設定（null）の場合（オプトイン）", () => {
      it("L3-003がskipped=trueかつスキップ理由付きで返ること (IT-UC-RunL3-008)", async () => {
        // Arrange
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockResolvedValue({ overallCoverage: 100, perFileCoverage: [] }),
        };
        const usecase = createL3UseCase({ thresholds: {} }, mockCoverageReportPort);
        const input = { targetPaths: ["src/"], coverageReportPath: "coverage/summary.json" };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l3003 = actual.find((r) => r.validatorId === "L3-003");
        expect(l3003?.skipped).toBe(true);
        expect(l3003?.passed).toBe(true);
        expect(l3003?.skipReason ?? "").toContain("coverageThreshold が未設定");
        // getCoverage() は呼ばれないこと（未設定時は透過スキップ）
        expect(mockCoverageReportPort.getCoverage).not.toHaveBeenCalled();
      });
    });

    context("coverageThreshold=0の場合（opt-out。WI-317 / github#37）", () => {
      it("L3-003がskipped=trueで返りgetCoverage()は呼ばれないこと (IT-UC-RunL3-009)", async () => {
        // Arrange
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockRejectedValue(new CoverageReportNotFoundError("nonexistent/coverage.json")),
        };
        const usecase = createL3UseCase({ thresholds: { coverageThreshold: 0 } }, mockCoverageReportPort);
        const input = { targetPaths: ["src/"] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l3003 = actual.find((r) => r.validatorId === "L3-003");
        expect(l3003?.skipped).toBe(true);
        expect(l3003?.passed).toBe(true);
        expect(l3003?.skipReason ?? "").toContain("0 で opt-out");
        // threshold=0 のときは透過スキップ（レポート不在でも FAIL しない）
        expect(mockCoverageReportPort.getCoverage).not.toHaveBeenCalled();
      });
    });

    context("coverageThreshold=90でレポート不在FAILになった場合のsuggestion", () => {
      it("opt-out（coverageThreshold: 0）とproject.languagesの案内が含まれること (IT-UC-RunL3-010)", async () => {
        // Arrange
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockRejectedValue(new CoverageReportNotFoundError("nonexistent/coverage.json")),
        };
        const usecase = createL3UseCase(
          { thresholds: { coverageThreshold: 90, bundleSizeLimit: 512000 } },
          mockCoverageReportPort,
        );
        const input = { targetPaths: ["src/"], coverageReportPath: "nonexistent/coverage.json" };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l3003 = actual.find((r) => r.validatorId === "L3-003");
        expect(l3003?.passed).toBe(false);
        expect(l3003?.errors[0]?.message ?? "").toContain("カバレッジレポートが見つかりません");
        const suggestion = l3003?.errors[0]?.suggestion ?? "";
        expect(suggestion).toContain("layers.L3.coverageThreshold を 0");
        expect(suggestion).toContain("project.languages");
      });
    });

    context("coverageThreshold=90に対してoverallCoverage=75の場合", () => {
      it("L3-003のpassed=falseかつerrorsに現在値（75）と不足分（15）が含まれる (IT-UC-RunL3-007)", async () => {
        // Arrange
        const mockCoverageReportPort = {
          getCoverage: vi.fn().mockResolvedValue({ overallCoverage: 75, perFileCoverage: [] }),
        };
        const usecase = createL3UseCase(
          { thresholds: { coverageThreshold: 90, bundleSizeLimit: 512000 } },
          mockCoverageReportPort,
        );
        const input = { targetPaths: ["src/"], coverageReportPath: "coverage/summary.json" };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l3003 = actual.find((r) => r.validatorId === "L3-003");
        expect(l3003?.passed).toBe(false);
        const errorMsg = l3003?.errors[0]?.message ?? "";
        expect(errorMsg).toContain("75");
        expect(errorMsg).toContain("15");
      });
    });
  });

  describe("L3-004 フレッシュプロジェクト SKIP（WI-324）", () => {
    context("acCoveragePolicyPortがskipped=trueを返す場合（story 未作成・matrix 未生成）", () => {
      it("L3-004がskipped=trueかつskipReason付きで返りFAILしないこと (IT-UC-RunL3-011)", async () => {
        // Arrange
        const mockAcCoveragePolicyPort: AcCoveragePolicyPort = {
          checkCoverage: vi.fn().mockResolvedValue({
            passed: true,
            errors: [],
            skipped: true,
            skipReason:
              "story 未作成のため L3-004 をスキップ（story 作成後に requirement-test-matrix を生成すると有効化されます）",
          }),
        };
        const usecase = createL3UseCase({}, undefined, mockAcCoveragePolicyPort);
        const input = { targetPaths: ["src/"] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l3004 = actual.find((r) => r.validatorId === "L3-004");
        expect(l3004?.skipped).toBe(true);
        expect(l3004?.passed).toBe(true);
        expect(l3004?.errors).toEqual([]);
        expect(l3004?.skipReason ?? "").toContain("story 未作成");
      });
    });

    context("acCoveragePolicyPortがskippedなしでpassed=falseを返す場合（story あり・matrix 不在）", () => {
      it("L3-004が従来どおりpassed=falseのfail-closedで返ること (IT-UC-RunL3-012)", async () => {
        // Arrange
        const mockAcCoveragePolicyPort: AcCoveragePolicyPort = {
          checkCoverage: vi.fn().mockResolvedValue({
            passed: false,
            errors: [
              {
                code: { value: "L3-004", toString: () => "L3-004" },
                severity: { value: "error", toString: () => "error" },
                message:
                  "AC網羅マトリクスが見つかりません: .harness/requirement-test-matrix.json（L3-004 は fail-closed）",
                suggestion: ".harness/requirement-test-matrix.json を生成してください（phasegate:generate-matrix）",
              },
            ],
          }),
        };
        const usecase = createL3UseCase({}, undefined, mockAcCoveragePolicyPort);
        const input = { targetPaths: ["src/"] };

        // Act
        const actual = await usecase.execute(input);

        // Assert
        const l3004 = actual.find((r) => r.validatorId === "L3-004");
        expect(l3004?.passed).toBe(false);
        expect(l3004?.skipped).toBe(false);
        expect(l3004?.errors[0]?.message ?? "").toContain("見つかりません");
      });
    });
  });
});

/**
 * @layer application
 * @unit validator-system
 * @work-item-id WI-212
 * @work-item-id WI-302
 * @work-item-id WI-317
 * @work-item-id WI-324
 *
 * RunL3ValidatorsUseCase — H08-02: L3バリデータ実行
 */

import type { AcBoundCoveragePolicyPort } from "../../domain/ports/ac-bound-coverage-policy-port.js";
import type { AcCoveragePolicyPort } from "../../domain/ports/ac-coverage-policy-port.js";
import type { CoverageAttestationVerificationPolicyPort } from "../../domain/ports/coverage-attestation-verification-policy-port.js";
import type { InjectionScanPolicyPort } from "../../domain/ports/injection-scan-policy-port.js";
import type { PerformanceScannerPort } from "../../domain/ports/performance-scanner-port.js";
import type { SecurityPatternScannerPort } from "../../domain/ports/security-pattern-scanner-port.js";
import type { ValidatorConfigPort } from "../../domain/ports/validator-config-port.js";
import type { WorldConstraintRederivationPolicyPort } from "../../domain/ports/world-constraint-rederivation-policy-port.js";
import { CoverageAttestationVerificationService } from "../../domain/services/coverage-attestation-verification-service.js";
import { InjectionPatternScanService } from "../../domain/services/injection-pattern-scan-service.js";
import {
  ValidatorExecutionError,
  type ValidatorExecutionService,
} from "../../domain/services/validator-execution-service.js";
import { ValidatorLanguageCapabilityService } from "../../domain/services/validator-language-capability-service.js";
import type { ValidatorRegistry } from "../../domain/services/validator-registry.js";
import { WorldConstraintRederivationService } from "../../domain/services/world-constraint-rederivation-service.js";
import type { HarnessErrorLike } from "../../domain/value-objects/validation-result.js";
import { ValidationResult } from "../../domain/value-objects/validation-result.js";
import { ValidatorId } from "../../domain/value-objects/validator-id.js";
import type { RunL3ValidatorsInput } from "../dto/run-l3-validators-input.js";
import type { ValidationResultContract } from "../dto/validation-result-contract.js";
import type { ValidationResultContractMapper } from "../mappers/validation-result-contract-mapper.js";

export class CoverageReportNotFoundError extends Error {
  constructor(path: string) {
    super(`Coverage report not found: ${path}`);
    this.name = "CoverageReportNotFoundError";
  }
}

export interface RunL3ValidatorsUseCaseDeps {
  validatorRegistry: ValidatorRegistry;
  validatorExecutionService: ValidatorExecutionService;
  validatorConfigPort: ValidatorConfigPort;
  contractMapper: ValidationResultContractMapper;
  acCoveragePolicyPort?: AcCoveragePolicyPort;
  acBoundCoveragePolicyPort?: AcBoundCoveragePolicyPort;
  coverageReportPort?: {
    getCoverage(): Promise<{
      overallCoverage: number;
      perFileCoverage: readonly { filePath: string; coverage: number }[];
    }>;
  };
  securityScannerPort?: SecurityPatternScannerPort;
  performanceScannerPort?: PerformanceScannerPort;
  /** WI-259 / ADR-030 §Decision.3.④: L3-006 (injection-scan, advisory) 用ポート。 */
  injectionScanPolicyPort?: InjectionScanPolicyPort;
  /** WI-268 / ADR-030 §Decision.1・§Decision.3.② 第2段: L3-007 (coverage-attestation-verification, fail-closed) 用ポート。 */
  coverageAttestationVerificationPolicyPort?: CoverageAttestationVerificationPolicyPort;
  /** WI-302: L3-008 authoritative World clean-corpus re-derivation port. */
  worldConstraintRederivationPolicyPort?: WorldConstraintRederivationPolicyPort;
  /** L3-005 のスコープ対象 story-id（config layers.L3.acBoundStories 由来。既定 []）。 */
  acBoundStories?: readonly string[];
}

export class RunL3ValidatorsUseCase {
  private readonly registry: ValidatorRegistry;
  private readonly executionService: ValidatorExecutionService;
  private readonly configPort: ValidatorConfigPort;
  private readonly mapper: ValidationResultContractMapper;
  private readonly acCoveragePolicyPort?: AcCoveragePolicyPort;
  private readonly acBoundCoveragePolicyPort?: AcBoundCoveragePolicyPort;
  private readonly coverageReportPort?: RunL3ValidatorsUseCaseDeps["coverageReportPort"];
  private readonly securityScannerPort?: SecurityPatternScannerPort;
  private readonly performanceScannerPort?: PerformanceScannerPort;
  private readonly injectionScanPolicyPort?: InjectionScanPolicyPort;
  private readonly coverageAttestationVerificationPolicyPort?: CoverageAttestationVerificationPolicyPort;
  private readonly worldConstraintRederivationPolicyPort?: WorldConstraintRederivationPolicyPort;
  private readonly acBoundStories: readonly string[];
  private readonly languageCapabilityService = new ValidatorLanguageCapabilityService();
  private readonly injectionScanService = new InjectionPatternScanService();
  private readonly coverageAttestationVerificationService = new CoverageAttestationVerificationService();
  private readonly worldConstraintRederivationService = new WorldConstraintRederivationService();

  constructor(deps: RunL3ValidatorsUseCaseDeps) {
    this.registry = deps.validatorRegistry;
    this.executionService = deps.validatorExecutionService;
    this.configPort = deps.validatorConfigPort;
    this.mapper = deps.contractMapper;
    this.acCoveragePolicyPort = deps.acCoveragePolicyPort;
    this.acBoundCoveragePolicyPort = deps.acBoundCoveragePolicyPort;
    this.coverageReportPort = deps.coverageReportPort;
    this.securityScannerPort = deps.securityScannerPort;
    this.performanceScannerPort = deps.performanceScannerPort;
    this.injectionScanPolicyPort = deps.injectionScanPolicyPort;
    this.coverageAttestationVerificationPolicyPort = deps.coverageAttestationVerificationPolicyPort;
    this.worldConstraintRederivationPolicyPort = deps.worldConstraintRederivationPolicyPort;
    this.acBoundStories = deps.acBoundStories ?? [];
  }

  async execute(input: RunL3ValidatorsInput): Promise<readonly ValidationResultContract[]> {
    let validatorIds: readonly ValidatorId[];
    if (input.validatorIds && input.validatorIds.length > 0) {
      validatorIds = input.validatorIds.map((id) => ValidatorId.create(id));
    } else {
      validatorIds = this.registry.listByLayer("L3").map((d) => d.validatorId);
    }

    const definitions = this.registry.select(validatorIds);

    let layerConfig: Awaited<ReturnType<ValidatorConfigPort["getLayerConfig"]>>;
    try {
      layerConfig = await this.configPort.getLayerConfig("L3");
    } catch (err) {
      throw new ValidatorExecutionError(
        `Failed to get L3 LayerConfig: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    // LayerConfig.enabled === false の場合は空を返す
    if (!layerConfig.enabled) {
      return [];
    }

    const projectLanguages = await this.getProjectLanguages();
    const { executableDefinitions, unsupportedResults, unsupportedValidatorIds } =
      this.languageCapabilityService.splitDefinitions(definitions, projectLanguages);

    const results = this.executionService.execute(executableDefinitions, [layerConfig]);
    const overrideMap = new Map<string, ValidationResult>(
      [...unsupportedResults, ...results].map((result) => [result.validatorId.value, result]),
    );

    // L3-003: カバレッジ判定（カバレッジゲートはオプトイン）
    // - coverageThreshold 未設定 or 0 → SKIP（透過的に判定をスキップ。getCoverage() は呼ばない）
    //   0 は正規の opt-out（ドメイン VO L3Config.hasCoverageGate() の「threshold > 0 でのみ有効」と整合。
    //   minimal preset の coverageThreshold: 0 もこの opt-out 意図。WI-317 / github#37）
    // - coverageThreshold > 0 → getCoverage() を try/catch で包み FAIL-CLOSED で判定する
    //   - 閾値未満 → FAIL / 閾値以上 → PASS
    //   - レポート不在などで getCoverage() が失敗 → FAIL（合格扱いにしない）
    // このブロックは例外を送出せず、L3-003 の per-validator 結果のみを差し替える。
    // これにより兄弟バリデータ（L3-001/002/004 および L2/L4 バッチ）は常に通常実行される。
    const l3003InScope =
      !unsupportedValidatorIds.has("L3-003") && definitions.some((d) => d.validatorId.value === "L3-003");
    if (this.coverageReportPort && l3003InScope) {
      const l3003Id = ValidatorId.create("L3-003");
      const threshold = layerConfig.getThreshold("coverageThreshold");

      if (threshold === null || threshold === 0) {
        overrideMap.set(
          "L3-003",
          ValidationResult.skipWithReason(
            l3003Id,
            "coverageThreshold が未設定/0 のためカバレッジ判定をスキップ（カバレッジゲートはオプトイン。0 で opt-out）",
          ),
        );
      } else {
        try {
          const coverageData = await this.coverageReportPort.getCoverage();
          if (coverageData.overallCoverage < threshold) {
            overrideMap.set(
              "L3-003",
              ValidationResult.fail(
                l3003Id,
                [
                  {
                    code: "L3-003",
                    severity: "error",
                    message: `カバレッジ不足: 現在値 ${coverageData.overallCoverage}%、不足 ${threshold - coverageData.overallCoverage}%`,
                    suggestion: `テストカバレッジを ${threshold}% 以上に引き上げてください`,
                  },
                ],
                0,
              ),
            );
          } else {
            overrideMap.set("L3-003", ValidationResult.pass(l3003Id, 0));
          }
        } catch {
          // レポート不在などで取得失敗 → FAIL-CLOSED（例外は握りつぶし per-validator FAIL に変換）
          overrideMap.set(
            "L3-003",
            ValidationResult.fail(
              l3003Id,
              [
                {
                  code: "L3-003",
                  severity: "error",
                  message: `coverageThreshold=${threshold}% が設定されていますがカバレッジレポートが見つかりません（テストをカバレッジ付きで実行してください）`,
                  suggestion:
                    '次のいずれかで解消してください: (a) テストをカバレッジ付きで実行してレポートを生成する（例: vitest --coverage）、(b) カバレッジゲートを opt-out するなら config の layers.L3.coverageThreshold を 0 に設定する、(c) 非 JS/TS プロジェクトなら project.languages を宣言する（例: ["python"]。L3-003 自体が unsupported-language SKIP になる）',
                },
              ],
              0,
            ),
          );
        }
      }
    }

    if (this.securityScannerPort) {
      const l3001Result = overrideMap.get("L3-001");
      if (l3001Result && !l3001Result.skipped) {
        const scanResult = await this.securityScannerPort.scan(input.targetPaths);
        if (!scanResult.passed) {
          overrideMap.set("L3-001", ValidationResult.fail(ValidatorId.create("L3-001"), [...scanResult.findings], 0));
        }
      }
    }

    if (this.performanceScannerPort) {
      const l3002Result = overrideMap.get("L3-002");
      if (l3002Result && !l3002Result.skipped) {
        const bundleSizeLimit = layerConfig.getThreshold("bundleSizeLimit");
        const thresholds: Record<string, number> = bundleSizeLimit !== null ? { bundleSizeLimit } : {};
        const scanResult = await this.performanceScannerPort.scan(input.targetPaths, thresholds);
        if (!scanResult.passed) {
          overrideMap.set("L3-002", ValidationResult.fail(ValidatorId.create("L3-002"), [...scanResult.findings], 0));
        }
      }
    }

    if (this.acCoveragePolicyPort) {
      const l3004Result = overrideMap.get("L3-004");
      if (l3004Result && !l3004Result.skipped) {
        const policyResult = await this.acCoveragePolicyPort.checkCoverage({
          matrixFilePath: input.requirementMatrixPath,
        });
        // WI-324: フレッシュプロジェクト（story 未作成・matrix 未生成）は policy adapter が
        // skipped=true を返すので、L3-003 の opt-out と同じ表現で skipWithReason に変換する。
        // story が存在するのに matrix が不在の場合は従来どおり fail-closed（下の分岐）。
        if (policyResult.skipped) {
          overrideMap.set(
            "L3-004",
            ValidationResult.skipWithReason(
              ValidatorId.create("L3-004"),
              policyResult.skipReason ??
                "story 未作成のため L3-004 をスキップ（story 作成後に requirement-test-matrix を生成すると有効化されます）",
            ),
          );
        } else if (!policyResult.passed) {
          overrideMap.set("L3-004", ValidationResult.fail(ValidatorId.create("L3-004"), [...policyResult.errors], 0));
        }
      }
    }

    // L3-005: AC-bound coverage（fail-closed, default-OFF）。
    // override map に unskipped な L3-005 がある場合のみ policy を呼ぶ（L3-004 と同じ方式）。
    if (this.acBoundCoveragePolicyPort) {
      const l3005Result = overrideMap.get("L3-005");
      if (l3005Result && !l3005Result.skipped) {
        const policyResult = await this.acBoundCoveragePolicyPort.checkAcBoundCoverage({
          matrixFilePath: input.requirementMatrixPath,
          acBoundStories: input.acBoundStories ?? this.acBoundStories,
        });
        if (!policyResult.passed) {
          overrideMap.set("L3-005", ValidationResult.fail(ValidatorId.create("L3-005"), [...policyResult.errors], 0));
        }
      }
    }

    // WI-259 / ADR-030 §Decision.3.④: L3-006 advisory インジェクションスキャナ。
    // 指示搭載ファイルの既知インジェクションパターンを検出し warning-only の finding として報告する。
    // finding は必ず severity=warning のため ADR-017 集約規則（failOnWarning=false 既定）で overall PASS。
    // blocking にしない（§4.(b): 「すり抜け＝安全」の誤信頼を避ける）。default-OFF/skip 時は override しない。
    if (this.injectionScanPolicyPort) {
      const l3006Result = overrideMap.get("L3-006");
      if (l3006Result && !l3006Result.skipped) {
        const targets = await this.injectionScanPolicyPort.collect();
        const report = this.injectionScanService.scan(targets);
        if (report.hasFindings()) {
          const errors: HarnessErrorLike[] = report.findings.map((finding) => ({
            code: { value: "L3-006", toString: () => "L3-006" },
            severity: { value: "warning", toString: () => "warning" },
            message: `${finding.sourcePath}:${finding.lineNumber} [${finding.kind}] ${finding.message}`,
            suggestion: finding.suggestion,
            sourcePath: finding.sourcePath,
          }));
          overrideMap.set("L3-006", ValidationResult.fail(ValidatorId.create("L3-006"), errors, 0));
        } else {
          overrideMap.set("L3-006", ValidationResult.pass(ValidatorId.create("L3-006"), 0));
        }
      }
    }

    // WI-268 / ADR-030 §Decision.1・§Decision.3.② 第2段: L3-007 coverage-attestation-verification。
    // coverage_report の @attestation 参照を requirement-test-matrix に突合し、解決不能な参照
    // （空手形の attestation）を fail-closed の error として遮断する（L2-016 の authoritative 相棒）。
    // 参照ありで matrix を読めなければ fail-closed で FAIL。default-OFF/skip 時は override しない。
    if (this.coverageAttestationVerificationPolicyPort) {
      const l3007Result = overrideMap.get("L3-007");
      if (l3007Result && !l3007Result.skipped) {
        const l3007Id = ValidatorId.create("L3-007");
        const collected = await this.coverageAttestationVerificationPolicyPort.collect();
        if (collected.matrixError !== null) {
          overrideMap.set(
            "L3-007",
            ValidationResult.fail(
              l3007Id,
              [
                {
                  code: { value: "L3-007", toString: () => "L3-007" },
                  severity: { value: "error", toString: () => "error" },
                  message: collected.matrixError,
                  suggestion:
                    ".harness/requirement-test-matrix.json を生成してください（phasegate:generate-matrix）。パスは config の layers.L3.requirementMatrixPath で変更できます。",
                },
              ],
              0,
            ),
          );
        } else {
          const report = this.coverageAttestationVerificationService.verify(collected.references, collected.evidence);
          if (report.hasFindings()) {
            const errors: HarnessErrorLike[] = report.findings.map((finding) => ({
              code: { value: "L3-007", toString: () => "L3-007" },
              severity: { value: "error", toString: () => "error" },
              message: finding.message,
              suggestion: finding.suggestion,
              sourcePath: finding.sourcePath,
            }));
            overrideMap.set("L3-007", ValidationResult.fail(l3007Id, errors, 0));
          } else {
            overrideMap.set("L3-007", ValidationResult.pass(l3007Id, 0));
          }
        }
      }
    }

    // WI-302 / ADR-030 trust root: L3-008 independently re-derives World obligations from the
    // current corpus and versioned control declarations. The adapter has no persisted-report input.
    if (this.worldConstraintRederivationPolicyPort) {
      const l3008Result = overrideMap.get("L3-008");
      if (l3008Result && !l3008Result.skipped) {
        const observation = await this.worldConstraintRederivationPolicyPort.collect();
        const findings = this.worldConstraintRederivationService.evaluate(observation);
        if (findings.length > 0) {
          const errors: HarnessErrorLike[] = findings.map((finding) => ({
            code: { value: "L3-008", toString: () => "L3-008" },
            severity: { value: finding.severity, toString: () => finding.severity },
            message: finding.message,
            suggestion: finding.suggestion,
            sourcePath: finding.sourcePath,
            ruleId: finding.ruleId,
            violationFingerprint: finding.violationFingerprint,
            constraintId: finding.constraintId,
            classification: finding.classification,
          }));
          overrideMap.set("L3-008", ValidationResult.fail(ValidatorId.create("L3-008"), errors, 0));
        } else {
          overrideMap.set("L3-008", ValidationResult.pass(ValidatorId.create("L3-008"), 0));
        }
      }
    }

    const finalResults = definitions.map(
      (definition) => overrideMap.get(definition.validatorId.value) ?? ValidationResult.skip(definition.validatorId),
    );
    return this.mapper.toContracts(finalResults);
  }

  private async getProjectLanguages(): Promise<readonly string[]> {
    return this.configPort.getProjectLanguages ? await this.configPort.getProjectLanguages() : ["typescript"];
  }
}

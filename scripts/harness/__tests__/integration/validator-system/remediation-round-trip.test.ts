/**
 * @layer test
 * @unit validator-system
 * @work-item-id WI-335
 *
 * remediation-round-trip — エラー案内の「機械往復」保証テスト
 *
 * phasegate の中核価値は「エラー + 次の 1 手」でエージェントの自己修正を駆動することにある。
 * このテストは remediationType: 'mechanical' と宣言されたエラーについて、
 * 「エラー → suggestion が案内する操作をテストコードで機械適用 → 同じ validator を再実行 → pass」
 * の往復を CI で保証する。
 *
 * 保証の要（フェイル構造）:
 * mechanical と宣言されたエラーの suggestion が現在のプロジェクト状態で機械適用不能なら
 * このテストは fail する。機械適用器（applyMechanicalRemediation）は suggestion の文言
 * そのものを解析して操作を導出するため、将来 suggestion 文言と実挙動が乖離した場合
 * （例: 案内された opt-out キーの改名 = github#37 型、案内どおり適用しても直らない = github#39 型）、
 * 導出失敗の例外または再実行 fail としてここで検出される。
 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ValidationResultContractMapper } from "../../../validator-system/application/mappers/validation-result-contract-mapper.js";
import { RunL2ValidatorsUseCase } from "../../../validator-system/application/use-cases/run-l2-validators-usecase.js";
import { RunL3ValidatorsUseCase } from "../../../validator-system/application/use-cases/run-l3-validators-usecase.js";
import { buildDefaultRegistry } from "../../../validator-system/composition-root.js";
import { ValidatorExecutionService } from "../../../validator-system/domain/services/validator-execution-service.js";
import { HarnessConfigValidatorConfigAdapter } from "../../../validator-system/infrastructure/adapters/harness-config-validator-config-adapter.js";
import { JsonCoverageReportAdapter } from "../../../validator-system/infrastructure/adapters/json-coverage-report-adapter.js";
import { TraceabilityMetadataPolicyAdapter } from "../../../validator-system/infrastructure/adapters/traceability-metadata-policy-adapter.js";

/** 機械適用のコンテキスト（fixture プロジェクトの状態） */
interface MechanicalRemediationContext {
  /** suggestion がソースファイルへの編集を案内する場合の対象ファイル */
  readonly sourceFilePath?: string;
  /** suggestion が config 編集を案内する場合の phasegate config JSON パス */
  readonly configFilePath?: string;
}

interface RemediationErrorLike {
  readonly suggestion: string;
  readonly remediationType?: unknown;
  [key: string]: unknown;
}

/**
 * mechanical と宣言されたエラーの suggestion を「解釈なし」で機械適用する。
 *
 * 意図的に suggestion 文言そのものを解析する（構造フィールドを見ない）:
 * エージェントが実際に読むのは suggestion 文字列であり、この適用器が導出できない
 * suggestion は「エラー案内として機械往復が壊れている」ことを意味するため、
 * 例外を投げてテストを fail させる。
 */
async function applyMechanicalRemediation(
  error: RemediationErrorLike,
  ctx: MechanicalRemediationContext,
): Promise<void> {
  if (error.remediationType !== "mechanical") {
    throw new Error(
      `remediationType: 'mechanical' と宣言されていないエラーは機械適用の対象外です (got: ${String(error.remediationType)})`,
    );
  }

  const suggestion = error.suggestion;

  // 戦略1: 「// @<directive> <値> を先頭コメントに追加してください」（L2-002 metadata）
  const prependMatch = suggestion.match(/^(\/\/\s*@[a-z-]+)\s+(\S+)\s*を先頭コメントに追加してください/);
  if (prependMatch) {
    if (!ctx.sourceFilePath) {
      throw new Error("suggestion はソースファイル編集を案内していますが対象ファイルが不明です");
    }
    const directive = prependMatch[1];
    const value = resolveSuggestedValue(prependMatch[2]);
    const current = await readFile(ctx.sourceFilePath, "utf-8");
    await writeFile(ctx.sourceFilePath, `${directive} ${value}\n${current}`, "utf-8");
    return;
  }

  // 戦略2: 「config の layers.L3.coverageThreshold を 0 に設定する」（L3-003 opt-out / WI-317）
  if (/layers\.L3\.coverageThreshold\s*を\s*0\s*に設定/.test(suggestion)) {
    if (!ctx.configFilePath) {
      throw new Error("suggestion は config 編集を案内していますが config ファイルが不明です");
    }
    const config = JSON.parse(await readFile(ctx.configFilePath, "utf-8")) as {
      layers?: { L3?: { coverageThreshold?: number } };
    };
    config.layers = config.layers ?? {};
    config.layers.L3 = config.layers.L3 ?? {};
    config.layers.L3.coverageThreshold = 0;
    await writeFile(ctx.configFilePath, JSON.stringify(config, null, 2), "utf-8");
    return;
  }

  // mechanical 宣言なのに機械適用可能な操作を導出できない = 案内の機械往復が壊れている
  throw new Error(
    `mechanical と宣言されたエラーの suggestion から機械適用可能な操作を導出できません（案内と実挙動の乖離）: ${suggestion}`,
  );
}

/** suggestion 内の値指定を具体値へ解決する（プレースホルダ / 選択肢） */
function resolveSuggestedValue(valueSpec: string): string {
  if (/^<.+>$/.test(valueSpec)) {
    return "remediation-fixture";
  }
  if (valueSpec.includes("|")) {
    return valueSpec.split("|")[0];
  }
  return valueSpec;
}

describe("IT: remediation-round-trip — mechanical 宣言エラーの機械往復保証 (WI-335)", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "phasegate-wi335-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function buildL2UseCase(rootDir: string): RunL2ValidatorsUseCase {
    const configPort = new HarnessConfigValidatorConfigAdapter({ layers: { L2: { validators: ["L2-002"] } } }, rootDir);
    return new RunL2ValidatorsUseCase({
      validatorRegistry: buildDefaultRegistry(),
      validatorExecutionService: new ValidatorExecutionService({ configPort }),
      validatorConfigPort: configPort,
      contractMapper: new ValidationResultContractMapper(),
      metadataPolicyPort: new TraceabilityMetadataPolicyAdapter(),
    });
  }

  async function buildL3UseCaseFromConfigFile(
    rootDir: string,
    configFilePath: string,
  ): Promise<RunL3ValidatorsUseCase> {
    // CLI の各実行が config を読み直すのと同じ構造: config ファイルを毎回読み直して組み立てる
    const config = JSON.parse(await readFile(configFilePath, "utf-8")) as object;
    const configPort = new HarnessConfigValidatorConfigAdapter(config, rootDir);
    return new RunL3ValidatorsUseCase({
      validatorRegistry: buildDefaultRegistry(),
      validatorExecutionService: new ValidatorExecutionService({ configPort }),
      validatorConfigPort: configPort,
      contractMapper: new ValidationResultContractMapper(),
      coverageReportPort: new JsonCoverageReportAdapter(join(rootDir, "coverage", "coverage-summary.json")),
    });
  }

  // ケース (a): L2-002 metadata 欠落
  it("L2-002 の @unit/@layer 欠落エラーは mechanical 宣言され、suggestion の機械適用 → 再実行で pass になること", async () => {
    // Arrange: @unit / @layer コメントを持たないソースファイル
    const sourceFilePath = join(tempDir, "sample-service.ts");
    await writeFile(sourceFilePath, "export const sampleValue = 1;\n", "utf-8");
    const useCase = buildL2UseCase(tempDir);
    const input = {
      validatorIds: ["L2-002"],
      targetPaths: [sourceFilePath],
      unitName: "remediation-fixture",
      currentPhase: "construction",
    };

    // Act (1st run): エラーを検出する
    const actualFirst = await useCase.execute(input);

    // Assert (1st run): L2-002 fail + 全エラーが mechanical 宣言（@unit / @layer の 2 件）
    const firstResult = actualFirst.find((r) => r.validatorId === "L2-002");
    expect(firstResult?.passed).toBe(false);
    expect(firstResult?.errors).toHaveLength(2);
    for (const error of firstResult?.errors ?? []) {
      expect(error.remediationType).toBe("mechanical");
    }

    // Act (機械適用): suggestion が案内する操作をテストコードで機械適用する。
    // suggestion から操作を導出できなければ applyMechanicalRemediation が throw してこのテストは fail する
    for (const error of firstResult?.errors ?? []) {
      await applyMechanicalRemediation(error as RemediationErrorLike, { sourceFilePath });
    }

    // Act (2nd run): 同じ validator を再実行する
    const actualSecond = await useCase.execute(input);

    // Assert (2nd run): エラーが消えて pass になる（往復完了）
    const secondResult = actualSecond.find((r) => r.validatorId === "L2-002");
    expect(secondResult?.passed).toBe(true);
    expect(secondResult?.errors).toHaveLength(0);
  });

  // ケース (b): L3-003 カバレッジ設定あり + レポート不在 → opt-out 案内
  it("L3-003 のレポート不在エラーは mechanical 宣言され、suggestion の coverageThreshold 0 opt-out を機械適用 → 再実行で SKIP（実効 pass）になること", async () => {
    // Arrange: coverageThreshold: 90 の config + カバレッジレポート不在の fixture プロジェクト
    const configFilePath = join(tempDir, "phasegate.config.json");
    await writeFile(
      configFilePath,
      JSON.stringify(
        {
          project: { languages: ["typescript"] },
          layers: { L3: { validators: ["L3-003"], coverageThreshold: 90 } },
        },
        null,
        2,
      ),
      "utf-8",
    );
    const input = { validatorIds: ["L3-003"], targetPaths: [] };

    // Act (1st run): エラーを検出する
    const firstUseCase = await buildL3UseCaseFromConfigFile(tempDir, configFilePath);
    const actualFirst = await firstUseCase.execute(input);

    // Assert (1st run): L3-003 fail-closed + mechanical 宣言 + opt-out 経路が suggestion に実在する
    const firstResult = actualFirst.find((r) => r.validatorId === "L3-003");
    expect(firstResult?.passed).toBe(false);
    expect(firstResult?.errors).toHaveLength(1);
    expect(firstResult?.errors[0].remediationType).toBe("mechanical");
    expect(firstResult?.errors[0].suggestion).toContain("layers.L3.coverageThreshold");

    // Act (機械適用): suggestion が案内する opt-out（layers.L3.coverageThreshold を 0）を config に機械適用する
    await applyMechanicalRemediation(firstResult?.errors[0] as RemediationErrorLike, { configFilePath });

    // Act (2nd run): config を読み直して同じ validator を再実行する（CLI 再実行相当）
    const secondUseCase = await buildL3UseCaseFromConfigFile(tempDir, configFilePath);
    const actualSecond = await secondUseCase.execute(input);

    // Assert (2nd run): 正規の opt-out として SKIP（実効 pass）になり、エラーが消える（往復完了）
    const secondResult = actualSecond.find((r) => r.validatorId === "L3-003");
    expect(secondResult?.skipped).toBe(true);
    expect(secondResult?.passed).toBe(true);
    expect(secondResult?.errors).toHaveLength(0);
  });

  // 過剰宣言ガード: 機械適用不能な finding が mechanical を名乗らないこと
  it("L3-003 の閾値未達エラー（テスト追加が必要）は mechanical と過剰宣言されず ai-assisted であること", async () => {
    // Arrange: coverageThreshold: 90 の config + カバレッジ 50% のレポートが存在する fixture
    const configFilePath = join(tempDir, "phasegate.config.json");
    await writeFile(
      configFilePath,
      JSON.stringify(
        {
          project: { languages: ["typescript"] },
          layers: { L3: { validators: ["L3-003"], coverageThreshold: 90 } },
        },
        null,
        2,
      ),
      "utf-8",
    );
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(tempDir, "coverage"), { recursive: true });
    await writeFile(
      join(tempDir, "coverage", "coverage-summary.json"),
      JSON.stringify({ total: { lines: { pct: 50 } } }),
      "utf-8",
    );
    const useCase = await buildL3UseCaseFromConfigFile(tempDir, configFilePath);

    // Act
    const actual = await useCase.execute({ validatorIds: ["L3-003"], targetPaths: [] });

    // Assert: fail はするが、機械適用では直らないので mechanical ではなく ai-assisted
    const result = actual.find((r) => r.validatorId === "L3-003");
    expect(result?.passed).toBe(false);
    expect(result?.errors[0].remediationType).toBe("ai-assisted");
  });

  // フェイル構造の明文化: mechanical 宣言 × 実行不能 suggestion は必ず fail する
  it("mechanical と宣言されたエラーの suggestion が現在のプロジェクト状態で機械適用不能なら機械適用器が throw して往復テストが fail する構造であること", async () => {
    // Arrange: mechanical を名乗るが機械適用可能な操作を導出できない suggestion（文言乖離のシミュレーション）
    const brokenError: RemediationErrorLike = {
      suggestion: "適切に修正してください",
      remediationType: "mechanical",
    };

    // Act
    const actual = applyMechanicalRemediation(brokenError, { configFilePath: join(tempDir, "phasegate.config.json") });

    // Assert: 導出失敗は例外 = 往復テスト fail（suggestion 文言と実挙動の乖離をここで検出する）
    await expect(actual).rejects.toThrow(/機械適用可能な操作を導出できません/);
  });
});

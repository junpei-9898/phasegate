/**
 * @layer infrastructure
 * @unit validator-system
 *
 * NyquistAcCoveragePolicyAdapter — AcCoveragePolicyPort実装
 *
 * FAIL-CLOSED: nyquist-validation モジュールの実行時に例外が発生した場合は
 * passed=false（不合格）として扱い、エラーを結果に含めて上位へ通知する。
 * かつては catch 節で passed=true を返す fail-open だったが、AC 網羅ゲート
 * （L3-004）を無効化する重大な品質防御の抜け穴だったため fail-closed へ是正した。
 *
 * REAL REGISTRY: storyId 整合性検査に必要な有効 storyId 一覧を
 * traceability-model の StoryCatalog から取得して nyquist モジュールへ配線する。
 * かつては `getStoryIds: async () => []`（空スタブ）だったため、正当かつ完全網羅の
 * マトリクスでも全 storyId が「未登録」と判定され L3-004 が構造的に PASS 不能だった。
 *
 * MATRIX PATH: requirement-test-matrix.json のパスは config
 * （layers.L3.requirementMatrixPath）から供給される。未指定時は既定値
 * `.harness/requirement-test-matrix.json` を用いる。マトリクスが不在の場合は
 * fail-closed で「設定されているが不在」という実行可能なメッセージを返す。
 *
 * FRESH PROJECT SKIP (WI-324): 例外として「matrix 不在 かつ StoryCatalog の
 * story がゼロ」の場合のみ skipped=true を返す。phasegate 導入直後（story 未作成・
 * matrix 未生成）のオンボーディングを fail-closed で阻害しないため。story が
 * 1件でも存在するのに matrix が不在なら「あるべき matrix が消えた事故」として
 * 従来どおり fail-closed。story 数の取得自体に失敗した場合も判定不能として
 * 保守的に fail-closed 側へ倒す。
 */
import { access } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import type { AcCoveragePolicyPort } from "../../domain/ports/ac-coverage-policy-port.js";
import type { HarnessErrorLike } from "../../domain/value-objects/validation-result.js";

const DEFAULT_MATRIX_PATH = ".harness/requirement-test-matrix.json";

function toL3004Error(message: string, suggestion: string): HarnessErrorLike {
  return {
    code: { value: "L3-004", toString: () => "L3-004" },
    severity: { value: "error", toString: () => "error" },
    message,
    suggestion,
  };
}

export class NyquistAcCoveragePolicyAdapter implements AcCoveragePolicyPort {
  async checkCoverage(context: { matrixFilePath?: string }): Promise<{
    passed: boolean;
    errors: readonly HarnessErrorLike[];
    skipped?: boolean;
    skipReason?: string;
  }> {
    const rootDir = process.cwd();
    const relativeOrAbsolute =
      context.matrixFilePath && context.matrixFilePath.length > 0 ? context.matrixFilePath : DEFAULT_MATRIX_PATH;
    const matrixFilePath = isAbsolute(relativeOrAbsolute) ? relativeOrAbsolute : join(rootDir, relativeOrAbsolute);

    // マトリクス不在は threshold-configured-but-absent と同様に fail-closed で
    // 明確なメッセージを返す（ENOENT の生メッセージで落とさない）。
    // 例外（WI-324）: story がゼロのフレッシュプロジェクトのみ SKIP を返す。
    try {
      await access(matrixFilePath);
    } catch {
      if (await this.hasZeroStories(rootDir)) {
        return {
          passed: true,
          errors: [],
          skipped: true,
          skipReason:
            "story 未作成のため L3-004 をスキップ（story 作成後に requirement-test-matrix を生成すると有効化されます）",
        };
      }
      return {
        passed: false,
        errors: [
          toL3004Error(
            `AC網羅マトリクスが見つかりません: ${relativeOrAbsolute}（L3-004 は fail-closed）`,
            `${relativeOrAbsolute} を生成してください（phasegate:generate-matrix）。パスは config の layers.L3.requirementMatrixPath で変更できます`,
          ),
        ],
      };
    }

    try {
      // 有効 storyId 一覧を traceability-model の StoryCatalog から取得する（REAL registry）
      const storyIds = await this.loadValidStoryIds(rootDir);

      const { createNyquistValidationModule } = await import("../../../nyquist-validation/composition-root.js");
      const mod = createNyquistValidationModule({
        getStoryIds: async () => storyIds,
      });
      const output = await mod.checkAcCoverageGateUseCase.execute({
        matrixFilePath,
      });

      return {
        passed: output.passed,
        errors: output.errors.map((err) => toL3004Error(err.message, "")),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // FAIL-CLOSED: 例外を握り潰して合格扱いにせず、不合格として通知する
      return {
        passed: false,
        errors: [
          toL3004Error(
            `AC網羅ゲートの検査に失敗しました（fail-closed）: ${message}`,
            "requirement-test-matrix.json の存在・形式・スキーマ整合性を確認してください",
          ),
        ],
      };
    }
  }

  /**
   * WI-324: 「story がゼロ」判定。StoryCatalog（traceability-model）の登録 story 数を
   * シグナルとする。StoryCatalog は requirement-test-matrix の生成元と同じ
   * user_stories.md を読むため、「matrix が本来存在しうるか」と一貫した判定になる。
   * catalog 読み込み自体が失敗した場合（config 不正等）は判定不能として false を返し、
   * 呼び出し側を保守的に fail-closed へ倒す。
   */
  private async hasZeroStories(rootDir: string): Promise<boolean> {
    try {
      const storyIds = await this.loadValidStoryIds(rootDir);
      return storyIds.length === 0;
    } catch {
      return false;
    }
  }

  private async loadValidStoryIds(rootDir: string): Promise<readonly string[]> {
    const { createConfigFoundationModule } = await import("../../../config-foundation/composition-root.js");
    const configModule = createConfigFoundationModule();
    const resolvedConfig = await configModule.usecases.loadResolvedConfigUseCase.execute();

    const { createTraceabilityModelModule } = await import("../../../traceability-model/composition-root.js");
    const traceModule = createTraceabilityModelModule(rootDir, {
      pathRoots: { designDocsRoot: resolvedConfig.config.paths.designDocs },
    });
    const storyIds = await traceModule.storyCatalog.getAllStoryIds();
    return storyIds.map((s) => s.value);
  }
}

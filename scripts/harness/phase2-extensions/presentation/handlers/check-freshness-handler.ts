/**
 * @layer presentation
 * @unit phase2-extensions
 */
import type { CheckDocFreshnessUseCase } from "../../application/usecases/check-doc-freshness-usecase.js";
import { FreshnessResultFormatter } from "../formatters/freshness-result-formatter.js";

export class CheckFreshnessHandler {
  private readonly formatter = new FreshnessResultFormatter();

  constructor(private readonly useCase: CheckDocFreshnessUseCase) {}

  async handle(args: string[]): Promise<{ exitCode: number; stdout: string }> {
    let targetPattern: string | undefined;
    let format: "text" | "json" = "text";
    let dryRun = false;

    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];
      if (arg === "--pattern") {
        targetPattern = args[index + 1];
        index += 1;
      } else if (arg === "--format") {
        format = (args[index + 1] as "text" | "json") ?? "text";
        index += 1;
      } else if (arg === "--dry-run") {
        dryRun = true;
      }
    }

    const result = await this.useCase.execute({ targetPattern, format, dryRun });
    // WI-359: `--dry-run` は「副作用なしで診断のみ」（skills/doc-health-checker/SKILL.md）であり、
    // シナリオ仕様 SC-P2-002 の期待結果も exit 0 である。従来は dryRun をパースだけして
    // 捨てており、error 閾値超過の文書が 1 件でもあると診断のみの実行でも exit 1 になっていた。
    // その結果 SC-P2-002 の e2e は「コードを一切変えなくても暦の経過だけで落ちる」状態になっていた。
    // 実運用の鮮度ゲートは L4-004（`validate --layer L4`）が担い、そちらは本 handler を
    // 経由しないため、dry-run を report-only にしてもゲートは緩まない。
    // フラグ未指定時の exit 1 は従来どおり維持する。
    const exitCode = dryRun ? 0 : result.summary.error > 0 ? 1 : 0;
    return {
      exitCode,
      stdout: format === "json" ? this.formatter.formatJson(result) : this.formatter.formatText(result),
    };
  }
}

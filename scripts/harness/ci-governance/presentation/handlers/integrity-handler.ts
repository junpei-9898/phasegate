// @unit ci-governance
// @layer presentation

import type { PinIntegrityUseCase } from "../../application/usecases/pin-integrity-usecase.js";
import type { VerifyIntegrityUseCase } from "../../application/usecases/verify-integrity-usecase.js";
import type { IntegrityDriftKind } from "../../domain/value-objects/integrity-drift.js";

export interface IntegrityPinArgs {
  readonly dryRun?: boolean;
  readonly format?: "human" | "json";
}

export interface IntegrityVerifyArgs {
  readonly format?: "human" | "json";
}

export interface IntegrityHandlerResult {
  readonly exitCode: number;
  readonly output: string;
}

const DRIFT_LABEL: Record<IntegrityDriftKind, string> = {
  mismatch: "MISMATCH (digest 不一致)",
  added: "ADDED (manifest 未登録)",
  missing: "MISSING (実ファイル欠落)",
  "manifest-absent": "MANIFEST-ABSENT (manifest 欠落)",
};

export class IntegrityHandler {
  constructor(
    private readonly pinUseCase: PinIntegrityUseCase,
    private readonly verifyUseCase: VerifyIntegrityUseCase,
  ) {}

  async pin(args: IntegrityPinArgs): Promise<IntegrityHandlerResult> {
    const format = args.format ?? "human";
    const result = await this.pinUseCase.execute({ dryRun: args.dryRun });

    if (format === "json") {
      return { exitCode: 0, output: JSON.stringify(result, null, 2) };
    }

    const header = result.dryRun
      ? `[dry run] integrity manifest を生成しました（保存先想定: ${result.savedPath}）`
      : `integrity manifest を保存しました: ${result.savedPath}`;
    return {
      exitCode: 0,
      output: [header, `エントリ数: ${result.entryCount}`].join("\n"),
    };
  }

  async verify(args: IntegrityVerifyArgs): Promise<IntegrityHandlerResult> {
    const format = args.format ?? "human";
    const result = await this.verifyUseCase.execute();
    const exitCode = result.ok ? 0 : 2;

    if (format === "json") {
      return { exitCode, output: JSON.stringify(result, null, 2) };
    }

    if (result.ok) {
      return {
        exitCode: 0,
        output: `integrity 照合 OK: drift はありません（${result.manifestPath}）`,
      };
    }

    const lines = [
      `integrity drift を ${result.drifts.length} 件検出しました（${result.manifestPath}）:`,
      ...result.drifts.map((d) => `- [${DRIFT_LABEL[d.kind]}] ${d.path}`),
      "",
      "意図的な変更であれば `phasegate integrity:pin` で manifest を更新してください。",
    ];
    return { exitCode: 2, output: lines.join("\n") };
  }
}

// @unit ci-governance
// @layer presentation
// @work-item-id WI-368

import type { ScaffoldInceptionUseCase } from "../../application/usecases/scaffold-inception-usecase.js";
import { INCEPTION_DOC_KINDS, InceptionDocKind } from "../../domain/value-objects/inception-doc-kind.js";

export interface ScaffoldInceptionHandlerArgs {
  readonly kind?: string;
  readonly dryRun?: boolean;
  readonly apply?: boolean;
  readonly force?: boolean;
  readonly format?: "human" | "json";
}

export interface ScaffoldInceptionHandlerResult {
  readonly exitCode: number;
  readonly output: string;
}

const ALLOWED = INCEPTION_DOC_KINDS.join(", ");

export class ScaffoldInceptionHandler {
  constructor(private readonly useCase: ScaffoldInceptionUseCase) {}

  async handle(args: ScaffoldInceptionHandlerArgs): Promise<ScaffoldInceptionHandlerResult> {
    const format = args.format ?? "human";
    const apply = args.apply === true;
    const dryRun = args.dryRun === true || !apply;

    if (args.dryRun === true && apply) {
      return this.fail(format, "--dry-run と --apply は同時に指定できません", 2);
    }

    if (!args.kind || args.kind.trim().length === 0) {
      return this.fail(format, `--kind <doc-kind> は必須です（許容値: ${ALLOWED}）`, 2);
    }
    if (!InceptionDocKind.isValid(args.kind)) {
      return this.fail(format, `未知の doc-kind: "${args.kind}"（許容値: ${ALLOWED}）`, 2);
    }

    let result: Awaited<ReturnType<ScaffoldInceptionUseCase["execute"]>>;
    try {
      result = await this.useCase.execute({
        kind: args.kind,
        dryRun,
        force: args.force,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.fail(format, `scaffold 失敗: ${msg}`, 2);
    }

    if (format === "json") {
      return {
        exitCode: result.alreadyExists && !result.written ? 2 : 0,
        output: JSON.stringify(result, null, 2),
      };
    }

    if (result.alreadyExists && !result.written) {
      return {
        exitCode: result.dryRun ? 0 : 2,
        output: [
          result.dryRun ? `dry-run: 既に存在します: ${result.targetPath}` : `既に存在します: ${result.targetPath}`,
          result.dryRun ? "書き込むには --apply を指定してください。" : "上書きするには --force を指定してください。",
        ].join("\n"),
      };
    }

    if (result.dryRun) {
      return {
        exitCode: 0,
        output: [
          `dry-run: 文書を生成予定: ${result.targetPath}`,
          `テンプレ: ${result.templatePath}`,
          `doc-kind: ${result.kind}`,
          "書き込むには --apply を指定してください。",
        ].join("\n"),
      };
    }

    const headerVerb = result.overwritten ? "上書き保存しました" : "生成しました";
    return {
      exitCode: 0,
      output: [
        `文書を${headerVerb}: ${result.targetPath}`,
        `テンプレ: ${result.templatePath}`,
        `doc-kind: ${result.kind}`,
        "TODO プレースホルダを実体で埋め、QA の [Answer] は人間が記入してください。",
      ].join("\n"),
    };
  }

  private fail(format: "human" | "json", message: string, exitCode: number): ScaffoldInceptionHandlerResult {
    if (format === "json") {
      return { exitCode, output: JSON.stringify({ error: message }, null, 2) };
    }
    return { exitCode, output: message };
  }
}

// @unit ci-governance
// @layer presentation
// @work-item-id WI-367

import type { ListTemplatesUseCase } from "../../application/usecases/list-templates-usecase.js";
import type { ShowTemplateUseCase } from "../../application/usecases/show-template-usecase.js";

export interface TemplatesHandlerResult {
  readonly exitCode: number;
  /** stdout に出す内容（空文字なら出力しない） */
  readonly output: string;
  /** stderr に出す内容（空文字なら出力しない） */
  readonly errorOutput: string;
}

export interface TemplatesListArgs {
  readonly format?: "human" | "json";
}

export interface TemplatesShowArgs {
  readonly name?: string;
}

const USAGE = "Usage: phasegate templates <list|show <name>>";

export class TemplatesHandler {
  constructor(
    private readonly listUseCase: ListTemplatesUseCase,
    private readonly showUseCase: ShowTemplateUseCase,
  ) {}

  async list(args: TemplatesListArgs = {}): Promise<TemplatesHandlerResult> {
    const result = await this.listUseCase.execute();

    if (args.format === "json") {
      return {
        exitCode: 0,
        output: JSON.stringify(result, null, 2),
        errorOutput: "",
      };
    }

    if (result.templates.length === 0) {
      return {
        exitCode: 0,
        output: [
          "Available templates (0):",
          "",
          `  テンプレートディレクトリが見つかりません: ${result.directoryPath}`,
        ].join("\n"),
        errorOutput: "",
      };
    }

    const lines = [`Available templates (${result.templates.length}):`, ""];
    for (const entry of result.templates) {
      lines.push(`  ${entry.name}  (${entry.fileName})`);
    }
    lines.push("", "本文を表示: phasegate templates show <name>");

    return { exitCode: 0, output: lines.join("\n"), errorOutput: "" };
  }

  async show(args: TemplatesShowArgs): Promise<TemplatesHandlerResult> {
    const rawName = args.name ?? "";
    if (rawName.length === 0) {
      return {
        exitCode: 2,
        output: "",
        errorOutput: "Usage: phasegate templates show <name>",
      };
    }

    const result = await this.showUseCase.execute(rawName);

    if (result.found) {
      // テンプレート本文だけを stdout に出す。リダイレクトでそのまま文書として保存できる。
      return { exitCode: 0, output: result.content, errorOutput: "" };
    }

    if (result.reason === "invalid-name") {
      return {
        exitCode: 2,
        output: "",
        errorOutput: [
          `Invalid template name: ${rawName}`,
          "テンプレート名は英小文字・数字・_ ・- のみで指定してください（パスは指定できません）。",
          USAGE,
        ].join("\n"),
      };
    }

    return {
      exitCode: 2,
      output: "",
      errorOutput: [`Template not found: ${rawName}`, `Available: ${result.availableNames.join(", ")}`].join("\n"),
    };
  }

  usage(): TemplatesHandlerResult {
    return { exitCode: 2, output: "", errorOutput: USAGE };
  }
}

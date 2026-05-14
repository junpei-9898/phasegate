// @unit ci-governance
// @layer presentation
// @work-item-id WI-189

import { DesignPhase } from '../../domain/value-objects/design-phase.js';
import type { ScaffoldDesignUseCase } from '../../application/usecases/scaffold-design-usecase.js';

export interface ScaffoldDesignHandlerArgs {
  readonly unit?: string;
  readonly phase?: string;
  readonly dryRun?: boolean;
  readonly apply?: boolean;
  readonly force?: boolean;
  readonly format?: 'human' | 'json';
}

export interface ScaffoldDesignHandlerResult {
  readonly exitCode: number;
  readonly output: string;
}

export class ScaffoldDesignHandler {
  constructor(private readonly useCase: ScaffoldDesignUseCase) {}

  async handle(args: ScaffoldDesignHandlerArgs): Promise<ScaffoldDesignHandlerResult> {
    const format = args.format ?? 'human';
    const apply = args.apply === true;
    const dryRun = args.dryRun === true || !apply;

    if (args.dryRun === true && apply) {
      return this.fail(format, '--dry-run と --apply は同時に指定できません', 2);
    }

    if (!args.unit || args.unit.trim().length === 0) {
      return this.fail(format, '--unit <unit-id> は必須です', 2);
    }
    if (!args.phase || args.phase.trim().length === 0) {
      return this.fail(
        format,
        `--phase <name> は必須です（許容値: logical, domain, uiux, unit-test, it-test）`,
        2,
      );
    }
    if (!DesignPhase.isValid(args.phase)) {
      return this.fail(
        format,
        `未知の phase: "${args.phase}"（許容値: logical, domain, uiux, unit-test, it-test）`,
        2,
      );
    }

    let result;
    try {
      result = await this.useCase.execute({
        unit: args.unit,
        phase: args.phase,
        dryRun,
        force: args.force,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.fail(format, `scaffold 失敗: ${msg}`, 2);
    }

    if (format === 'json') {
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
          result.dryRun ? '書き込むには --apply を指定してください。' : '上書きするには --force を指定してください。',
        ].join('\n'),
      };
    }

    if (result.dryRun) {
      return {
        exitCode: 0,
        output: [
          `dry-run: 設計文書を生成予定: ${result.targetPath}`,
          `テンプレ: ${result.templatePath}`,
          `Unit: ${result.unit} / phase: ${result.phase}`,
          '書き込むには --apply を指定してください。',
        ].join('\n'),
      };
    }

    const headerVerb = result.overwritten ? '上書き保存しました' : '生成しました';
    return {
      exitCode: 0,
      output: [
        `設計文書を${headerVerb}: ${result.targetPath}`,
        `テンプレ: ${result.templatePath}`,
        `Unit: ${result.unit} / phase: ${result.phase}`,
        'TODO プレースホルダを実体で埋めてください。',
      ].join('\n'),
    };
  }

  private fail(
    format: 'human' | 'json',
    message: string,
    exitCode: number,
  ): ScaffoldDesignHandlerResult {
    if (format === 'json') {
      return {
        exitCode,
        output: JSON.stringify({ error: message }, null, 2),
      };
    }
    return { exitCode, output: message };
  }
}

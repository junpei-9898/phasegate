// @unit ci-governance
// @layer presentation

import type { CreateBaselineUseCase } from '../../application/usecases/create-baseline-usecase.js';

export interface CreateBaselineHandlerArgs {
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly dryRun?: boolean;
  readonly force?: boolean;
  readonly format?: 'human' | 'json';
}

export interface CreateBaselineHandlerResult {
  readonly exitCode: number;
  readonly output: string;
}

export class CreateBaselineHandler {
  constructor(private readonly useCase: CreateBaselineUseCase) {}

  async handle(args: CreateBaselineHandlerArgs): Promise<CreateBaselineHandlerResult> {
    const format = args.format ?? 'human';
    const result = await this.useCase.execute({
      include: args.include,
      exclude: args.exclude,
      dryRun: args.dryRun,
      force: args.force,
    });

    if (format === 'json') {
      return {
        exitCode: result.overwriteBlocked ? 2 : 0,
        output: JSON.stringify(result, null, 2),
      };
    }

    if (result.overwriteBlocked) {
      return {
        exitCode: 2,
        output: [
          `baseline は既に存在します: ${result.savedPath}`,
          '上書きするには --force を指定してください。',
          '生成内容のみを確認したい場合は --dry-run を指定してください。',
        ].join('\n'),
      };
    }

    const header = result.dryRun
      ? `[dry run] baseline を生成しました（保存先想定: ${result.savedPath}）`
      : `baseline を保存しました: ${result.savedPath}`;
    return {
      exitCode: 0,
      output: [header, `エントリ数: ${result.entryCount}`].join('\n'),
    };
  }
}

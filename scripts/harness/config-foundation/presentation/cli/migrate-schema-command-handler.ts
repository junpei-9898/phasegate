/**
 * @layer presentation
 * @unit config-foundation
 *
 * `phasegate migrate --schema v3` のハンドラー。
 * phasegate.config.json に `architecture` キーが無い v2 config を検出したら
 * `architecture: { preset: "clean" }` を追記して v3 化する。既に v3 の場合は no-op。
 */

import type { MigrateSchemaOutput } from '../../application/usecases/migrate-schema-use-case.js';

export interface MigrateSchemaCommandInput {
  readonly targetVersion: string;
  readonly configPath?: string;
}

export interface MigrateSchemaCommandOutput {
  readonly exitCode: number;
  readonly output: string;
}

export interface MigrateSchemaPort {
  execute(input: {
    targetVersion: 'v3';
    configPath?: string;
  }): Promise<Readonly<MigrateSchemaOutput>>;
}

export interface MigrateSchemaCommandHandlerDeps {
  readonly migrateSchemaUseCase: MigrateSchemaPort;
}

export class MigrateSchemaCommandHandler {
  private readonly migrateSchemaUseCase: MigrateSchemaPort;

  constructor(deps: MigrateSchemaCommandHandlerDeps) {
    this.migrateSchemaUseCase = deps.migrateSchemaUseCase;
  }

  async execute(
    input: MigrateSchemaCommandInput,
  ): Promise<MigrateSchemaCommandOutput> {
    if (input.targetVersion !== 'v3') {
      return {
        exitCode: 2,
        output:
          `Error: unsupported --schema version "${input.targetVersion}". Only "v3" is supported.`,
      };
    }

    try {
      const result = await this.migrateSchemaUseCase.execute({
        targetVersion: 'v3',
        configPath: input.configPath,
      });

      if (result.alreadyUpToDate) {
        return {
          exitCode: 0,
          output: `✓ ${result.configPath} is already schema v3 (architecture key present). No changes applied.`,
        };
      }

      const changes = result.appliedChanges.map((c) => `  - ${c}`).join('\n');
      return {
        exitCode: 0,
        output: [
          `✓ Migrated ${result.configPath} to schema v3.`,
          'Applied changes:',
          changes,
          '',
          '補足: `architecture.preset` の既定値は "clean"。onion / hexagonal / layered / flat 等を採用している場合は手動で変更してください（docs/guide/preset-selection.md 参照）。',
        ].join('\n'),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        exitCode: 1,
        output: `Error: ${message}`,
      };
    }
  }
}

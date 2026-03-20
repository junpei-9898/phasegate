/**
 * @layer application
 * @unit config-foundation
 */
import { ConfigValidationError } from '../../domain/errors/config-validation-error.js';
import {
  HarnessConfig,
  type HarnessConfigSourceDocument,
  type PresetId,
} from '../../domain/harness-config.js';
import type { ConfigRepositoryPort } from '../../domain/ports/config-repository-port.js';
import type { ConfigSchemaValidatorPort } from '../../domain/ports/config-schema-validator-port.js';
import {
  PresetResolutionService,
  type PresetDefinition,
} from '../../domain/services/preset-resolution-service.js';
import type { HarnessError } from '../../../harness-error/domain/value-objects/harness-error.js';
import type { ResolvedConfigOutput } from '../dto/resolved-config-output.js';

export type PresetDefinitions = Readonly<Record<PresetId, PresetDefinition>>;

export interface LoadResolvedConfigUseCaseDependencies {
  readonly configRepository: ConfigRepositoryPort;
  readonly schemaValidator: ConfigSchemaValidatorPort;
  readonly presetDefinitions: PresetDefinitions;
  readonly presetResolutionService: PresetResolutionService;
}

export interface LoadedHarnessConfig {
  readonly aggregate: HarnessConfig;
  readonly path: string;
}

const PRESET_IDS = ['minimal', 'standard', 'strict'] as const satisfies readonly PresetId[];

function isPresetId(value: unknown): value is PresetId {
  return typeof value === 'string' && PRESET_IDS.includes(value as PresetId);
}

function formatHarnessErrors(errors: readonly HarnessError[]): string {
  return errors.map((error) => `[${error.code.toString()}] ${error.message}`).join(', ');
}

function toSourceDocument(document: unknown): HarnessConfigSourceDocument {
  return document as HarnessConfigSourceDocument;
}

export function validateDocumentOrThrow(
  schemaValidator: ConfigSchemaValidatorPort,
  document: unknown,
): void {
  const errors = schemaValidator.validate(document);

  if (errors.length > 0) {
    throw new ConfigValidationError(
      `設定が不正です: ${formatHarnessErrors(errors)}`,
    );
  }
}

export function resolveSourceDocument(
  sourceDocument: HarnessConfigSourceDocument,
  presetDefinitions: PresetDefinitions,
  presetResolutionService: PresetResolutionService,
) {
  const preset = sourceDocument.project?.preset;

  if (!isPresetId(preset)) {
    throw new ConfigValidationError(`未知のPresetです: ${String(preset)}`);
  }

  return presetResolutionService.resolve(
    sourceDocument,
    presetDefinitions[preset],
  );
}

export async function loadHarnessConfig(
  dependencies: LoadResolvedConfigUseCaseDependencies,
  configPath?: string,
): Promise<LoadedHarnessConfig> {
  const { path, document } = await dependencies.configRepository.load(configPath);

  validateDocumentOrThrow(dependencies.schemaValidator, document);

  const sourceDocument = toSourceDocument(document);
  const resolvedDocument = resolveSourceDocument(
    sourceDocument,
    dependencies.presetDefinitions,
    dependencies.presetResolutionService,
  );

  return {
    aggregate: HarnessConfig.reconstitute({
      sourceDocument,
      resolvedDocument,
    }),
    path,
  };
}

export class LoadResolvedConfigUseCase {
  private readonly configRepository: ConfigRepositoryPort;
  private readonly schemaValidator: ConfigSchemaValidatorPort;
  private readonly presetDefinitions: PresetDefinitions;
  private readonly presetResolutionService: PresetResolutionService;

  constructor(dependencies: LoadResolvedConfigUseCaseDependencies) {
    this.configRepository = dependencies.configRepository;
    this.schemaValidator = dependencies.schemaValidator;
    this.presetDefinitions = dependencies.presetDefinitions;
    this.presetResolutionService = dependencies.presetResolutionService;
  }

  async execute(configPath?: string): Promise<ResolvedConfigOutput> {
    const { aggregate, path } = await loadHarnessConfig(
      {
        configRepository: this.configRepository,
        schemaValidator: this.schemaValidator,
        presetDefinitions: this.presetDefinitions,
        presetResolutionService: this.presetResolutionService,
      },
      configPath,
    );

    return {
      config: aggregate.toResolvedConfig(),
      sourcePath: path,
    };
  }
}

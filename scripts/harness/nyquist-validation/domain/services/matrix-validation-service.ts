/**
 * @layer domain
 * @unit nyquist-validation
 *
 * requirement-test-matrix.json の storyId 整合性確認サービス
 */
import type { NyquistHarnessError } from './ac-coverage-gate-policy.js';

export interface StoryRegistryPortForValidation {
  getValidStoryIds(): Promise<readonly string[]>;
  findAllStoryIds?: () => Promise<readonly string[]>;
}

export type MatrixValidationResult =
  | { passed: true; errors: readonly NyquistHarnessError[]; validatedData: unknown }
  | { passed: false; errors: readonly NyquistHarnessError[]; validatedData: null };

export interface MatrixValidationServiceDeps {
  readonly storyRegistryPort: StoryRegistryPortForValidation;
}

interface RawStoryMappingEntry {
  storyId: string;
}

function extractStoryMappings(rawData: unknown): RawStoryMappingEntry[] {
  if (rawData === null || typeof rawData !== 'object') return [];
  const obj = rawData as Record<string, unknown>;
  if (!Array.isArray(obj['storyMappings'])) return [];
  return (obj['storyMappings'] as unknown[]).map((item) => {
    const entry = item as Record<string, unknown>;
    return { storyId: String(entry['storyId'] ?? '') };
  });
}

export class MatrixValidationService {
  private readonly storyRegistryPort: StoryRegistryPortForValidation;

  constructor(deps: MatrixValidationServiceDeps) {
    this.storyRegistryPort = deps.storyRegistryPort;
  }

  async validate(rawData: unknown): Promise<MatrixValidationResult> {
    // StoryRegistryPortからstoryId一覧を取得する
    // unit testでは findAllStoryIds を使うモックもあるため両方対応
    let validStoryIds: readonly string[];
    if (typeof this.storyRegistryPort.findAllStoryIds === 'function') {
      validStoryIds = await this.storyRegistryPort.findAllStoryIds();
    } else {
      validStoryIds = await this.storyRegistryPort.getValidStoryIds();
    }

    const storyMappings = extractStoryMappings(rawData);

    const errors: NyquistHarnessError[] = [];
    for (const sm of storyMappings) {
      if (!validStoryIds.includes(sm.storyId)) {
        errors.push({
          code: 'L3-004',
          severity: 'error',
          message: `未登録のstoryIdです: ${sm.storyId}`,
        });
      }
    }

    if (errors.length === 0) {
      return { passed: true, errors: [], validatedData: rawData };
    }
    return { passed: false, errors: Object.freeze(errors), validatedData: null };
  }
}

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

/**
 * requirement-test-matrix.json から storyId を持つエントリを抽出する。
 *
 * スキーマ準拠の実データはトップレベルキー `stories`（各要素が `{ storyId, storyMappings }`）
 * を用いる。旧来のテスト・入力ではトップレベル `storyMappings` を用いる場合があるため
 * 両形式に対応する。以前は `storyMappings` のみを参照していたため、スキーマ準拠の実データ
 * （`stories` 形式）に対しては常に空配列を返し、storyId 整合性検査が事実上 no-op だった。
 */
function extractStoryMappings(rawData: unknown): RawStoryMappingEntry[] {
  if (rawData === null || typeof rawData !== 'object') return [];
  const obj = rawData as Record<string, unknown>;

  const source = Array.isArray(obj['stories'])
    ? (obj['stories'] as unknown[])
    : Array.isArray(obj['storyMappings'])
      ? (obj['storyMappings'] as unknown[])
      : [];

  return source.map((item) => {
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
    const seenStoryIds = new Set<string>();
    for (const sm of storyMappings) {
      // storyId 整合性: 有効 storyId 一覧に含まれるか照合する
      if (!validStoryIds.includes(sm.storyId)) {
        errors.push({
          code: 'L3-004',
          severity: 'error',
          message: `未登録のstoryIdです: ${sm.storyId}`,
        });
      }
      // INV-1: 同一 storyId の StoryMapping は1つのみ存在する（重複を検出）
      if (seenStoryIds.has(sm.storyId)) {
        errors.push({
          code: 'L3-004',
          severity: 'error',
          message: `storyIdが重複しています: ${sm.storyId}`,
        });
      }
      seenStoryIds.add(sm.storyId);
    }

    if (errors.length === 0) {
      return { passed: true, errors: [], validatedData: rawData };
    }
    return { passed: false, errors: Object.freeze(errors), validatedData: null };
  }
}

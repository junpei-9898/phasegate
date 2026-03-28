import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {
  HarnessConfigResolvedDocument,
  HarnessConfigSourceDocument,
} from '../../../config-foundation/domain/harness-config.js';
import { HarnessError } from '../../../harness-error/domain/value-objects/harness-error.js';
import { ErrorCode } from '../../../harness-error/domain/value-objects/error-code.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer TItem>
    ? Array<DeepPartial<TItem>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge<T>(baseValue: T, overrideValue?: DeepPartial<T>): T {
  if (overrideValue === undefined) {
    return structuredClone(baseValue);
  }

  if (Array.isArray(baseValue)) {
    return structuredClone((overrideValue as unknown[]) ?? baseValue) as T;
  }

  if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
    const baseRecord = baseValue as Record<string, unknown>;
    const overrideRecord = overrideValue as Record<string, unknown>;
    const merged: Record<string, unknown> = {};
    const keys = new Set([
      ...Object.keys(baseRecord),
      ...Object.keys(overrideRecord),
    ]);

    for (const key of keys) {
      const baseEntry = baseRecord[key];
      const overrideEntry = overrideRecord[key];

      if (overrideEntry === undefined) {
        merged[key] = structuredClone(baseEntry);
        continue;
      }

      if (baseEntry === undefined) {
        merged[key] = structuredClone(overrideEntry);
        continue;
      }

      merged[key] = deepMerge(baseEntry, overrideEntry as never);
    }

    return merged as T;
  }

  return structuredClone(overrideValue as T);
}

export function createResolvedDocument(
  preset: 'minimal' | 'standard' | 'strict' = 'minimal',
): HarnessConfigResolvedDocument {
  const minimal: HarnessConfigResolvedDocument = {
    project: {
      name: 'my-project',
      preset,
    },
    layers: {
      L1: {
        enabled: true,
        rules: {},
      },
      L2: {
        enabled: true,
        validators: ['phase-gate', 'architecture'],
      },
      L3: {
        enabled: false,
        validators: ['consistency'],
        coverageThreshold: 0,
      },
      L4: {
        enabled: false,
        validators: ['drift-detector'],
        schedule: '0 0 * * *',
      },
    },
    quickMode: {
      allowedCategories: ['bugfix'],
      maintainedLayers: ['L1', 'L2'],
      relaxedGates: [],
    },
    phaseDependencies: {
      preset: 'default',
      override: false,
      customRules: [],
    },
    planningMode: {
      default: 'interactive',
      perPhase: {},
    },
    harnesses: {
      agentLessonCollection: false,
      cascadeUpdate: false,
      bundleSizeLimit: 0,
      deadCodeGC: false,
    },
    paths: {
      designDocs: 'docs/product/construction',
      inceptionDocs: 'docs/inception',
    },
    reporting: {
      format: 'json',
      outputDir: 'reports',
    },
  };

  if (preset === 'standard') {
    minimal.project.preset = 'standard';
    minimal.layers.L3 = {
      enabled: true,
      validators: ['consistency', 'test-quality'],
      coverageThreshold: 90,
    };
  }

  if (preset === 'strict') {
    minimal.project.preset = 'strict';
    minimal.layers.L3 = {
      enabled: true,
      validators: ['consistency', 'test-quality'],
      coverageThreshold: 95,
    };
    minimal.layers.L4 = {
      enabled: true,
      validators: ['drift-detector', 'dead-code-detector'],
      schedule: '0 1 * * *',
    };
    minimal.harnesses = {
      agentLessonCollection: true,
      cascadeUpdate: false,
      bundleSizeLimit: 500,
      deadCodeGC: true,
    };
  }

  return minimal;
}

export function createValidSourceDocument(
  overrides: DeepPartial<HarnessConfigSourceDocument> = {},
): HarnessConfigSourceDocument {
  const baseDocument: HarnessConfigSourceDocument = {
    project: {
      name: 'my-project',
      preset: 'minimal',
    },
    layers: {},
    quickMode: {},
    phaseDependencies: {
      preset: 'default',
      override: false,
      customRules: [],
    },
    planningMode: {
      default: 'interactive',
      perPhase: {},
    },
    harnesses: {},
    paths: {
      designDocs: 'docs/product/construction',
      inceptionDocs: 'docs/inception',
    },
    reporting: {
      format: 'json',
      outputDir: 'reports',
    },
  };

  return deepMerge(baseDocument, overrides);
}

export function createHarnessError(
  overrides: Partial<{
    errorCode: string;
    message: string;
    path: string;
  }> = {},
): HarnessError & { readonly errorCode: string; readonly path: string } {
  const errorCode = overrides.errorCode ?? 'L1-001';
  const harnessError = new HarnessError({
    code: ErrorCode.create(errorCode),
    severity: Severity.create('error'),
    message: overrides.message ?? '設定が不正です',
    suggestion: '設定を修正してください',
    adrRef: null,
    fixExample: null,
  }) as HarnessError & { readonly errorCode: string; readonly path: string };

  return Object.assign(harnessError, {
    errorCode,
    path: overrides.path ?? '/project',
  });
}

export async function withTempDir<T>(testFn: (tempDir: string) => Promise<T> | T): Promise<T> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-foundation-it-'));

  try {
    return await testFn(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export function writeJsonFile(targetPath: string, document: unknown): void {
  fs.writeFileSync(targetPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
}

export function writeBrokenJsonFile(targetPath: string, rawText: string): void {
  fs.writeFileSync(targetPath, rawText, 'utf8');
}

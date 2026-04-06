// @layer test
export function createValidateMatrixInput(overrides: Record<string, unknown> = {}) {
  return {
    matrixFilePath: '/test/fixtures/valid-full-coverage.json',
    failFast: false,
    ...overrides,
  };
}

export function createCheckAcCoverageGateInput(overrides: Record<string, unknown> = {}) {
  return {
    matrixFilePath: '/test/fixtures/valid-full-coverage.json',
    ...overrides,
  };
}

export function createCalculateCoverageInput(overrides: Record<string, unknown> = {}) {
  return {
    matrixFilePath: '/test/fixtures/valid-partial-coverage.json',
    checkThreshold: false,
    ...overrides,
  };
}

export function createAnalyzeImpactInput(overrides: Record<string, unknown> = {}) {
  return {
    matrixFilePath: '/test/fixtures/valid-impact-analysis.json',
    storyId: 'H07-01',
    ...overrides,
  };
}

export function createValidFullCoverageMatrixData() {
  return {
    version: '1.0.0',
    generatedAt: '2026-03-19T00:00:00.000Z',
    stories: [
      {
        storyId: 'H07-01',
        storyMappings: [
          {
            acId: 'AC-1',
            testReferences: [{ filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-1 test' }],
          },
          {
            acId: 'AC-2',
            testReferences: [{ filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-2 test' }],
          },
        ],
      },
      {
        storyId: 'H07-02',
        storyMappings: [
          {
            acId: 'AC-1',
            testReferences: [{ filePath: 'specs/h07-02.spec.ts', testType: 'it', testName: 'AC-1 test' }],
          },
        ],
      },
    ],
  };
}

export function createValidPartialCoverageMatrixData() {
  return {
    version: '1.0.0',
    generatedAt: '2026-03-19T00:00:00.000Z',
    stories: [
      {
        storyId: 'H07-01',
        storyMappings: [
          { acId: 'AC-1', testReferences: [{ filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-1 test' }] },
          { acId: 'AC-2', testReferences: [{ filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-2 test' }] },
          { acId: 'AC-3', testReferences: [{ filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-3 test' }] },
          { acId: 'AC-4', testReferences: [] },
        ],
      },
    ],
  };
}

export function createValidNoCoverageMatrixData() {
  return {
    version: '1.0.0',
    generatedAt: '2026-03-19T00:00:00.000Z',
    stories: [
      {
        storyId: 'H07-01',
        storyMappings: [
          { acId: 'AC-1', testReferences: [] },
          { acId: 'AC-2', testReferences: [] },
          { acId: 'AC-3', testReferences: [] },
        ],
      },
    ],
  };
}

export function createEmptyStoriesMatrixData() {
  return {
    version: '1.0.0',
    generatedAt: '2026-03-19T00:00:00.000Z',
    stories: [],
  };
}

export function createImpactAnalysisMatrixData() {
  return {
    version: '1.0.0',
    generatedAt: '2026-03-19T00:00:00.000Z',
    stories: [
      {
        storyId: 'H07-01',
        storyMappings: [
          {
            acId: 'AC-1',
            testReferences: [
              { filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-1 test' },
              { filePath: 'specs/h07-01.unit.ts', testType: 'unit', testName: 'AC-1 unit' },
            ],
          },
          {
            acId: 'AC-2',
            testReferences: [
              { filePath: 'specs/h07-01.spec.ts', testType: 'it', testName: 'AC-2 test' },
            ],
          },
          {
            acId: 'AC-3',
            testReferences: [
              { filePath: 'specs/h07-01.scenario.ts', testType: 'scenario', testName: 'AC-3 scenario' },
            ],
          },
        ],
      },
    ],
  };
}

export function createMatrixFilePortMock(data: unknown = createValidFullCoverageMatrixData()) {
  return {
    read: vi.fn().mockResolvedValue(data),
    write: vi.fn().mockResolvedValue(undefined),
  };
}

export function createStoryRegistryMock(storyIds: readonly string[] = ['H07-01', 'H07-02', 'H07-03', 'H07-04']) {
  return {
    getValidStoryIds: vi.fn().mockResolvedValue(storyIds),
  };
}

export function createCoverageThresholdPortMock(
  threshold = { standard: 0.9, strict: 0.95, active: 0.9 }
) {
  return {
    getThreshold: vi.fn().mockResolvedValue(threshold),
  };
}

export function createAjvValidatorMock(valid = true, errors: Array<{ code: string; severity: string; message: string }> = []) {
  return {
    validate: vi.fn().mockResolvedValue({ valid, errors }),
  };
}

import { vi } from 'vitest';

// @story-id H08-07
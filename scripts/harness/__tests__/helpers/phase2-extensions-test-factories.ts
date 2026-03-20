import { DocFreshnessRule } from '../../phase2-extensions/domain/aggregates/doc-freshness-rule.js';
import { PointerRule } from '../../phase2-extensions/domain/aggregates/pointer-rule.js';
import { DocumentAge } from '../../phase2-extensions/domain/value-objects/document-age.js';
import { FreshnessThreshold } from '../../phase2-extensions/domain/value-objects/freshness-threshold.js';
import { Pointer } from '../../phase2-extensions/domain/value-objects/pointer.js';

export const createFreshnessThreshold = (
  overrides: Partial<{
    warnThresholdDays: number;
    errorThresholdDays: number;
  }> = {},
): FreshnessThreshold =>
  FreshnessThreshold.create({
    warnThresholdDays: 14,
    errorThresholdDays: 30,
    ...overrides,
  });

export const createDocumentAge = (
  overrides: Partial<{
    ageInDays: number;
    source: 'git-log' | 'file-mtime';
  }> = {},
): DocumentAge =>
  DocumentAge.create({
    ageInDays: 5,
    source: 'git-log',
    ...overrides,
  });

export const createFilePathPointer = (
  overrides: Partial<{
    rawText: string;
    target: string;
  }> = {},
): Pointer =>
  Pointer.create({
    type: 'file-path',
    rawText: '[設計書](docs/design.md)',
    target: 'docs/design.md',
    ...overrides,
  });

export const createUrlPointer = (
  overrides: Partial<{
    rawText: string;
    target: string;
  }> = {},
): Pointer =>
  Pointer.create({
    type: 'url',
    rawText: '[GitHub](https://github.com/)',
    target: 'https://github.com/',
    ...overrides,
  });

export const createDocFreshnessRule = (
  overrides: Partial<{
    ruleId: string;
    documentPattern: string;
    warnThresholdDays: number;
    errorThresholdDays: number;
    enabled: boolean;
  }> = {},
): DocFreshnessRule =>
  DocFreshnessRule.create({
    ruleId: overrides.ruleId ?? 'adr-docs',
    documentPattern: overrides.documentPattern ?? 'docs/adr/**/*.md',
    threshold: createFreshnessThreshold({
      warnThresholdDays: overrides.warnThresholdDays ?? 14,
      errorThresholdDays: overrides.errorThresholdDays ?? 30,
    }),
    enabled: overrides.enabled ?? true,
  });

export const createPointerRule = (
  overrides: Partial<{
    ruleId: string;
    documentPattern: string;
    failOnBroken: boolean;
  }> = {},
): PointerRule =>
  PointerRule.create({
    ruleId: overrides.ruleId ?? 'docs-pointers',
    documentPattern: overrides.documentPattern ?? 'docs/**/*.md',
    failOnBroken: overrides.failOnBroken ?? true,
  });

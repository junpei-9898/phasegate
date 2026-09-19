// @story H10-02
// @unit quick-mode
// @layer unit-test
// @work-item-id WI-220
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QuickModeJudgmentEngine } from '../../../../../quick-mode/domain/services/quick-mode-judgment-engine.js';
import { ChangedFile } from '../../../../../quick-mode/domain/value-objects/changed-file.js';
import { QuickModeConfig } from '../../../../../quick-mode/domain/value-objects/quick-mode-config.js';

interface RiskCase {
  id: string;
  name: string;
  path: string;
  kind: string;
  before: string | null;
  after: string | null;
  semanticLabel: 'internal' | 'escalation' | 'unknown';
  rationale: string;
  legacyCategory: string;
  legacyEligible: boolean;
}

const corpus: RiskCase[] = JSON.parse(readFileSync(
  new URL('../../../../fixtures/wi-220/semantic-risk-corpus.json', import.meta.url), 'utf8',
));

// This characterizes legacy behavior; passing does NOT satisfy semantic-risk acceptance T20.
describe('意味リスク評価用corpusの既存判定', () => {
  it.each(corpus)('$name', (sample) => {
    // Arrange
    const engine = new QuickModeJudgmentEngine();
    const config = QuickModeConfig.create({
      allowedCategories: ['bugfix', 'docs', 'test', 'config'],
      maintainedLayers: ['L1', 'L2', 'L3'], relaxedGates: [],
    });
    const files = [ChangedFile.create({
      filePath: sample.path, changeKind: sample.kind,
      beforeContent: sample.before, afterContent: sample.after,
    })];

    // Act
    const actual = {
      category: engine.classify(files, config).dominantCategory?.toString(),
      eligible: engine.judge(files, config).isEligible(),
    };

    // Assert: semanticLabel is an independent review target, not a legacy expectation.
    expect(actual).toEqual({ category: sample.legacyCategory, eligible: sample.legacyEligible });
    expect(['internal', 'escalation', 'unknown']).toContain(sample.semanticLabel);
    expect(sample.rationale.trim()).not.toBe('');
  });
});

/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { RuleDefinitionRegistry } from './rule-definition-registry.js';
import { ImportGraph, matchesPattern } from '../value-objects/import-graph.js';
import { LayerBoundary } from '../value-objects/layer-boundary.js';
import { LintReport } from '../value-objects/lint-report.js';
import { RuleDefinition } from '../value-objects/rule-definition.js';
import { RuleViolation } from '../value-objects/rule-violation.js';
import { SourceModuleSnapshot } from '../value-objects/source-module-snapshot.js';

type LintRunnerParams = {
  readonly rules: readonly RuleDefinition[];
  readonly snapshots: readonly SourceModuleSnapshot[];
  readonly importGraph: ImportGraph;
  readonly durationMs: number;
};

const toNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' ? value : fallback;

const toStringArray = (value: unknown, fallback: readonly string[]): readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? Object.freeze([...value])
    : fallback;

const isTestFile = (snapshot: SourceModuleSnapshot): boolean =>
  snapshot.filePath.toString().includes('__tests__/');

export class LintRunner {
  private readonly ruleDefinitionRegistry: RuleDefinitionRegistry;

  constructor(ruleDefinitionRegistry: RuleDefinitionRegistry) {
    this.ruleDefinitionRegistry = ruleDefinitionRegistry;
  }

  run(params: LintRunnerParams): LintReport {
    for (const rule of params.rules) {
      this.ruleDefinitionRegistry.getByName(rule.name);
    }

    const violations: RuleViolation[] = [];
    const passedRules = [];
    const skippedRules = [];
    const snapshotByPath = new Map(
      params.snapshots.map((snapshot) => [snapshot.filePath.toString(), snapshot])
    );
    const layerByFile = new Map(
      params.snapshots
        .filter((snapshot) => snapshot.declaredLayer !== null)
        .map((snapshot) => [snapshot.filePath.toString(), snapshot.declaredLayer!])
    );

    for (const rule of params.rules) {
      if (!rule.isEnabled()) {
        skippedRules.push(rule.name);
        continue;
      }

      const ruleViolations: RuleViolation[] = [];

      switch (rule.name.toString()) {
        case 'require-unit-comment': {
          for (const snapshot of params.snapshots) {
            if (!snapshot.hasUnitComment()) {
              ruleViolations.push(
                RuleViolation.create({
                  filePath: snapshot.filePath,
                  line: 1,
                  column: 1,
                  ruleName: rule.name,
                  message: '@unitコメントが必要です',
                  severity: rule.severity,
                })
              );
            }
          }
          break;
        }
        case 'require-layer-comment': {
          for (const snapshot of params.snapshots) {
            if (!snapshot.hasLayerComment()) {
              ruleViolations.push(
                RuleViolation.create({
                  filePath: snapshot.filePath,
                  line: 1,
                  column: 1,
                  ruleName: rule.name,
                  message: '@layerコメントが必要です',
                  severity: rule.severity,
                })
              );
            }
          }
          break;
        }
        case 'no-layer-violation': {
          const ignorePatterns = toStringArray(rule.config.ignorePatterns, Object.freeze([]));

          for (const edge of params.importGraph.findLayerViolations(
            LayerBoundary.standardMatrix(),
            layerByFile,
            ignorePatterns
          )) {
            const fromSnapshot = snapshotByPath.get(edge.from.toString());
            if (fromSnapshot && isTestFile(fromSnapshot)) {
              continue;
            }
            ruleViolations.push(
              RuleViolation.create({
                filePath: edge.from,
                line: 1,
                column: 1,
                ruleName: rule.name,
                message: `禁止された依存です: ${edge.from.toString()} -> ${edge.to.toString()}`,
                severity: rule.severity,
              })
            );
          }

          for (const cycle of params.importGraph.detectCycles()) {
            const firstPath = cycle.path[0];
            const firstSnapshot = snapshotByPath.get(firstPath.toString());
            if (firstSnapshot && isTestFile(firstSnapshot)) {
              continue;
            }
            ruleViolations.push(
              RuleViolation.create({
                filePath: firstPath,
                line: 1,
                column: 1,
                ruleName: rule.name,
                message: `循環依存が検出されました: ${cycle.path.map((item) => item.toString()).join(' -> ')}`,
                severity: rule.severity,
              })
            );
          }
          break;
        }
        case 'enforce-folder-structure': {
          const ignorePatterns = toStringArray(rule.config.ignorePatterns, Object.freeze([]));

          for (const snapshot of params.snapshots) {
            if (isTestFile(snapshot)) {
              continue;
            }
            const filePathStr = snapshot.filePath.toString();
            if (ignorePatterns.some((pattern) => matchesPattern(filePathStr, pattern))) {
              continue;
            }
            if (snapshot.declaredLayer !== null && !snapshot.belongsToLayerDirectory()) {
              ruleViolations.push(
                RuleViolation.create({
                  filePath: snapshot.filePath,
                  line: 1,
                  column: 1,
                  ruleName: rule.name,
                  message: '宣言レイヤーとディレクトリ構造が一致していません',
                  severity: rule.severity,
                })
              );
            }
          }
          break;
        }
        case 'no-any-abuse': {
          const maxAnyCount = toNumber(rule.config.maxAnyCount, 0);
          const maxAnyRatio = toNumber(rule.config.maxAnyRatio, 0.05);

          for (const snapshot of params.snapshots) {
            if (isTestFile(snapshot)) {
              continue;
            }
            if (
              snapshot.anyTypeCount > maxAnyCount ||
              snapshot.anyRatio() > maxAnyRatio
            ) {
              ruleViolations.push(
                RuleViolation.create({
                  filePath: snapshot.filePath,
                  line: 1,
                  column: 1,
                  ruleName: rule.name,
                  message: 'anyの使用量が許容値を超えています',
                  severity: rule.severity,
                })
              );
            }
          }
          break;
        }
        case 'no-code-duplication': {
          const minOccurrences = toNumber(rule.config.minOccurrences, 2);
          const fingerprintGroups = new Map<string, SourceModuleSnapshot[]>();

          for (const snapshot of params.snapshots) {
            for (const fingerprint of snapshot.duplicationFingerprints) {
              const current = fingerprintGroups.get(fingerprint) ?? [];
              fingerprintGroups.set(fingerprint, [...current, snapshot]);
            }
          }

          const reportedPaths = new Set<string>();

          for (const group of fingerprintGroups.values()) {
            if (group.length < minOccurrences) {
              continue;
            }

            for (const snapshot of group) {
              if (reportedPaths.has(snapshot.filePath.toString())) {
                continue;
              }

              reportedPaths.add(snapshot.filePath.toString());
              ruleViolations.push(
                RuleViolation.create({
                  filePath: snapshot.filePath,
                  line: 1,
                  column: 1,
                  ruleName: rule.name,
                  message: '重複コードが検出されました',
                  severity: rule.severity,
                })
              );
            }
          }
          break;
        }
        case 'no-ghost-file': {
          const ignorePatterns = toStringArray(rule.config.ignorePatterns, Object.freeze([]));
          const entryPointPatterns = toStringArray(
            rule.config.entryPointPatterns,
            Object.freeze([])
          );

          for (const filePath of params.importGraph.findGhostFiles(
            ignorePatterns,
            entryPointPatterns
          )) {
            ruleViolations.push(
              RuleViolation.create({
                filePath,
                line: 1,
                column: 1,
                ruleName: rule.name,
                message: '未参照ファイルが検出されました',
                severity: rule.severity,
              })
            );
          }
          break;
        }
        case 'no-comment-flood': {
          const maxCommentRatio = toNumber(rule.config.maxCommentRatio, 0.35);
          const maxRepeatedBlocks = toNumber(rule.config.maxRepeatedBlocks, 1);
          const minLogicalLines = toNumber(rule.config.minLogicalLines, 15);

          for (const snapshot of params.snapshots) {
            if (isTestFile(snapshot)) {
              continue;
            }
            if (snapshot.logicalLineCount < minLogicalLines) {
              continue;
            }
            if (
              snapshot.commentDensity() > maxCommentRatio ||
              snapshot.repeatedCommentBlocks > maxRepeatedBlocks
            ) {
              ruleViolations.push(
                RuleViolation.create({
                  filePath: snapshot.filePath,
                  line: 1,
                  column: 1,
                  ruleName: rule.name,
                  message: 'コメント密度が許容値を超えています',
                  severity: rule.severity,
                })
              );
            }
          }
          break;
        }
        default: {
          this.ruleDefinitionRegistry.getByName(rule.name);
        }
      }

      if (ruleViolations.length === 0) {
        passedRules.push(rule.name);
      } else {
        violations.push(...ruleViolations);
      }
    }

    return LintReport.create({
      violations: Object.freeze(violations),
      passedRules: Object.freeze(passedRules),
      skippedRules: Object.freeze(skippedRules),
      durationMs: params.durationMs,
      scannedFiles: params.snapshots.length,
    });
  }
}

// @layer test
// @unit validator-system
// @story H08-03
// @work-item-id WI-134, WI-135
import { describe, expect, it, vi } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ArchitectureSemanticAnalysisService } from '../../../validator-system/domain/services/l4/architecture-semantic-analysis-service.js';

target('ArchitectureSemanticAnalysisService', () => {
  describe('analyze', () => {
    context('domain zone に denied capability がある場合', () => {
      it('side effect boundary advisory を L4-002 warning として返す (WI-134)', async () => {
        // Arrange
        const sourcePort = {
          collectSourceSemantics: vi.fn().mockResolvedValue([{
            filePath: 'scripts/harness/sample/domain/model.ts',
            zone: 'domain',
            effects: [{ kind: 'filesystem', evidence: 'node:fs import', confidence: 0.9 }],
            decisions: [],
          }]),
        };
        const sut = new ArchitectureSemanticAnalysisService({
          sourcePort,
          policy: {
            capabilityPolicies: { domain: { allowed: [], denied: ['filesystem'] } },
            decisionPolicies: { domain: { expected: ['business-rule-branch'], advisoryOnly: true } },
          },
        });

        // Act
        const actual = await sut.analyze();

        // Assert
        expect(actual.map((error) => ({
          code: error.code.toString(),
          severity: error.severity.toString(),
          message: error.message,
          suggestion: error.suggestion,
        }))).toEqual([{
          code: 'L4-002',
          severity: 'warning',
          message: 'Side effect capability denied: filesystem in domain at scripts/harness/sample/domain/model.ts',
          suggestion: 'confidence=0.9; evidence=node:fs import; suggested owner zone=infrastructure/adapters',
        }]);
      });
    });

    context('presentation zone に domain decision signal がある場合', () => {
      it('confidence / evidence / suggested owner zone 付きの decision placement advisory を返す (WI-135)', async () => {
        // Arrange
        const sourcePort = {
          collectSourceSemantics: vi.fn().mockResolvedValue([{
            filePath: 'scripts/harness/sample/presentation/controller.ts',
            zone: 'presentation',
            effects: [],
            decisions: [{ kind: 'business-rule-branch', evidence: 'branch-count=4', confidence: 0.72 }],
          }]),
        };
        const sut = new ArchitectureSemanticAnalysisService({
          sourcePort,
          policy: {
            capabilityPolicies: {},
            decisionPolicies: { presentation: { expected: ['validation-rule', 'error-construction'], advisoryOnly: true } },
          },
        });

        // Act
        const actual = await sut.analyze();

        // Assert
        expect(actual.map((error) => ({
          code: error.code.toString(),
          severity: error.severity.toString(),
          message: error.message,
          suggestion: error.suggestion,
        }))).toEqual([{
          code: 'L4-002',
          severity: 'warning',
          message: 'Decision placement advisory: business-rule-branch observed in presentation at scripts/harness/sample/presentation/controller.ts',
          suggestion: 'confidence=0.72; evidence=branch-count=4; suggested owner zone=domain; rollout=advisory',
        }]);
      });
    });
  });
});

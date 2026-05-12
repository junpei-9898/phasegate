/**
 * @layer test
 * @unit validator-system
 * @story H08-03
 * @work-item-id WI-139
 */
import { describe, expect, it } from 'vitest';
import { target } from '../../helpers/test-helpers.js';
import { SemanticDriftService } from '../../../validator-system/domain/services/l4/semantic-drift-service.js';

target('SemanticDriftService', () => {
  describe('detect()', () => {
    it('design behavior が code/test のどちらかで欠落している場合に report する', () => {
      // Arrange
      const sut = new SemanticDriftService();
      // Act
      const actual = sut.detect({
        designIntents: [{ unitName: 'validator-system', behaviorId: 'run-l4', source: 'logical_design.md' }],
        implementationBehaviors: [],
        testObservations: [],
      });
      // Assert
      expect(actual.map((report) => report.kind)).toEqual([
        'design-behavior-missing-code',
        'design-behavior-missing-test',
      ]);
    });

    it('public code behavior が design/test にない場合に report する', () => {
      // Arrange
      const sut = new SemanticDriftService();
      // Act
      const actual = sut.detect({
        designIntents: [],
        implementationBehaviors: [
          { unitName: 'validator-system', behaviorId: 'new-public-behavior', source: 'service.ts', isPublic: true },
        ],
        testObservations: [],
      });
      // Assert
      expect(actual.map((report) => report.kind)).toEqual([
        'code-behavior-missing-design',
        'code-behavior-missing-test',
      ]);
    });

    it('test が design にない behavior を固定している場合 warning を出す', () => {
      // Arrange
      const sut = new SemanticDriftService();
      // Act
      const actual = sut.detect({
        designIntents: [],
        implementationBehaviors: [],
        testObservations: [{ unitName: 'validator-system', behaviorId: 'accidental-contract', source: 'service.test.ts' }],
      });
      // Assert
      expect(actual).toEqual([
        expect.objectContaining({
          kind: 'test-observation-missing-design',
          severity: 'warning',
          unitName: 'validator-system',
          behaviorId: 'accidental-contract',
        }),
      ]);
    });
  });
});

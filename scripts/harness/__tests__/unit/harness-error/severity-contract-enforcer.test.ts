/**
 * @layer domain
 * @unit harness-error
 * @story H06-03
 *
 * SeverityContractEnforcer ドメインサービスのユニットテスト
 */
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { Severity } from '../../../harness-error/domain/value-objects/severity.js';
import { SeverityContractEnforcer } from '../../../harness-error/domain/services/severity-contract-enforcer.js';
import { SeverityDowngradeViolationError } from '../../../harness-error/domain/errors/severity-downgrade-violation-error.js';

const createSeverity = (value: 'error' | 'warning' = 'warning') => Severity.create(value);

target('SeverityContractEnforcer', () => {
  target('resolveEffectiveSeverity', () => {
    context('errorからwarningへの格下げが要求された場合', () => {
      // UT-HE-096
      it('SeverityDowngradeViolationErrorをthrowすること', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const defaultSeverity = createSeverity('error');
        const requestedSeverity = createSeverity('warning');

        // Act
        const actual = () => sut.resolveEffectiveSeverity(requestedSeverity, defaultSeverity);

        // Assert
        expect(actual).toThrowError(SeverityDowngradeViolationError);
      });
    });

    context('defaultSeverityがerrorでrequestedがwarningの場合', () => {
      // UT-HE-102
      it('SeverityDowngradeViolationErrorをthrowすること', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const defaultSeverity = createSeverity('error');
        const requestedSeverity = createSeverity('warning');

        // Act
        const actual = () => sut.resolveEffectiveSeverity(requestedSeverity, defaultSeverity);

        // Assert
        expect(actual).toThrowError(SeverityDowngradeViolationError);
      });
    });

    context('契約違反が発生した場合', () => {
      // @ac AC-4
      // H06-03 AC-4: 契約違反時のエラーメッセージに違反内容（default/requested severity）と
      // 根拠（ADR参照）が含まれることを検証する。
      it('エラーメッセージに違反内容と根拠ADR参照が含まれること', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const defaultSeverity = createSeverity('error');
        const requestedSeverity = createSeverity('warning');

        // Act
        let actual: SeverityDowngradeViolationError | undefined;
        try {
          sut.resolveEffectiveSeverity(requestedSeverity, defaultSeverity);
        } catch (error) {
          actual = error as SeverityDowngradeViolationError;
        }

        // Assert
        expect(actual).toBeInstanceOf(SeverityDowngradeViolationError);
        expect(actual?.message).toContain('error');
        expect(actual?.message).toContain('warning');
        expect(actual?.message).toContain('ADR-021');
      });
    });
  });

  target('assertNoDowngrade', () => {
    describe('格下げ検出を行う', () => {
      // UT-HE-098
      it('格上げの場合に例外をthrowしないこと', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const requestedSeverity = createSeverity('error');
        const defaultSeverity = createSeverity('warning');

        // Act
        const actual = () => sut.assertNoDowngrade(requestedSeverity, defaultSeverity);

        // Assert
        expect(actual).not.toThrow();
      });

      // UT-HE-099
      it('同一severityの場合に例外をthrowしないこと', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const requestedSeverity = createSeverity('warning');
        const defaultSeverity = createSeverity('warning');

        // Act
        const actual = () => sut.assertNoDowngrade(requestedSeverity, defaultSeverity);

        // Assert
        expect(actual).not.toThrow();
      });
    });

    context('格下げが検出された場合', () => {
      // UT-HE-097
      it('SeverityDowngradeViolationErrorをthrowすること', () => {
        // Arrange
        const sut = new SeverityContractEnforcer();
        const requestedSeverity = createSeverity('warning');
        const defaultSeverity = createSeverity('error');

        // Act
        const actual = () => sut.assertNoDowngrade(requestedSeverity, defaultSeverity);

        // Assert
        expect(actual).toThrowError(SeverityDowngradeViolationError);
      });
    });
  });
});

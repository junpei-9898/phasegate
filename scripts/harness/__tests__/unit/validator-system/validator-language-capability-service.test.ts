// @layer test
// @unit validator-system
// @story H08-02
// @work-item-id WI-212
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { ValidatorLanguageCapabilityService } from '../../../validator-system/domain/services/validator-language-capability-service.js';
import { ValidatorId } from '../../../validator-system/domain/value-objects/validator-id.js';

target('ValidatorLanguageCapabilityService', () => {
  describe('getUnsupportedValidatorIds: project.languages に対応しない validator を判定すること', () => {
    context('TypeScript を含まないプロジェクトの場合', () => {
      it('TypeScript 専用 validator ID を返す', () => {
        const service = new ValidatorLanguageCapabilityService();
        const actual = service.getUnsupportedValidatorIds(
          [ValidatorId.create('L3-001'), ValidatorId.create('L3-002'), ValidatorId.create('L3-003'), ValidatorId.create('L4-003')],
          ['python'],
        );

        expect(actual).toEqual(new Set(['L3-002', 'L3-003', 'L4-003']));
      });
    });

    context('TypeScript を含むプロジェクトの場合', () => {
      it('unsupported ID を返さない', () => {
        const service = new ValidatorLanguageCapabilityService();
        const actual = service.getUnsupportedValidatorIds(
          [ValidatorId.create('L3-002'), ValidatorId.create('L3-003'), ValidatorId.create('L4-003')],
          ['python', 'typescript'],
        );

        expect(actual).toEqual(new Set());
      });
    });
  });
});

// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { AdrFrontmatter } from '../../../adr-foundation/domain/value-objects/adr-frontmatter.js';
import { RegexAdrFrontmatterParser } from '../../../adr-foundation/infrastructure/parsers/regex-adr-frontmatter-parser.js';

target('RegexAdrFrontmatterParser', () => {
  describe('parseFrontmatter', () => {
    context('archgateとsuperseded_byを含むYAML frontmatterを渡す場合', () => {
      it('frontmatter値オブジェクトへ正しく変換される', () => {
        // Arrange
        const sut = new RegexAdrFrontmatterParser();
        const raw = `---
adr_id: 001
title: Package separation
status: Superseded
date: 2026-03-13
superseded_by: ADR-002
archgate:
  enforced_by:
    - validator_id: phase-gate
      error_code: L1-001
    - validator_id: architecture
      error_code: L2-001
---`;

        // Act
        const actual = sut.parseFrontmatter(raw);

        // Assert
        expect(actual.toPrimitives()).toEqual({
          adr_id: '001',
          title: 'Package separation',
          status: 'Superseded',
          date: '2026-03-13',
          superseded_by: 'ADR-002',
          archgate: {
            enforced_by: [
              { validator_id: 'phase-gate', error_code: 'L1-001' },
              { validator_id: 'architecture', error_code: 'L2-001' },
            ],
          },
        });
      });
    });
  });

  describe('serializeFrontmatter', () => {
    context('archgate付きfrontmatterをシリアライズする場合', () => {
      it('仕様のキー順でYAML frontmatterへ変換される', () => {
        // Arrange
        const sut = new RegexAdrFrontmatterParser();
        const frontmatter = AdrFrontmatter.create({
          adr_id: '001',
          title: 'Package separation',
          status: 'Accepted',
          date: '2026-03-13',
          archgate: {
            adr_id: '001',
            enforced_by: [{ validator_id: 'phase-gate', error_code: 'L1-001' }],
          },
        });

        // Act
        const actual = sut.serializeFrontmatter(frontmatter);

        // Assert
        expect(actual).toBe(`---
adr_id: 001
title: Package separation
status: Accepted
date: 2026-03-13
archgate:
  enforced_by:
    - validator_id: phase-gate
      error_code: L1-001
---`);
      });
    });
  });
});

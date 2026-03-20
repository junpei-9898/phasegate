import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ADR } from '../../../adr-foundation/domain/aggregates/adr.js';
import { AdrValidationService } from '../../../adr-foundation/domain/services/adr-validation-service.js';
import {
  AdrMarkdownSerializer,
  toAsciiKebabCase,
} from '../../../adr-foundation/infrastructure/serializers/adr-markdown-serializer.js';

const createAdr = (title = 'Full migration from ESLint to Biome'): ADR =>
  ADR.create(
    {
      adr_id: '002',
      title,
      status: 'Accepted',
      date: '2026-03-13',
    },
    {
      context: 'Current linting stack is split.',
      decision: 'Use Biome only.',
      consequences: 'Tooling becomes simpler.',
      alternatives: 'Keep dual toolchain.',
    },
    new AdrValidationService(),
  );

target('AdrMarkdownSerializer', () => {
  describe('serialize', () => {
    context('ADR集約を保存用Markdownへ変換する場合', () => {
      it('H1とcanonical section順で末尾改行付き文字列を返す', () => {
        // Arrange
        const sut = new AdrMarkdownSerializer();
        const adr = createAdr();

        // Act
        const actual = sut.serialize(adr);

        // Assert
        expect(actual).toBe(`# Full migration from ESLint to Biome

## Context

Current linting stack is split.

## Decision

Use Biome only.

## Consequences

Tooling becomes simpler.

## Alternatives

Keep dual toolchain.
`);
      });
    });
  });

  describe('toAsciiKebabCase', () => {
    context('ASCIIタイトルをslug化する場合', () => {
      it('lower-kebab-caseへ変換される', () => {
        // Arrange
        const title = 'Full migration from ESLint to Biome';

        // Act
        const actual = toAsciiKebabCase(title);

        // Assert
        expect(actual).toBe('full-migration-from-eslint-to-biome');
      });
    });

    context('ASCIIへ正規化できないタイトルをslug化する場合', () => {
      it('untitledへフォールバックされる', () => {
        // Arrange
        const title = '日本語タイトル';

        // Act
        const actual = toAsciiKebabCase(title);

        // Assert
        expect(actual).toBe('untitled');
      });
    });
  });
});

// @layer test
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import { ADR } from '../../../adr-foundation/domain/aggregates/adr.js';
import { AdrValidationService } from '../../../adr-foundation/domain/services/adr-validation-service.js';
import { AdrMarkdownDocumentParser } from '../../../adr-foundation/infrastructure/parsers/adr-markdown-document-parser.js';
import { RegexAdrFrontmatterParser } from '../../../adr-foundation/infrastructure/parsers/regex-adr-frontmatter-parser.js';

const createAdr = (): ADR =>
  ADR.create(
    {
      adr_id: '001',
      title: 'Package separation',
      status: 'Accepted',
      date: '2026-03-13',
    },
    {
      context: '背景',
      decision: '判断',
      consequences: '結果',
      alternatives: '代替案',
    },
    new AdrValidationService(),
  );

target('AdrMarkdownDocumentParser', () => {
  describe('parseDocument', () => {
    context('日本語見出しを含むADR Markdownを渡す場合', () => {
      it('canonical sectionに正規化して本文を復元できる', () => {
        // Arrange
        const sut = new AdrMarkdownDocumentParser(new RegexAdrFrontmatterParser());
        const rawMarkdown = `---
adr_id: 001
title: Package separation
status: Accepted
date: 2026-03-13
---

# Package separation

## コンテキスト

背景

## 決定

判断

## 結果

結果

## 代替案

代替案
`;

        // Act
        const actual = sut.parseDocument(rawMarkdown);

        // Assert
        expect(actual.frontmatter.toPrimitives()).toEqual({
          adr_id: '001',
          title: 'Package separation',
          status: 'Accepted',
          date: '2026-03-13',
        });
        expect(actual.body.toSectionMap()).toEqual({
          Context: '背景',
          Decision: '判断',
          Consequences: '結果',
          Alternatives: '代替案',
        });
      });
    });
  });

  describe('serializeDocument', () => {
    context('ADR集約をMarkdownへ変換する場合', () => {
      it('frontmatterと英語見出しの本文が連結される', () => {
        // Arrange
        const sut = new AdrMarkdownDocumentParser(new RegexAdrFrontmatterParser());
        const adr = createAdr();

        // Act
        const actual = sut.serializeDocument(adr);

        // Assert
        expect(actual).toBe(`---
adr_id: 001
title: Package separation
status: Accepted
date: 2026-03-13
---

# Package separation

## Context

背景

## Decision

判断

## Consequences

結果

## Alternatives

代替案
`);
      });
    });
  });
});

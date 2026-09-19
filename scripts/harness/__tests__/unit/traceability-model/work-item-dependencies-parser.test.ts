// @story H03-04
// @unit traceability-model
// @layer infrastructure
// @work-item-id WI-220
import { describe, expect, it } from 'vitest';
import { parseWorkItemDependencies, parseWorkItemFrontmatter } from '../../../traceability-model/infrastructure/parsers/work-item-frontmatter-parser.js';
import { WorkItemFrontmatterValidationError } from '../../../traceability-model/domain/value-objects/work-item-frontmatter.js';

const document = (declaration: string) => `---\nid: WI-1\ntype: refactor\n${declaration}\n---\n# Design\n`;

describe('WIの依存宣言を既存metadataと分離して読む', () => {
  it.each([
    { name: '未記載', value: '', expected: undefined },
    { name: '明示的な依存なし', value: 'depends_on: []', expected: [] },
    { name: '複数の依存', value: 'depends_on: [WI-2, WI-3]', expected: ['WI-2', 'WI-3'] },
    { name: '引用符付きID', value: 'depends_on: ["WI-2", \'WI-3\']', expected: ['WI-2', 'WI-3'] },
    { name: '配列の後のコメント', value: 'depends_on: [] # reviewed', expected: [] },
    { name: '複数行配列', value: 'depends_on:\n  - WI-2\n  - WI-3\nsource: internal', expected: ['WI-2', 'WI-3'] },
    { name: '複数行配列のコメント', value: 'depends_on: # dependencies\n  # shared contract\n  - WI-2 # reviewed\n\n  - "WI-3"', expected: ['WI-2', 'WI-3'] },
    { name: 'CRLFの複数行配列', value: 'depends_on:\r\n  - WI-2\r\n  - WI-3', expected: ['WI-2', 'WI-3'] },
  ])('$nameを区別して返すこと', ({ value, expected }) => {
    const actual = parseWorkItemDependencies(document(value));
    expect(actual).toEqual(expected);
  });

  it.each([
    'depends_on: WI-2',
    'depends_on:',
    'depends_on: [WI-2,,WI-3]',
    'depends_on: [WI-2,]',
    'depends_on: ["", WI-2]',
    'depends_on: [US-002]',
    'depends_on: [../WI-2]',
    'depends_on: []\ndepends_on: [WI-2]',
    'depends_on: &deps [WI-2]',
    'depends_on: *deps',
    'custom:\n  depends_on: []',
    'depends_on: [WI-2]\n  - WI-3',
    'depends_on:\n  - WI-2\n  -',
    'depends_on:\n  - WI-2\n  unexpected',
  ])('不正な宣言 %s は追加の読取経路だけで理由を示すこと', (value) => {
    const content = document(value);
    const actual = () => parseWorkItemDependencies(content);
    expect(actual).toThrow(WorkItemFrontmatterValidationError);
    expect(actual).toThrow(/depends_on/);
    // Existing callers keep their original return contract, even for formerly ignored fields.
    expect(parseWorkItemFrontmatter(content)).toEqual({ id: 'WI-1', type: 'refactor' });
  });

  it('本文中の記載を依存宣言として扱わないこと', () => {
    const actual = parseWorkItemDependencies(`${document('')}\ndepends_on: [WI-2]\n`);
    expect(actual).toBeUndefined();
  });

  it('frontmatterのない旧文書は依存未宣言として扱うこと', () => {
    const actual = parseWorkItemDependencies('# Old document\ndepends_on: [WI-2]');
    expect(actual).toBeUndefined();
  });
});

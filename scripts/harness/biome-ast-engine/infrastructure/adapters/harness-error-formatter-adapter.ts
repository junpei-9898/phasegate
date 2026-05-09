/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

import type { RuleViolation } from '../../domain/value-objects/rule-violation.js';
import type { ViolationFormatterPort } from '../../domain/ports/violation-formatter-port.js';
import { mapRuleNameToCode } from '../mappers/rule-violation-code-mapper.js';

const RULE_SUGGESTIONS: Readonly<Record<string, string>> = {
  'require-unit-comment': 'ファイル先頭に @unit コメントを追加する',
  'require-layer-comment': 'ファイル先頭に @layer コメントを追加する',
  'no-layer-violation': '依存方向をアーキテクチャ方針に合わせる',
  'enforce-folder-structure': '宣言レイヤーと配置ディレクトリを一致させる',
  'no-any-abuse': '型注釈を追加してanyを削減する',
  'no-code-duplication': '共通化または抽象化を行う',
  'no-ghost-file': '参照されないファイルを削除またはエントリポイントとして扱う',
  'no-comment-flood': '不要なコメントを整理し自己説明的なコードへ改善する',
};

const METADATA_TAG_MESSAGE_PATTERN = /(@[a-z][a-zA-Z0-9]*)コメントが必要です/;

const resolveSuggestion = (ruleName: string, message: string): string => {
  if (ruleName === 'require-unit-comment' || ruleName === 'require-layer-comment') {
    const tagName = message.match(METADATA_TAG_MESSAGE_PATTERN)?.[1];

    if (tagName) {
      return `ファイル先頭に ${tagName} コメントを追加する`;
    }
  }

  return RULE_SUGGESTIONS[ruleName] ?? '';
};

/**
 * ViolationFormatterPort の実装。
 * RuleViolation をルール名から L1-001〜L1-008 コードへマッピングし、
 * 人間可読な出力形式へ変換する。
 */
export class HarnessErrorFormatterAdapter implements ViolationFormatterPort {
  async format(
    violations: readonly RuleViolation[]
  ): Promise<
    readonly {
      code: string;
      severity: 'error' | 'warning';
      message: string;
      suggestion: string;
      adr_ref?: string;
      fix_example?: string;
    }[]
  > {
    return Object.freeze(
      violations.map((v) => {
        const ruleName = v.ruleName.toString();
        const code = mapRuleNameToCode(ruleName);
        const suggestion = resolveSuggestion(ruleName, v.message);

        const entry: {
          code: string;
          severity: 'error' | 'warning';
          message: string;
          suggestion: string;
          adr_ref?: string;
          fix_example?: string;
        } = {
          code,
          severity: v.severity,
          message: `${v.filePath.toString()}:${v.line}:${v.column} ${v.message}`,
          suggestion,
        };

        if (v.fixExample !== null) {
          entry.fix_example = v.fixExample;
        }

        return Object.freeze(entry);
      })
    );
  }
}

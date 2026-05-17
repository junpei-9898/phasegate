# WI-202 Domain Model

## Concepts

| Concept | Definition | Owner |
|---|---|---|
| Quick Mode Advertised Scope | `/quick-implementor` がユーザーに「扱える」と宣言するカテゴリ集合。現状は `bugfix/docs/test/config`。 | installation / skills |
| Quick Mode Effective Scope | 解決済み `phasegate.config.json` の `quickMode.allowedCategories` によって hook が実際に許可するカテゴリ集合。 | config-foundation |
| Caller Skill Context | hook block guidance を caller に合わせるための任意メタデータ。判定を bypass する権限ではない。 | agent-integration |
| Recovery Guidance | block 時に agent / human が次に取るべき正規経路を示す message。 | agent-integration |

## Invariants

- `allowedCategories` は Quick Mode category enum に含まれる値だけを生成する。
- `Quick Mode Advertised Scope` と strict workflow の `Quick Mode Effective Scope` は、意図した差分がある場合も文書上明示される。
- Caller Skill Context は block 判定を弱めない。message selection のみに使う。
- protected file は Quick Mode category に関わらず direct Edit / Write を block できる。

## Error Semantics

| Condition | Block Reason | Required Metadata |
|---|---|---|
| 許可カテゴリ外の write | `FULL_MODE_REQUIRED` | `dominantCategory`, `rejectionRule`, `rejectionReason`, optional `callerSkill` |
| protected file direct write | `PROTECTED_FILE` | `blockedFilePath` |
| product reflection 未反映 | `STORY_REFLECTION` | blockers / warnings |

## Policy Notes

`chore` は現 Quick Mode category enum の説明 (`bugfix/docs/test/config`) に含まれていないため、workflow default として生成するなら enum / classifier / docs / SKILL.md を同時に拡張する必要がある。WI-202 では、まず既存 enum との整合を優先する。

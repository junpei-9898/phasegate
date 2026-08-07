# WI-384 Unit Test Design

<!-- @work-item-id WI-384 -->

## Agent integration domain

| ID | 日本語テストケース | Expected |
|---|---|---|
| UT-WI384-PATCH-001 | Update directive を抽出する | `{ filePath, changeKind: "MODIFY" }` |
| UT-WI384-PATCH-002 | Add directive を抽出する | `{ filePath, changeKind: "CREATE" }` |
| UT-WI384-PATCH-003 | Delete directive を抽出する | `{ filePath, changeKind: "DELETE" }` |
| UT-WI384-PATCH-004 | Update・Add・Delete が混在する複数ファイル patch を抽出する | directive 順の 3 targets |
| UT-WI384-PATCH-005 | space を含む path と前後空白を処理する | path 本体を保持し外側だけ trim |
| UT-WI384-PATCH-006 | 同一 target directive が重複する | 最初の `{path, kind}` だけを保持 |
| UT-WI384-PATCH-007 | End marker が欠ける | command 末尾まで fail-closed scan |
| UT-WI384-PATCH-008 | marker 外や hunk 本文の類似行を受ける | target に数えない |
| UT-WI384-PATCH-009 | 空文字・marker なし patch を受ける | frozen empty result |
| UT-WI384-PATCH-010 | Update 直後に Move to を受ける | source MODIFY、destination CREATE の順で返す |
| UT-WI384-PATCH-011 | 行頭空白付き file directive を受ける | Codex 文法外として抽出しない |

## Bash compatibility

| ID | 日本語テストケース | Expected |
|---|---|---|
| UT-WI384-BASH-001 | Bash heredoc apply_patch を抽出する | 既存 path-only result と順序が不変 |
| UT-WI384-BASH-002 | patch と redirect が混在する | 全 path を重複なく返す |
| UT-WI384-BASH-003 | tee・sed・cp・mv 等の既存 fixture を実行する | 全既存期待値が不変 |

## Quick-mode application

| ID | 日本語テストケース | Expected |
|---|---|---|
| UT-WI384-QM-001 | explicit CREATE と before/after が競合する | explicit CREATE を優先 |
| UT-WI384-QM-002 | explicit MODIFY を受ける | MODIFY として分類 |
| UT-WI384-QM-003 | explicit DELETE を受ける | DELETE として bugfix / path rule を評価 |
| UT-WI384-QM-004 | explicit kind がない既存 targetChanges を受ける | 従来の before/after 推定が不変 |
| UT-WI384-QM-005 | targetChanges 自体がない CLI 経路を受ける | file existence 推定が不変 |

## Installation application

| ID | 日本語テストケース | Expected |
|---|---|---|
| UT-WI384-DOC-001 | phasegate command と Bash matcher だけがある | apply_patch 欠落の red finding |
| UT-WI384-DOC-002 | PreToolUse だけ apply_patch を含む | PostToolUse 欠落の red finding |
| UT-WI384-DOC-003 | PostToolUse だけ apply_patch を含む | PreToolUse 欠落の red finding |
| UT-WI384-DOC-004 | 両 event が Bash と apply_patch を含む | finding なし |
| UT-WI384-DOC-005 | 別 event / user hook に apply_patch 文字列だけある | 充足扱いにしない |
| UT-WI384-DOC-006 | malformed JSON を受ける | manual red finding |
| UT-WI384-DOC-007 | user customization と stale phasegate entry が共存する | ai-assisted repair mode |

## 規約

- Vitest を使い、全 `it()` 名は日本語かつ suite 全体で重複させない。
- Arrange / Act / Assert を明示し、Act の結果は `actual` に代入する。
- domain service / value object は実体を使い、domain 層をモックしない。
- Port の test double は application 境界に限定する。
- 新規・更新テストには `@work-item-id WI-384` を付ける。
- 同名 TestReference を生まないよう実装前に重複 `it()` 名を検索し、WCR-005 obligation の
  新規発生がないことを World 検証で確認する。

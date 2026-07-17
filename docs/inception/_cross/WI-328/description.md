---
type: fix
source: verification-followup (github#39 残課題)
---

# WI-328: 言語自動検出の結果が status に表示されず、判定根拠が不可視

## 問題

WI-319/320 (github#39) で `project.languages` 未宣言時にファイルシステムマーカーから
言語を自動検出するようになったが、検出結果がどこにも表示されなかった。
ユーザーは自分のプロジェクトがどの言語と判定されたか
（= どの validator が有効/SKIP になるか）を知る術がない。

## 修正

`phasegate:status` の JSON 出力（data = HarnessStatusSummary）に `languages`
フィールドを追加した:

```json
"languages": { "effective": ["typescript", "go"], "source": "detected" }
```

- `effective` — 実効言語リスト（validator の有効/SKIP 判定に使われるもの）
- `source` — 出所
  - `declared`: config の `project.languages` 宣言
  - `detected`: ファイルシステムマーカーからの自動検出（WI-319）
  - `fallback`: 検出ゼロで typescript フォールバック

### 実装方針

- 検出ロジックは再実装せず、validator-system の
  `harness-config-validator-config-adapter.ts` に解決関数
  `resolveProjectLanguages()` を export で切り出して共有
  （`getProjectLanguages()` と status 表示が同一テーブル・同一優先順位を使う）。
- `ConfigQueryPort` に optional メソッド `getLanguageInfo?()` を追加（後方互換）。
  未実装ポートでは `languages` フィールドは出力されない。
- 既存の status 出力フィールドは変更せず、追加のみ。

## Acceptance Criteria

- [x] `phasegate:status` の data に `languages`（effective + source）が含まれる
- [x] declared / detected / fallback の 3 ケースがテストで固定される
- [x] 検出テーブル（LANGUAGE_MARKER_FILES / typescript マーカー判定）の複製を作らない
- [x] ConfigQueryPort への追加は optional で後方互換
- [x] 既存 status 出力フィールドは無変更（追加のみ）

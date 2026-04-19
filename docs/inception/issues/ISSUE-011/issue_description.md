# ISSUE-011: validate-metadata の UX / parser / drift 検出の改善集

## ステータス

- **起票日**: 2026-04-19
- **発見契機**: ISSUE-008 Phase B-2 (v0.50.0) 完了後の事故パターン棚卸しで、6 項目の「検出漏れ・UX 劣化・挙動の不確実性」が特定された。運用で回避可能だがユーザー体験を損なう
- **影響Unit**: traceability-model（主）, harness-error（エラーメッセージ）, phase2-extensions（drift 検出）
- **深刻度**: P3（運用で回避可能 / ブロッカーではない）
- **優先度**: P2〜P3 — ISSUE-008 Phase B/C を優先し、本 issue は Phase D 以降に着手

## 問題の概要

ISSUE-008 Phase B-2 で `validate-metadata` CLI が `.md` ファイル検証に対応した結果、実運用で以下の事故パターンが発現しうることが判明した。いずれも「validator は動いているが、UX・parser 精度・drift 検出の観点で改善余地がある」という性質で、個別には軽微だが積み重なるとユーザーの信頼を損なう。

## 確認された問題（severity 順）

### P2-1. parser が prose 中の `@story-id HXX-XX` を誤検出する

**影響**: 設計文書のコメント・説明・テストケース名等で `@story-id` を概念として言及すると、parser が inline 注釈として検出して FAIL する。文書の説明力を下げる。

**現状**:
- `markdown-story-annotation-parser.ts:16` の `STORY_ID_INLINE_PATTERN = /@story-id\s+(\S+)/` が markdown 構文（backtick / code fence）を理解しない
- 結果: `` `@story-id H03-01` のように付与します `` のような文が inline 違反扱い
- 事例: ISSUE-008 Phase B-2 付帯修正で `traceability-model/it_test_design.md` 等 3 ファイルで発現（プレースホルダー化で回避）

**根本原因**: parser がラインベースの正規表現で markdown 構造を無視して走査する

**修正案**:
- 案 A: parser に markdown code-span / code-fence 検出ロジックを追加し、そこに含まれる `@story-id` はスキップ
- 案 B: 現仕様のまま、skill 指示で「プレースホルダー `HXX-XX` を使え」と徹底（既に Phase B-1 で一部記載済）

**推奨**: 案 A（parser 改善）。案 B は「人間が間違いに気をつける」対応で根本解決にならない

---

### P2-2. フルパス / 未許可 prefix を渡すと "failed unexpectedly" で原因不明

**影響**: CLI ユーザーが `/Users/me/proj/docs/foo.md` のような絶対パスや `README.md` を渡すと、`ProjectRelativePath.create()` が throw し、handler の catch で `exitCode 2, "Error: metadata validation failed unexpectedly"` という汎用メッセージが返る。原因が `ProjectRelativePath` の制約（`docs/` または `scripts/` prefix 必須）であることが伝わらない

**現状**:
- `validate-metadata-command-handler.ts` の `try/catch` が例外をすべて汎用メッセージに丸める
- `ProjectRelativePath.ts:42` が prefix 制約を持つが、エラーメッセージは handler に届かない

**修正案**: handler の catch で `ProjectRelativePathError` をキャッチして具体メッセージ化（例: `"Path must start with 'docs/' or 'scripts/': <value>"`）

---

### P2-3. `.mdx` / `.markdown` が silently fallback

**影響**: 設計文書を `.mdx` 等で保存しているプロジェクトでは、handler が `.md` しか design UseCase に振り分けないため、implementation UseCase に fallback して `@unit` / `@layer` を要求 → 失敗 or ユーザーが「なぜか効かない」と感じる

**現状**:
- `validate-metadata-command-handler.ts` の `DESIGN_DOCUMENT_EXTENSION = '.md'` 固定
- `.mdx` / `.markdown` 等のバリエーション非対応

**修正案**:
- 案 A: サポート拡張子集合を `Set<string>` にして `['.md', '.mdx', '.markdown']` に拡張
- 案 B: `phasegate.config.json` で設計文書拡張子をユーザー設定可能にする

**推奨**: 案 A（固定 Set）。設定化は過剰仕様

---

### P3-4. `initial_creation: true` の semantic drift

**影響**: 新規作成時に `initial_creation: true` を付けた文書が、半年後 / 1 年後も同フラグのままになり「毎回 initial 扱い = 注釈不要」として validator を素通りする。設計文書の累積更新トレーサビリティが長期的に崩壊

**現状**:
- validator は frontmatter の値を信頼する（`initial_creation: true` → 注釈不要）
- `doc-freshness-checker` は git log の mtime しか見ず、frontmatter のセマンティクスは扱わない
- drift-detection は実装↔設計の乖離のみを検出、frontmatter 自体の陳腐化は未対象

**修正案**:
- 案 A: 新 validator `initial-creation-expiration-checker` を追加。`initial_creation: true` のまま N 日以上経過 or M 回以上コミットされた文書を WARN として報告
- 案 B: skill 指示で「2 回目以降の改訂では frontmatter を削除する」ルール化 + skill がスキャンして警告

**推奨**: 案 A（自動検出）。案 B は人間依存で結局忘れられる

---

### P3-5. parser が 1 文字差（スペース有無）で挙動が 180° 変わる

**影響**: `@story-id H03-01追加内容`（スペース無し）は silently skip、`@story-id H03-01 追加内容`（スペース有り）は inline 違反で FAIL。ユーザーが意図せず後者を書くと突然エラーで分かりにくい

**現状**:
- `STORY_ID_INLINE_PATTERN = /@story-id\s+(\S+)/` が `\s+` を要求
- `markdown-design-document-gateway.ts:77-89` で `StoryId.parse()` が失敗したら silently skip
- 結果: `H03-01追加内容`（無スペース） → parse 失敗 → skip、`H03-01` → parse 成功 → inline 違反として報告

**修正案**: P2-1 と連動。parser を markdown 構文対応にすれば、prose 内の記述は code-span として扱われて両ケースとも skip される

---

### P3-6. 複数エラーの一部しか表示されない

**影響**: 1 ファイルに inline 違反 7 箇所あっても報告は 2 件だけ、修正後に隠れていた違反が新たに噴出する「終わらない修正サイクル」

**現状**:
- P3-5 の silently skip が原因で、parser が返す annotation 配列が期待より少ない
- validator の `validateDesignDocument` は annotation 数だけ error を生成するが、そもそも annotation が parser 段階でふるい落とされる

**修正案**: P2-1 / P3-5 の parser 改善で annotation 検出精度を上げれば、報告漏れも自然に解消する

---

## 非対象（スコープ外）

- **完全な markdown AST パーサー導入**: `remark` / `unified` 等の依存追加は phasegate の「最小依存」哲学に反する。正規表現ベースでの code-span / code-fence 検出で十分
- **AI による自動修正**: 「AI 非依存」原則に反する
- **validateTest / @story タグ側の改善**: ISSUE-008 Phase C で扱う範疇。本 issue は `.md` 設計文書側のみ対象

## 受け入れ基準

- [ ] P2-1: parser が code-span (`` ` `` で囲まれた `@story-id`) を inline 違反として検出しない
- [ ] P2-1: parser が code-fence (``` ``` ``` ``` で囲まれたブロック) 内の `@story-id` をスキップする
- [ ] P2-2: フルパス / 未許可 prefix に対して `ProjectRelativePathError` の内容を CLI に伝播する
- [ ] P2-3: `.mdx` / `.markdown` 拡張子を design UseCase に振り分ける
- [ ] P3-4: `initial_creation: true` のまま 90 日以上経過した設計文書を WARN 出力する validator を追加
- [ ] P3-5 / P3-6: P2-1 改善で自動的に解消（単独の受け入れ基準は不要）

## 推奨実装順

**Wave 1（P2 優先 / Phase B-3 と並走可）**:
1. P2-2: CLI エラーメッセージ改善（30 分程度・軽微）
2. P2-3: 拡張子 Set 化（30 分程度・軽微）

**Wave 2（parser 改善・やや大きめ）**:
3. P2-1 / P3-5 / P3-6: `markdown-story-annotation-parser.ts` に code-span / code-fence skip を追加
   - テスト追加: inline code 内 / code block 内の `@story-id` が annotation 配列に含まれないこと
   - 副次効果として P3-5 / P3-6 も解消

**Wave 3（drift 検出・設計議論要）**:
4. P3-4: `initial-creation-expiration-checker` の新設
   - 閾値（日数 / コミット回数）を phasegate.config.json でユーザー設定可能に
   - L4 validator として実装 or 既存 doc-freshness-checker を拡張

## 関連

- **ISSUE-008 Phase B-2（v0.50.0）**: 本 issue を顕在化させた実装。`validate-metadata` CLI に `.md` 分岐追加
- **ISSUE-008 Phase B-3（未実施）**: pre-commit 接続。本 issue の P2-2（CLI エラーメッセージ）は pre-commit 経路でも恩恵あり
- **ISSUE-010**: 既存 103 件の注釈欠落。本 issue とは別軸（content gap vs UX/parser gap）
- `markdown-story-annotation-parser.ts` — 主修正対象
- `validate-metadata-command-handler.ts` — UX 改善対象
- `markdown-design-document-gateway.ts:77-89` — silently skip ロジック

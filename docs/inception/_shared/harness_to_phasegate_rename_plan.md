# harness → phasegate リネーム計画

## 背景

プロジェクト名は「phasegate」に確定しているが、歴史的経緯で「harness」という名称がディレクトリ名・ファイル名・クラス名・設定キー等に広く残存している。CLI コマンドも `phasegate:status` が正だが、package.json の npm scripts では `harness:status` を渡しており動作しない等の実害が発生している。

本計画では「harness」を「phasegate」に統一リネームする。

---

## 影響範囲サマリ

| カテゴリ | 件数 | 変更種別 |
|---------|------|---------|
| ディレクトリ名 | 17 | 構造変更（rename） |
| ファイル名 | 76 | 構造変更（rename） |
| TypeScript ソース内参照 | 1,500+ | 文字列置換 |
| Markdown ドキュメント内参照 | 3,000+ | 文字列置換 |
| 設定ファイル（package.json, phasegate.config.json, bin/） | 15 | 文字列置換 |
| .claude/ スキル・メモリ | 数件 | 文字列置換 |

---

## フェーズ分割

リネームは一度にやると壊れた状態が長く続くため、以下のフェーズに分けて段階的に実施する。各フェーズ末尾でテスト全 pass を確認し、コミットする。

### Phase 0: 事前準備（バグ修正）

**目的**: 現在動作しない npm scripts を即座に修正する（実害の解消）

| # | 対象 | 変更内容 |
|---|------|---------|
| 0-1 | `package.json` scripts | `harness:status` → `phasegate:status`, `harness:check-phase` → `phasegate:check-phase`, `harness:check-ready` → `phasegate:check-ready` |
| 0-2 | README.ja.md | `ci:generate-template --type` の有効値を `aidlc-gate \| consistency-check \| pre-commit` に修正 |

**検証**: `npm run phasegate:status`, `npm run phasegate:check-phase`, `npm run phasegate:check-ready` が正常動作すること

---

### Phase 1: コアディレクトリのリネーム

**目的**: `scripts/harness/` → `scripts/phasegate/` のトップレベルリネーム

| # | 対象 | 変更内容 |
|---|------|---------|
| 1-1 | `scripts/harness/` | `scripts/phasegate/` にリネーム |
| 1-2 | `bin/phasegate` | `MAIN_TS` パスを `scripts/phasegate/main.ts` に更新 |
| 1-3 | `package.json` | 全 `scripts/harness/` パスを `scripts/phasegate/` に置換 |
| 1-4 | `tsconfig.json` 等 | harness パス参照があれば更新 |
| 1-5 | `.claude/` 配下 | スキル定義・メモリ内のパス参照を更新 |
| 1-6 | `CLAUDE.md` | `scripts/harness/` → `scripts/phasegate/` |

**検証**: `pnpm test` 全 pass、`npx phasegate lint` 動作確認

---

### Phase 2: Unit ディレクトリのリネーム

**目的**: `harness-api/` → `phasegate-api/`, `harness-error/` → `phasegate-error/` の Unit 名変更

| # | 対象 | 変更内容 |
|---|------|---------|
| 2-1 | `scripts/phasegate/harness-api/` | `phasegate-api/` にリネーム |
| 2-2 | `scripts/phasegate/harness-error/` | `phasegate-error/` にリネーム |
| 2-3 | `__tests__/` 配下 | `unit/harness-api/` → `unit/phasegate-api/` 等 |
| 2-4 | 全 `.ts` ファイル | import パスの `harness-api/`, `harness-error/` を置換 |
| 2-5 | `@unit harness-api` コメント | `@unit phasegate-api` に置換 |
| 2-6 | `docs/inception/harness-api/` | `docs/inception/phasegate-api/` にリネーム |
| 2-7 | `docs/inception/harness-error/` | `docs/inception/phasegate-error/` にリネーム |
| 2-8 | `docs/product/construction/harness-api/` | `docs/product/construction/phasegate-api/` にリネーム |
| 2-9 | `docs/product/construction/harness-error/` | `docs/product/construction/phasegate-error/` にリネーム |

**検証**: `pnpm test` 全 pass、`npx phasegate lint` 動作確認

---

### Phase 3: クラス名・インターフェース名・変数名のリネーム

**目的**: コード内の `Harness*` 命名を `Phasegate*` に統一

| # | 対象パターン | 変更内容 |
|---|------------|---------|
| 3-1 | `HarnessConfig*` クラス群 | `PhasegateConfig*` にリネーム |
| 3-2 | `HarnessError*` クラス群 | `PhasegateError*` にリネーム |
| 3-3 | `HarnessApi*` クラス群 | `PhasegateApi*` にリネーム |
| 3-4 | `HarnessStatusSummary` 等 | `PhasegateStatusSummary` にリネーム |
| 3-5 | `harness-config-*.ts` ファイル名 | `phasegate-config-*.ts` にリネーム |
| 3-6 | `harness-error-*.ts` ファイル名 | `phasegate-error-*.ts` にリネーム |
| 3-7 | `harness-api-*.ts` ファイル名 | `phasegate-api-*.ts` にリネーム |
| 3-8 | テストファイル名 | 同上のパターンで置換 |

**検証**: `pnpm test` 全 pass、TypeScript コンパイルエラーなし

---

### Phase 4: 設定キー・文字列リテラルの統一

**目的**: 設定ファイルやエラーメッセージ内の「harness」を置換

| # | 対象 | 変更内容 |
|---|------|---------|
| 4-1 | `phasegate.config.json` | `"harnesses"` キー → 適切な名称に変更（要設計判断） |
| 4-2 | `.harness/` ディレクトリ | `.phasegate/` にリネーム |
| 4-3 | `.claude/skills/.harness-version` | `.phasegate-version` にリネーム |
| 4-4 | エラーメッセージ・ログ内の "harness" | "phasegate" に置換 |
| 4-5 | JSON Schema 内の "harness" 参照 | 更新 |

**検証**: `pnpm test` 全 pass、`npx phasegate init` で新規プロジェクト初期化が動作すること

---

### Phase 5: ドキュメントの一括更新

**目的**: Markdown ドキュメント内の「harness」参照を更新

| # | 対象 | 変更内容 |
|---|------|---------|
| 5-1 | `CLAUDE.md` | 残存する harness 参照を phasegate に |
| 5-2 | `README.md`, `README.ja.md` | パス・説明文の更新 |
| 5-3 | `docs/ADR/` | ADR 内のパス参照更新（※ADR 本文の歴史的記述は維持、パスのみ更新） |
| 5-4 | `docs/inception/` | 設計文書内のパス参照更新 |
| 5-5 | `docs/product/` | 確定設計文書内のパス参照更新 |
| 5-6 | `docs/principles/` | 原則文書内のパス参照更新（※ immutable 制約との兼ね合い要確認） |
| 5-7 | `docs/folder_management_rules.md` | パス参照更新 |

**検証**: ドキュメント内リンクの broken link チェック

---

### Phase 6: 最終検証・npm publish

| # | 内容 |
|---|------|
| 6-1 | `pnpm test` 全 pass |
| 6-2 | `npx phasegate lint` 実行、violation 件数が Phase 0 時点と同等 |
| 6-3 | 全 CLI コマンド動作確認（README記載のコマンド一覧） |
| 6-4 | `npm run phasegate:status` 等の npm scripts 動作確認 |
| 6-5 | `grep -r "harness" scripts/phasegate/ --include="*.ts"` で残存ゼロ確認 |
| 6-6 | `grep -r "harness" docs/ --include="*.md"` で意図しない残存がないこと確認 |
| 6-7 | minor version bump + npm publish |

---

## 設計判断が必要な項目

| # | 項目 | 選択肢 | 推奨 |
|---|------|--------|------|
| D-1 | `phasegate.config.json` の `"harnesses"` キー | (a) `"phasegates"` (b) `"units"` (c) そのまま | (b) `"units"` — 意味的に正確 |
| D-2 | `docs/principles/` の更新 | (a) immutable なので更新しない (b) パス参照のみ更新 | (b) パス参照のみ更新 |
| D-3 | ADR 内の歴史的記述 | (a) 全置換 (b) パスのみ更新、本文は歴史として維持 | (b) パスのみ更新 |
| D-4 | git history の扱い | (a) `git mv` で追跡可能にする (b) delete + create | (a) `git mv` |

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| import パス不整合でコンパイルエラー | 高 | 各フェーズ末尾で `pnpm test` 必須 |
| `.claude/` 内のフック・スキルが壊れる | 中 | Phase 1 で早期に対応 |
| npm publish 後に旧バージョン利用者が壊れる | 低 | minor version bump で非破壊的 |
| `docs/principles/` の immutable 制約違反 | 低 | パス参照のみ更新、原則本文は不変 |
| Phase 途中で中断した場合の半壊状態 | 高 | 各フェーズを atomic commit にする |

---

## 実施順序と見積り

| フェーズ | 依存 | 概要 |
|---------|------|------|
| Phase 0 | なし | npm scripts バグ修正 + README 修正 |
| Phase 1 | Phase 0 | `scripts/harness/` → `scripts/phasegate/` |
| Phase 2 | Phase 1 | Unit ディレクトリリネーム |
| Phase 3 | Phase 2 | クラス名・ファイル名リネーム |
| Phase 4 | Phase 3 | 設定キー・隠しディレクトリリネーム |
| Phase 5 | Phase 4 | ドキュメント一括更新 |
| Phase 6 | Phase 5 | 最終検証 + npm publish |

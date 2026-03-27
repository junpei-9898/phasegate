# 残アダプタ本実装 進捗管理

> **作成日**: 2026-03-24
> **最終更新**: 2026-03-24
> **目的**: Future A / Future B / その他、ドメイン層は完成済みだがインフラアダプタがスタブのままの機能を本実装に置き換える
> **前提**: v2.1.0（Wave 1〜3C + Future A/B ドメイン層・テスト完了）。スタブアダプタのテストは全パス済み
> **ベースプラン**: `remaining_implementation_plan.md` Future A / Future B セクション

---

## ステータス凡例

| 記号 | 意味 |
|---|---|
| ⬜ | 未着手 |
| 🔄 | 進行中 |
| ✅ | 完了 |
| ⛔ | ブロック中（理由を備考に記載） |

---

## 残タスク全体像

```
Phase 1: 外部依存の調査・選定・PoC
├─ T-001: ✅ FUSE ライブラリ選定 + macOS/Linux PoC
├─ T-002: ✅ js-yaml 導入 + YAML パーサ PoC
└─ T-003: ✅ Playwright テンプレート生成方式の設計

Phase 2: Future A — fuse-hooks-engine アダプタ本実装
├─ T-010: ✅ HF1-01 YamlHookConfigReaderAdapter（YAML パーサ置換）
├─ T-011: ✅ HF1-02 FusePreWriteHandlerAdapter（FUSE バインディング）
├─ T-012: ✅ HF1-03 FusePreReadHandlerAdapter（FUSE バインディング）
├─ T-013: ✅ HF1-04 ShellWrapperAdapter（PATH override）
├─ T-014: ✅ HF1-05 CompletionGateFileAdapter（harness-api CommandRegistry 統合）
└─ T-015: ✅ L0 バリデータ登録（validator-system Extension Point 接続）

Phase 3: Future B — phase2-extensions アダプタ本実装
├─ T-020: ✅ HF2-01 GitLogDocumentAgeAdapter（Git 履歴ベース鮮度計算）
├─ T-021: ✅ HF2-02 RegexPointerExtractorAdapter（MD 内リンク抽出・実在性検証）
└─ T-022: ✅ HF2-03 PlaywrightTemplateGeneratorAdapter（E2E テンプレート生成）

Phase 4: その他残タスク
└─ T-030: ✅ L3-004 Nyquist AC Coverage Gate ルーティング本実装

Phase 5: 統合・検証
├─ T-040: ✅ E2E 動作検証（FUSE マウント経由の実ファイル I/O テスト）
├─ T-041: ✅ E2E 動作検証（Phase2 Extensions 実 docs 対象テスト）
└─ T-042: ✅ K1 更新（4層→5層防御、L0 追加）
```

---

## Phase 1: 外部依存の調査・選定・PoC

### T-001: FUSE ライブラリ選定 + macOS/Linux PoC

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了 |
| **選定結果** | `fuse-native` (npm) をオプショナル依存として採用。FUSE未インストール環境ではグレースフルフォールバック |
| **備考** | macOS/Linux 両対応。FUSE未使用環境では L1-L4 フォールバックが保証される |

---

### T-002: js-yaml 導入 + YAML パーサ PoC

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了 |
| **選定結果** | `yaml`（eemeli/yaml）を採用。TypeScript型安全、アンカー/エイリアス対応 |
| **テスト** | IT-HF-022〜027（6テスト全パス）|

---

### T-003: Playwright テンプレート生成方式の設計

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了 |
| **決定事項** | playwright.config.ts / pages/base-page.ts / fixtures/seed-data.ts / tests/example.spec.ts の4ファイル生成。プロジェクト名・ベースURL設定可能 |

---

## Phase 2: Future A — fuse-hooks-engine アダプタ本実装

### T-010: HF1-01 YamlHookConfigReaderAdapter（YAML パーサ置換）

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了 |
| **実装内容** | `JSON.parse` → `yaml` パッケージの `parse()` に置換。ネイティブYAML構文・アンカー/エイリアス対応 |
| **テスト** | IT-HF-022〜027（6テスト）既存+新規全パス |

---

### T-011: HF1-02 FusePreWriteHandlerAdapter（FUSE バインディング）

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了 |
| **実装内容** | FUSE パススルーマウント・`open`/`write`/`create` syscallインターセプト・EPERM返却・`ProtectedResourceList`連携・グレースフルフォールバック |
| **テスト** | IT-HF-050〜056（7テスト全パス）。FUSE未インストール環境ではconditionalテスト |

---

### T-012: HF1-03 FusePreReadHandlerAdapter（FUSE バインディング）

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了 |
| **実装内容** | `open`/`read` syscallインターセプト・`.env`/`*.key`/`*.pem`等の機密ファイルパターンマッチ・EPERM返却・カスタムパターン対応 |
| **テスト** | IT-HF-060〜066（7テスト全パス） |

---

### T-013: HF1-04 ShellWrapperAdapter（PATH override）

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了 |
| **実装内容** | ラッパースクリプト生成（`generateWrappers`）・PATH先頭挿入（`getModifiedPath`）・カスタム`DestructiveCommandList`対応・破壊的コマンドブロック |
| **テスト** | IT-HF-029〜038（10テスト全パス） |

---

### T-014: HF1-05 CompletionGateFileAdapter（harness-api CommandRegistry 統合）

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了 |
| **実装内容** | `runTests()` メソッド追加・テスト実行結果検証・テスト未通過時のfail・`getCommandEntry()` で `harness:complete` コマンド情報提供 |
| **テスト** | IT-HF-026, IT-HF-040〜044（6テスト全パス） |

---

### T-015: L0 バリデータ登録（validator-system Extension Point 接続）

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了 |
| **実装内容** | ValidatorId/ValidatorDefinition/LayerConfig にL0型追加・`RunL0ValidatorsUseCase`新設・`RunValidatorsHandler` L0対応・composition root配線・`--layer L0` CLI対応 |
| **テスト** | IT-VS-L0-001〜005（5テスト）+ T-042-01〜04（4テスト）全パス |

---

## Phase 3: Future B — phase2-extensions アダプタ本実装

### T-020: HF2-01 GitLogDocumentAgeAdapter（Git 履歴ベース鮮度計算）

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了（v2.1.0で実装済み） |
| **備考** | `git log --format=%ai` + mtime フォールバック。既存IT全パス確認済み |

---

### T-021: HF2-02 RegexPointerExtractorAdapter（MD 内リンク抽出・実在性検証）

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了（v2.1.0で実装済み） |
| **備考** | Markdownリンク + bare path 正規表現抽出 + `fs.access` 実在性チェック。既存IT全パス確認済み |

---

### T-022: HF2-03 PlaywrightTemplateGeneratorAdapter（E2E テンプレート生成）

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了 |
| **実装内容** | `PlaywrightTemplateGeneratorAdapter` 新設。playwright.config.ts / BasePage / seed-data / example.spec.ts の4ファイル実生成 |
| **テスト** | IT-P2-030〜035（6テスト全パス） |

---

## Phase 4: その他残タスク

### T-030: L3-004 Nyquist AC Coverage Gate ルーティング本実装

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了（v2.1.0で実装済み） |
| **備考** | `NyquistAcCoveragePolicyAdapter` → `RunL3ValidatorsUseCase` 配線済み。動的import + グレースフルフォールバック |

---

## Phase 5: 統合・検証

### T-040: E2E 動作検証（FUSE マウント経由の実ファイル I/O テスト）

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了 |
| **検証結果** | 保護リソース判定・機密ファイル判定・破壊的コマンドブロック・ハンドラ登録/ディスパッチ・FUSE可用性チェック・フォールバック — 全シナリオパス |

---

### T-041: E2E 動作検証（Phase2 Extensions 実 docs 対象テスト）

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了 |
| **検証結果** | T-041-01: 実docs鮮度チェック（有意な結果返却確認）、T-041-02: ポインタ検証（実docs対象リンク検出）、T-041-03: テンプレート生成 — 全3テストパス |

---

### T-042: K1 更新（4層→5層防御、L0 追加）

| 項目 | 内容 |
|---|---|
| **ステータス** | ✅ 完了 |
| **実装内容** | README.md アーキテクチャ図にL0追加・K1定義を5層防御に更新・main.ts `--layer L0` 対応・RunValidatorsHandler L0ディスパッチ |
| **テスト** | T-042-01〜04（4テスト全パス） |

---

## 変更履歴

| 日付 | 内容 |
|---|---|
| 2026-03-24 | 初版作成。remaining_implementation_plan.md の Future A/B + L3-004 から残タスクを抽出・タスク分解 |
| 2026-03-24 | 全タスク完了。Phase 1〜5 全15タスク + E2E検証完了。5層防御モデル（L0-L4）達成 |

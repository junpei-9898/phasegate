# ISSUE-013: Codex CLI 対応（hooks経由での phase-gate / 保護ファイル強制）

## ステータス

- **起票日**: 2026-04-20
- **発見契機**: Claude Code hooks vs Codex hooks の機能比較分析により、Phasegate が実際に依存している hook 機能（`type: command` + stdin JSON + exit code）が Codex hooks の提供範囲で代替可能と判明
- **影響Unit**: agent-integration（presentation層にCodexアダプタ追加）, templates（`.codex/hooks.json`テンプレート追加）
- **深刻度**: P2（機能拡張。現状は Claude Code 専用だが、Codex ユーザーは phase-gate 恩恵を受けられない）
- **優先度**: P2 — Codex ユーザーの導入要望が顕在化した段階、または Phasegate を「AIエージェント非依存の品質防御ツールキット」として位置付け直すタイミング

## 問題の概要

現状の Phasegate は Claude Code hooks（`templates/.claude/settings.json`）に強結合しており、Codex CLI 環境では以下が機能しない:

- phase-gate 強制（論理設計・ドメインモデル未整備の Unit への書き込みブロック）
- 保護ファイル検出（`docs/principles/` 等への誤編集防止）
- PostToolUse での formatter / lint 自動実行
- Stop 時の完了チェック

一方で、Phasegate が **実際に依存している hook 機能は非常に限定的** であり、Codex hooks の能力範囲でほぼ再現可能である。

## 現状分析: Phasegate が使っている hook 機能

`templates/.claude/settings.json` と `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts` を精査した結果、使用しているのは以下のみ:

| hook イベント | matcher | 用途 | 実装 |
|---|---|---|---|
| `PreToolUse` | `Write\|Edit` | phase-gate / 保護ファイル違反で exit 2 ブロック | `npx phasegate hook pre-tool-use` |
| `PreToolUse` | `Bash` | 危険コマンド遮断 + **Bash経由書き込みの検出**（`BashWriteTargetExtractor`） | `.claude/scripts/deny-check.sh` |
| `PostToolUse` | `Write\|Edit` | formatter 実行 + `phasegate:lint --fast` | 複数shell script + `npx phasegate hook post-tool-use` |
| `Stop` | - | 完了チェック | `npx phasegate hook stop` |

全て **`type: command` + stdin JSON + exit code** の決定論的スクリプトフック。以下は **一切使っていない**:

- HTTP hooks
- prompt-based hooks (`type: "prompt"`)
- agent-based hooks (`type: "agent"`)
- `PermissionRequest` 介入
- async hooks
- `FileChanged` / `ConfigChange` / `InstructionsLoaded` 等の運用系イベント

## Codex hooks でのマッピング可能性

### 核心: Codex の `apply_patch` は Bash 経由

Codex は独立した `Write` / `Edit` ツールを持たず、ファイル編集を shell 上の `apply_patch` コマンドで実行する。つまり:

- Claude Code の `PreToolUse(Write|Edit)` 経路 → **Codex では `PreToolUse(Bash)` + `apply_patch` payload 解析** で代替可能
- Phasegate は既に `BashWriteTargetExtractor`（`scripts/harness/agent-integration/domain/services/bash-write-target-extractor.ts`）で `tee` / `cat >` / `sed -i` / `cp` / `mv` / `touch` 等の Bash 経由書き込み検出ロジックを持つ
- 同ロジックを `apply_patch` 構文（`*** Begin Patch` / `*** Update File:` / `*** Add File:` / `*** Delete File:`）に拡張すれば、Codex の編集操作を捕捉できる
- `presentation/pre-tool-use-hook.ts:103-111` には既に `effectiveToolName = 'Write'` への偽装ロジックが存在し、Bash 検出時に phase-gate チェック経路へ流す仕組みができている

### マッピング表

| Phasegate 要件 | Claude Code | Codex | 対応可否 |
|---|---|---|---|
| 書き込み前の phase-gate ブロック | `PreToolUse(Write\|Edit)` | `PreToolUse(Bash)` + `apply_patch` 解析 | ○ 拡張で対応 |
| Bash 危険コマンド遮断 | `PreToolUse(Bash)` | `PreToolUse(Bash)` | ○ そのまま移植 |
| 保護ファイル検出 | hook 内ロジック | hook 内ロジック | ○ プロトコル非依存 |
| PostToolUse formatter/lint | `PostToolUse(Write\|Edit)` | `PostToolUse(Bash)` | ○ matcher 差し替えのみ |
| Stop 時完了チェック | `Stop` | `Stop` | ○ そのまま移植 |
| SessionStart で設定ロード | 未使用 | 未使用 | - |

## 修正案

### 案 A: Codex 向けアダプタを `presentation` 層に追加（推奨）

**アーキテクチャ**:

```
scripts/harness/agent-integration/
├── domain/
│   └── services/
│       └── bash-write-target-extractor.ts    # apply_patch 対応を追加
├── application/
│   └── usecases/
│       ├── handle-pre-tool-use-usecase.ts    # 既存（変更なし）
│       └── handle-post-tool-use-usecase.ts   # 既存（変更なし）
└── presentation/
    ├── pre-tool-use-hook.ts                  # Claude用（既存）
    ├── post-tool-use-hook.ts                 # Claude用（既存）
    ├── codex-pre-tool-use-hook.ts            # 新規: Codex stdin JSON パース
    ├── codex-post-tool-use-hook.ts           # 新規
    └── codex-stop-hook.ts                    # 新規
```

CLI コマンドを追加:

```bash
npx phasegate hook codex-pre-tool-use
npx phasegate hook codex-post-tool-use
npx phasegate hook codex-stop
```

**利点**:
- Clean Architecture 準拠。domain / application 層は変更なし
- Claude / Codex のペイロードスキーマ差を presentation 層で吸収
- 既存 Claude ユーザーへの影響ゼロ

**欠点**:
- テンプレート・ドキュメントの二重管理

### 案 B: 共通 hook CLI で Codex ペイロードを自動判別

`npx phasegate hook pre-tool-use` が stdin JSON を見て Claude 形式 / Codex 形式を自動判別。

**利点**: テンプレート側はコマンド名を差し替える必要なし
**欠点**: 判別ロジックが presentation に寄り、スキーマ変化に脆弱

### 案 C: 最小対応（Bash 経由のみ保護）

`apply_patch` 対応を見送り、Codex の生 Bash コマンドだけ守る。

**利点**: 実装最速
**欠点**: Codex の主要編集経路（`apply_patch`）が phase-gate をスルーするため実用性が低い

**推奨**: **案 A**。Clean Architecture を守りつつ、既存ユーザーへの後方互換を維持できる。

## 受け入れ基準

### Wave 1: Bash 抽出器の `apply_patch` 対応

- [ ] `BashWriteTargetExtractor` が `apply_patch` ヒアドキュメント構文から `*** Update File: <path>` / `*** Add File: <path>` / `*** Delete File: <path>` を抽出できる
- [ ] 既存の tee/sed/cp/mv/touch 抽出ロジックとの統合テスト追加
- [ ] Unit test: `apply_patch` 単体、複合コマンド（`&&` 区切り）、quote 内 `apply_patch` の各ケース

### Wave 2: Codex 向け presentation アダプタ

- [ ] `codex-pre-tool-use-hook.ts` / `codex-post-tool-use-hook.ts` / `codex-stop-hook.ts` を追加
- [ ] Codex の stdin JSON スキーマ（`session_id` / `event_type` / `tool_name` / `tool_input` 等）をパース
- [ ] CLI コマンド `phasegate hook codex-pre-tool-use` 等を `harness-api` 経由で登録
- [ ] 既存の `HandlePreToolUseUseCase` / `HandlePostToolUseUseCase` を再利用（domain/application 非変更）
- [ ] Integration test: 模擬 Codex ペイロード投入で phase-gate ブロック / 保護ファイル検出が動作

### Wave 3: テンプレートとドキュメント

- [ ] `templates/.codex/hooks.json` を追加
- [ ] `bin/harness` または init コマンドに `--agent codex` オプション追加（`.codex/hooks.json` を配置）
- [ ] `docs/guide/codex-integration.md` を新規作成: 有効化手順、`config.toml` への `codex_hooks = true` 追記、既知の制約
- [ ] README / README.ja.md に Codex 対応の告知を追加

## 非対象（スコープ外）

- **Codex の `unified_exec` 完全対応**: Codex docs が「interception incomplete」と明言。現時点では `PreToolUse(Bash)` の補足漏れ分は受け入れる（phase-gate の副次的なすり抜けリスクとして docs に明記）
- **Windows 対応**: Codex hooks 自体が Windows で無効。Phasegate も unix 前提のため現状維持
- **`PermissionRequest` 相当の介入**: Codex 側に独立イベントが存在しない。Phasegate も元々使っていないため対象外
- **HTTP hooks / prompt hooks / agent hooks 機構**: Phasegate は `type: command` のみで完結しており、Claude 固有高機能は引き続き使わない
- **async hooks**: 現行 Phasegate は同期 exit code 応答で完結

## 既知のリスク

| リスク | 内容 | 緩和策 |
|---|---|---|
| `unified_exec` 補足漏れ | Codex docs が interception 不完全と明言 | `PreToolUse(Bash)` でカバーできる範囲を docs に明示。将来 Codex 側が拡張された時点で追従 |
| `apply_patch` 構文の非公式性 | OpenAI 側で構文変更があり得る | パーサーを独立テスト + CHANGELOG で追従 |
| Codex hooks が experimental | 破壊的変更の可能性 | バージョン固定 + CI で Codex CLI バージョン明示 |
| 並列 hook 発火仕様 | Codex は複数 hook を並走させ互いをブロックできない | Phasegate は 1 イベント 1 hook 構成で運用（問題なし） |
| `permissionDecision: allow/ask` 未実装 | Codex hooks は parse するが無視 | Phasegate は `block(exit 2)` / `allow(exit 0)` のみ使用（問題なし） |

## 関連

- `templates/.claude/settings.json` — 既存 Claude Code hook テンプレート
- `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts:103-111` — Bash 書き込み検出による `effectiveToolName = 'Write'` 偽装ロジック
- `scripts/harness/agent-integration/domain/services/bash-write-target-extractor.ts` — 既存の Bash 書き込み先抽出器（`apply_patch` 対応の拡張対象）
- `scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts` — 再利用対象の UseCase
- ISSUE-012 — 他言語対応（pre-commit 拡張子設定化）。Codex 対応とは独立だが「AI エージェント非依存化」という文脈で関連

## 推奨実装順

1. **Wave 1** (1-2 日): `BashWriteTargetExtractor` に `apply_patch` 対応を追加。純粋関数のため TDD で進めやすい
2. **Wave 2** (2-3 日): Codex 向け presentation アダプタを追加。既存 UseCase 再利用で domain/application は不変
3. **Wave 3** (1 日): テンプレート + init コマンド + ドキュメント

各 Wave は独立 PR 化可能。Wave 1 単独でも「Claude 環境での `apply_patch` 風 heredoc 検出強化」として価値あり。

## PoC ステップ（着手前の確認事項）

1. `codex_hooks = true` を有効化した Codex CLI 環境で `PreToolUse(Bash)` の stdin JSON 実スキーマを採取
2. `apply_patch` 実行時の Bash コマンド文字列形式（heredoc 構造）を確認
3. 上記 2 点を Wave 1 の実装仕様として固定

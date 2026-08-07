---
id: WI-013
type: issue
severity: normal
status: tested
legacy_id: ISSUE-013
affects: [agent-integration（templates 追加）, harness-api（docs）]
---

# ISSUE-013: Codex CLI 対応（Claude Code と同等の Phasegate 利用体験）

## ステータス

- **状態**: ✅ **CLOSED**（v0.62.0 で完了 / 2026-04-21 npm publish 済み）
- **起票日**: 2026-04-20
- **更新日**: 2026-04-21（Wave 1〜3 すべて完了、v0.62.0 リリース）
- **発見契機**: Claude Code hooks vs Codex hooks の機能比較分析
- **影響Unit**: agent-integration（templates 追加）, harness-api（docs）
- **深刻度**: P2（機能拡張）
- **優先度**: P2 — Codex ユーザーで Phasegate を使いたい層に対応

## 目的

**Claude Code だけでなく Codex CLI 環境でも Phasegate の防御機構（phase-gate / 保護ファイル / 完了チェック）を利用できるようにする**。

Claude Code と同等の体験を最大限提供する。ただし Codex 側の hook 仕様に明確な制約があり、一部は代替層でカバーする。

## 前提調査の結果（当初仮説の訂正）

### 当初仮説

「Codex は `apply_patch` を shell 上で実行するため、`PreToolUse(Bash)` で捕捉可能」

### 実際の Codex 実装

[openai/codex Issue #16732](https://github.com/openai/codex/issues/16732) および [Codex 公式 hooks ドキュメント](https://developers.openai.com/codex/hooks) の精査により判明:

- Codex の `PreToolUse` / `PostToolUse` hook は **`Bash` ツールにのみ発火する**
  > "Currently `PreToolUse` only supports Bash tool interception."
  > "this doesn't intercept MCP, Write, WebSearch, or other non-shell tool calls"
- Codex のネイティブ `apply_patch` ツールは `ApplyPatchHandler`（Rust 内部コード）が直接ファイルを書き換える経路で、**hook system 自体が介在しない**
- Codex のモデルは通常ネイティブ `apply_patch` 経路を使用するため、hook による pre-edit hard block は apply_patch に対して原理的に不可能

### 一方で Claude 既存アダプタは agent-agnostic

精査の結果、Phasegate の既存 hook アダプタ（`pre-tool-use-hook.ts` / `post-tool-use-hook.ts` / `stop-hook.ts`）は stdin JSON のフィールド名 `tool_name` / `tool_input.command` / `session_id` を読むのみで、Claude 固有ロジックを持たない。

Codex の hook stdin JSON も同一フィールド名・同一構造を採用しているため、**既存アダプタは Codex ペイロードを処理可能**。

## 訂正後の戦略: 多層防御の重心を再配分

Claude 環境では L0 hook を主防御とするが、Codex 環境では hook の到達範囲が限定的なため、**L0b（Bash hook）+ L2（pre-commit）+ L1（Biome）の複合で同等体験に近づける**。

### 防御層の対応表

| 関心事 | Claude | Codex 対応 | 強制度 | 気づきタイミング |
|---|---|---|---|---|
| 保護ファイル違反（Write/Edit） | `PreToolUse(Write\|Edit)` hard block | `PreToolUse(Bash)` hook + L2 pre-commit | 強（Bash経路のみ）/ 強（commit時） | 即時 / commit 時 |
| phase-gate 違反（Write/Edit） | `PreToolUse(Write\|Edit)` hard block | `PreToolUse(Bash)` hook + L2 pre-commit | 強 / 強 | 即時 / commit 時 |
| Bash 経由の書き込み | `PreToolUse(Bash)` hard block | `PreToolUse(Bash)` hard block（同等） | 強 | 即時 |
| apply_patch 経由の書き込み | `PreToolUse(Write\|Edit)` hard block | L2 pre-commit のみ（hook 非経由） | 強（commit時のみ） | commit 時 |
| Stop 時完了チェック | `Stop` hook | `Stop` hook（同等） | 強 | ターン終了時 |
| PostToolUse formatter | `PostToolUse(Write\|Edit)` | `PostToolUse(Bash)` hook（限定） | 弱 | Bash 実行後 |

### Codex 固有の制約（既知の gap）

- **apply_patch の pre-edit hard block は不可**: Codex のネイティブ apply_patch は hook を経由しない。L2 pre-commit での事後ブロックでカバーする
- **「気づくのが遅れる」問題**: commit 時までブロックが遅延する。軽減策として `docs/guide/codex-integration.md` で「編集後すぐ `git add . && git commit -m "wip"` を回す」運用を推奨
- 上流 fix（openai/codex#16732）が解決したら、ネイティブ apply_patch も hook 経由になり、この gap が解消される可能性あり

## 修正範囲（実装）

### Wave 1（v0.57.0 で完了済み）

- `BashWriteTargetExtractor` に `apply_patch` ヒアドキュメント構文対応を追加
- Bash 経由で `apply_patch <<'PATCH' ... *** Update/Add/Delete File: <path> ... PATCH` を実行するケースで phase-gate 発動
- ネイティブ apply_patch はスルーだが、Bash 経由 apply_patch は検出可能

### Wave 2（本 issue のメインスコープ）

前提調査の結果、当初予定の「Codex 向け presentation アダプタ新規作成」は**不要**と判明。既存アダプタを流用。

実装項目:

1. **`templates/.codex/hooks.json`** 新規作成
   - `PreToolUse(Bash)` → `npx phasegate hook pre-tool-use`
   - `PostToolUse(Bash)` → `npx phasegate hook post-tool-use`
   - `Stop` → `npx phasegate hook stop`

2. **Integration test** 新規追加
   - Codex の実 stdin JSON スキーマ（`session_id` / `hook_event_name` / `cwd` / `tool_name: "Bash"` / `tool_input.command` / `transcript_path` / `model` / `turn_id` / `tool_use_id`）を模擬
   - `phasegate hook pre-tool-use` CLI に投入して phase-gate / 保護ファイル検出が動作することを確認
   - apply_patch heredoc を含む Bash コマンドでのブロック動作

3. **`docs/guide/codex-integration.md`** 新規作成
   - 導入手順: `config.toml` に `[features] codex_hooks = true` を追記 + `.codex/hooks.json` を配置
   - 防御層の対応表（上記の表を転記）
   - 既知の制約: ネイティブ apply_patch は hook 非経由、L2 pre-commit でカバー
   - 推奨運用: commit をこまめに（gap 緩和）

### Wave 3（将来拡張、本 issue では non-goal）

以下は本 issue のスコープ外とし、必要に応じて別 issue で扱う:

- `SessionStart` / `UserPromptSubmit` hook での動的 phase-gate 状態注入（L-1 soft enforcement）
- ファイル監視 daemon（L0b 即時検知）による「編集後すぐ次ターンで指摘」機構
- `bin/harness` の `--agent codex` オプション（init setup 補助）
- Codex 上流への PR（apply_patch が hook を emit するよう修正）

## 受け入れ基準

- [x] Wave 1: `BashWriteTargetExtractor` が `apply_patch` ヒアドキュメント構文から Update/Add/Delete File を抽出（v0.57.0）
- [x] Wave 2-A: `templates/.codex/hooks.json` を作成し、既存 CLI コマンドに hook を配線（v0.58.0）
- [x] Wave 2-B: Codex 模擬 stdin JSON で既存アダプタが動作することを integration test で確認（v0.58.0）
- [x] Wave 2-C: `docs/guide/codex-integration.md` を作成、制約と運用を明記（v0.58.0）
- [x] Wave 3 A-1: 実機ドッグフーディングで PreToolUse / SessionStart の動作確認（v0.59.0）
- [x] Wave 3 A-2: README.md に Codex 対応を告知（v0.59.0）
- [x] Wave 3 B-3: `npx phasegate init --agent <claude|codex|both>` の実装（v0.59.0）
- [x] Wave 3 C-4: SessionStart hook による静的ルール注入（L-1 soft enforcement、v0.60.0）
- [x] Wave 3 C-5: UserPromptSubmit hook による動的状態注入（v0.61.0）
- [x] Wave 3 C-6 軽量版: UserPromptSubmit に `git diff` ベースの violation detection を追加（daemon 不採用、v0.62.0）
- [x] Wave 3 D-7: 上流 fix ([openai/codex#18391](https://github.com/openai/codex/pull/18391)) が既存 approval 済みのため別途 PR 送付は不要と判断、merge 後の追従計画を本 issue に記録
- [x] WI-384: native `apply_patch` の PreToolUse / PostToolUse、doctor、trust notice、公開 coverage を v0.336.0 で実装
- [x] 既存 Claude ユーザーへの影響ゼロ（テンプレート追加のみ、既存コード非変更）

## 非対象（スコープ外）

- **ネイティブ apply_patch の pre-edit hard block**: Codex 実装上不可能。docs で制約として明示
- **SessionStart / UserPromptSubmit による動的 context 注入**: Wave 3 に繰り延べ
- **Windows 対応**: Codex hooks 自体が Windows 非対応
- **`unified_exec` 完全対応**: Codex 側が "interception incomplete" と明言
- **HTTP hooks / prompt hooks / agent hooks**: Phasegate は `type: command` のみで完結

## 既知のリスク

| リスク | 内容 | 緩和策 |
|---|---|---|
| ネイティブ apply_patch hook 非経由 | 編集前ブロックができず L2 pre-commit まで遅延 | docs で運用推奨（こまめな commit）。上流 fix (#16732) 待ち |
| Codex hooks が experimental | 破壊的変更の可能性 | CHANGELOG で追従、テンプレートをバージョン固定 |
| stdin JSON スキーマ変更 | Codex 側のフィールド名変更リスク | 既存アダプタは tool_name/tool_input.command のみ参照、最小結合 |
| `permissionDecision: allow/ask` 未サポート | Codex hooks が parse するが無視 | Phasegate は `exit 2` / `exit 0` のみ使用（元から不依存） |
| 並列 hook 発火仕様 | Codex は複数 hook を並走させ互いをブロック不可 | Phasegate は 1 イベント 1 hook 構成で問題なし |

## 関連

- [Codex 公式 hooks ドキュメント](https://developers.openai.com/codex/hooks)
- [openai/codex Issue #16732: ApplyPatchHandler doesn't emit PreToolUse/PostToolUse hook event](https://github.com/openai/codex/issues/16732)
- [openai/codex PR #18391](https://github.com/openai/codex/pull/18391) — 上流 fix の PR (2026-04-21 時点: open, 1 approval, no blockers)
- `templates/.claude/settings.json` — Claude 向け hook テンプレート（比較対象）
- `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts` — 既存 agent-agnostic アダプタ
- `scripts/harness/agent-integration/domain/services/bash-write-target-extractor.ts` — Wave 1 で apply_patch 対応追加済み
- ISSUE-012 — pre-commit の言語拡張子設定化。Codex 対応とは独立だが「多言語・多エージェント対応」の文脈で関連

## 実装履歴

| Wave | 版 | 内容 |
|---|---|---|
| Wave 1 | v0.57.0 | `BashWriteTargetExtractor` に `apply_patch` heredoc 対応 |
| Wave 2 | v0.58.0 | `templates/.codex/hooks.json` + `docs/guide/codex-integration.md` + integration test |
| Wave 3 A-1/A-2 | v0.59.0 | 実機ドッグフーディング + README 告知 + `init --agent codex/both` |
| Wave 3 C-4 | v0.60.0 | SessionStart hook で静的ルール注入 (L-1 soft enforcement) |
| Wave 3 C-5 | v0.61.0 | UserPromptSubmit hook で動的状態注入 |
| Wave 3 C-6 軽量版 | v0.62.0 | UserPromptSubmit に violation detection を追加 (daemon 不採用) |
| Wave 3 D-7 | - | 上流 PR は [openai/codex#18391](https://github.com/openai/codex/pull/18391) が既存・approval 済みのため送付不要。merge 待ち |
| WI-384 follow-up | v0.336.0 | native `apply_patch` Update/Add/Delete の編集前 hard block、PostToolUse lint、stale matcher doctor、definition hash 再 trust notice |

## 上流 fix 後の追従

[openai/codex#18391](https://github.com/openai/codex/pull/18391) が merge されると、Codex ネイティブ `apply_patch` が `PreToolUse`/`PostToolUse` hook を発火するようになる。発火時には `tool_name: "apply_patch"` がセットされる想定。

Phasegate 側の対応:

1. **テンプレート拡張** — `templates/.codex/hooks.json` の `PreToolUse` matcher を `"Bash|apply_patch"` に変更
2. **既存アダプタ動作確認** — `pre-tool-use-hook.ts` は `tool_input.command` を見ているが、apply_patch 経路では `tool_input` の構造が異なる可能性があるため、実 payload を採取してパーサ調整
3. **docs 更新** — 既知制約セクションから「ネイティブ apply_patch が hook 非経由」を削除

これらは PR merge 後の実 payload を見てから着手する（現時点では推測ベースで実装しない）。

### 2026-08-08 follow-up

<!-- @work-item-id WI-384 -->

PR #18391 は 2026-04-22 に merge され、rust-v0.124.0（2026-04-23）でリリース済みである。
同版で hooks は stable / default-on となり、native payload は canonical
`tool_name: "apply_patch"` と raw patch の `tool_input.command` を持つことが確認された。

追従実装は [WI-384](../WI-384/description.md) で完了した。v0.336.0 で matcher を
`Bash|apply_patch` へ更新し、raw patch parser、CREATE / MODIFY / DELETE forwarding、doctor、
minimum version / trust notice、英日 coverage matrix を同時にリリースした。L2 pre-commit と CI は
hook trust 状態に依存しない backstop / authoritative re-check として維持する。これをもって
WI-013 の「上流 fix 後の追従」を決着とする。

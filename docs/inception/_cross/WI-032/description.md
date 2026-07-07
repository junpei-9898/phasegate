---
id: WI-032
type: story
severity: normal
status: tested
affects: [ci-governance]
---

# WI-032: AGENTS.md / CLAUDE.md auto-refresh パイプライン

> 起票日: 2026-04-25
> 親 audit: WI-030

## 背景

phasegate には `ci:migrate-agents-md` という one-shot CLI が存在し、`lesson-collector` が収集した artifact を AGENTS.md に pointer 形式で追記する。しかし:

1. **CLI を起動するスケジュール機構が無い**（cron や hook と紐付けされていない）
2. **CLAUDE.md は完全に手動メンテ**で、phasegate 側に何の自動化も無い
3. `lesson-collector` 自体は実装済だが定期収集する仕組みが無い
4. 結果として、user は AGENTS.md / CLAUDE.md を最新状態に保つために自前で CI ジョブを書く必要がある

WI-026〜WI-029 の運用で、PhaseGate 自身の AGENTS.md / CLAUDE.md ですら直近の WI 群（migrate work-items, story-reflection adapter 拡張, ...）を反映できていなかったことが顕在化した。

## 本 WI でやること

### Phase 1: AGENTS.md auto-refresh ループ

1. `ci:auto-refresh-agent-context` 新コマンドを追加（`ci-governance` unit）
   - lesson artifact 収集 → 集約 → AGENTS.md pointer 追記 を 1 コマンドで実行
   - `--dry-run` / `--apply` / `--json` modes
2. CI workflow template `.github/workflows/agent-context-refresh.yml` を bundled template に追加
   - 週次 cron (例: 火曜 04:00 UTC)
   - 検出した変更を PR で push する（または直接 commit）
3. `phasegate init --with-ci` でこの workflow も配置（WI-031 と連動）

### Phase 2: CLAUDE.md template-driven 再生成

1. `templates/CLAUDE.md.template.md` を導入し、phasegate 提供の標準セクション（**ハーネスコマンド** / **必読ドキュメント** / **バージョニングルール** 等）を定義
2. `npx phasegate refresh-claude-md` コマンドで以下を行う:
   - 標準セクションを最新版に更新
   - user 固有セクション（`<!-- user-section -->` 等のマーカーで囲まれた領域）は保持
   - skill 一覧、preset 一覧、CLI コマンド一覧を最新の実装から自動生成して挿入
3. `update-skills` の延長として呼び出せるようにする（オプトイン）

### Phase 3: scheduled drift detection

1. L4 に `agent-context-freshness` validator を追加（または phase2-extensions に `p2:check-agent-context`）
2. AGENTS.md / CLAUDE.md の最終更新日時が threshold を超えたら drift 警告
3. consistency-check.yml の cron で同時に走らせる

## 受け入れ基準

- [x] `npx phasegate ci:auto-refresh-agent-context --dry-run` で AGENTS.md / CLAUDE.md の差分プレビューが出る
- [x] `--apply` でファイル更新が反映される
- [x] CI workflow template が用意され、`--with-ci` でデプロイできる
- [x] CLAUDE.md template-driven 再生成で user 固有セクションが破壊されない（marker 区切りロジックが test される）
- [x] L4 / p2 で agent-context drift が検出可能
- [x] phasegate 自身の CI でも本機能が稼働し、AGENTS.md / CLAUDE.md が常に最新を保つ

## 完了メモ

- `ci:auto-refresh-agent-context --dry-run|--apply|--json` を追加。
- `refresh-claude-md --dry-run|--apply|--json` を追加。
- `p2:check-agent-context --threshold-days <n> --json` を追加。
- `docs/templates/ci/agent-context-refresh.yml` と `.github/workflows/agent-context-refresh.yml` を追加。
- `phasegate init --with-ci` は `agent-context-refresh.yml` も配置する。
- CLAUDE.md は marker 内 user section を保持し、marker が無い既存ファイルは全文を user section として保持する。

## 設計上の検討事項

- **CLAUDE.md は project-specific な内容も多い**ため、phasegate が上書きできるのは「標準セクション」に限る。境界設計を厳密に。
- **AI agent への影響**: AGENTS.md / CLAUDE.md は agent runtime に load されるため、frequent な変更は agent 側のキャッシュ動作と競合しないよう注意（特に Claude Code の memory 機構）
- **配布物に user secret が混入しないか**監査: lesson artifact が外部依存名を含むケース等

## スコープ外

- agent runtime memory 機構の改修（Claude Code 側の責務）
- AGENTS.md / CLAUDE.md 以外の agent context ファイル（Claude project memory, Codex `.codex/AGENTS.md` 等）の同時管理 — 別 WI で検討

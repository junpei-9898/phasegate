---
id: WI-176
type: story
severity: normal
status: tested
affects: [setup, installation, agent-integration, skill-quality, documentation]
source: internal
---

# WI-176: Claude Code Dogfood Readiness and Agent Experience Improvements

> 起票日: 2026-05-13
> 起票経緯: `phasegate@0.153.1` publish 後の WI-175 dogfood で、`setup:agent` / `config:plan` / managed setup / validation の local readiness は大きく改善した。一方で、Claude Code 固有の実操作体験までは深掘りしておらず、Claude Code が fresh project で迷わず WI 作成、計画、実装、検証、commit 前確認まで進められるかを追加検証する必要がある。

## 背景

WI-171〜WI-175 により、PhaseGate は以下を提供できるようになった。

- `setup:agent --agent both` / `--intent strict` による Claude / Codex 両対応の managed setup
- `.claude/settings.json`, `CLAUDE.md`, `.claude/skills -> ../skills` の生成
- `.codex/hooks.json`, `AGENTS.md`, `.codex/skills -> ../skills` の生成
- Husky hooks, CI workflow, package scripts, `phasegate.config.json` の strict setup
- `setup:agent` completeness summary と `config:plan` patch preview
- local readiness と external manual action の分離
- permission error 時の structured error と non-zero exit

`0.153.1` dogfood では CLI と managed file の整合、再実行 no-diff、doctor / check-ready / L2 validate、uninstall safety を確認した。ただし、Claude Code 自体を主役にした end-to-end 体験は未検証である。

## 問題

### 1. Claude Code 固有の操作導線を検証できていない

CLI と file generation は通っているが、Claude Code が `CLAUDE.md` と `.claude/settings.json` を読み、PhaseGate の意図通りに WI 起票、計画、product reflection、実装、検証へ進めるかは registry 版 dogfood でまだ確認していない。

### 2. Claude 向け readiness が Codex 向け readiness と同じ粒度で十分か不明

`setup:agent` completeness は local managed targets と external actions を分けるが、Claude Code から見た場合に「Claude 側は完了」「Codex 側は manual」「CI は外部確認」のような agent 別 readiness が必要かは未判断である。

### 3. Claude Code での失敗時 recovery が自然か不明

permission error や hook / skill setup の失敗は structured error になったが、Claude Code が次に実行すべき command、ユーザーへ依頼すべき外部操作、再試行条件を迷わず説明できるかは検証が必要である。

### 4. documentation と managed context の役割分担に余地がある

`CLAUDE.md` に載せるべき内容、公開 guide に載せるべき内容、skills に委譲すべき内容の境界が、Claude Code 実体験で最適化されているか確認したい。

## スコープ

### Phase 1: Claude Code registry dogfood

- fresh temp project に registry 版 PhaseGate を導入する。
- `setup:agent --agent claude` と `setup:agent --agent both` の両方を dry-run / apply / re-run で確認する。
- `.claude/settings.json`, `CLAUDE.md`, `.claude/skills`, package scripts, config, hooks, CI の生成結果を確認する。
- `doctor`, `phasegate:check-ready`, `validate --layer L2` を実行し、Claude 向け setup 完了の説明が十分か確認する。

### Phase 2: Claude Code agent workflow dogfood

- Claude Code が managed `CLAUDE.md` を手がかりに、新規 WI 起票、計画、product reflection、実装前検証まで進めるかを確認する。
- 不足する command guidance、manual action、permission recovery、document routing を記録する。
- Codex ではなく Claude Code から見た「次に何をすべきか」の明瞭さを評価する。

### Phase 3: Readiness reporting improvements

- `setup:agent` completeness に Claude / Codex 別の readiness 表示が必要か判断する。
- 必要であれば agent-specific readiness を JSON / human output に追加する。
- local managed readiness と external user-level / hosted-service readiness の表示を、Claude Code から説明しやすい形に改善する。

### Phase 4: Documentation and managed context improvements

- `CLAUDE.md` managed section の文言を、Claude Code の実操作に合わせて調整する。
- `docs/guide/getting-started.md`, `docs/guide/recipes.md`, `docs/guide/troubleshooting.md` に Claude Code setup / dogfood / recovery の説明を追加または改善する。
- `phasegate-toolkit-guide` / `phasegate-config-doctor` が Claude Code で参照すべき setup commands を明確にする。

## 受け入れ基準

- [ ] registry 版 PhaseGate を fresh project に導入し、`setup:agent --agent claude --intent strict --with-ci --with-husky --apply` が Claude managed targets を作成できる。
- [ ] `setup:agent --agent both --intent strict --with-ci --with-husky --apply` 後の再 dry-run が、Claude / Codex / shared setup の no-diff または明示的な manual action を返す。
- [ ] `CLAUDE.md` と `.claude/settings.json` を起点に、Claude Code が WI 起票、計画、product reflection、検証準備まで迷わず進めることを dogfood で確認する。
- [ ] Claude Code で permission error または external manual action が発生した場合、CLI output / docs / managed context から次の action を説明できる。
- [ ] 必要に応じて `setup:agent` completeness が Claude / Codex 別 readiness を表現する。
- [ ] `doctor --json`, `phasegate:check-ready`, `validate --layer L2 --format human` が Claude setup 後に期待どおり通る。
- [ ] uninstall / force uninstall が Claude managed targets と user-owned `CLAUDE.md` content を安全に扱うことを確認する。
- [ ] README または guide / skills / managed context に、Claude Code setup と dogfood 結果から得た改善を反映する。

## 非スコープ

- Claude Code 本体設定の自動変更
- Claude Code の外部 API / GUI 操作の自動化
- GitHub Actions 実行結果の remote API 取得
- Codex 専用 hook 機能の挙動変更
- `config:plan --apply` の実装

## 関連 WI

- WI-171: first-time user onboarding
- WI-172: agent-driven setup orchestrator
- WI-173: agent configuration change workflow
- WI-174: agent context files as managed setup targets
- WI-175: agent setup completeness and confidence improvements

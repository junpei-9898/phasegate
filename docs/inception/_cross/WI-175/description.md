---
id: WI-175
type: story
severity: high
status: tested
affects: [installation, documentation]
source: internal
---

# WI-175: Agent Setup Completeness and Confidence Improvements

> 起票日: 2026-05-13
> 起票経緯: `phasegate@0.152.9` publish 後の dogfood で、`setup:agent` / `config:plan` / managed `AGENTS.md` / `CLAUDE.md` は主要導入経路として有効だった一方、「全機能を漏れなく設定できた」とユーザーが実感するには、defaults の揺れ、外部設定の未完了、config plan の抽象度、権限エラー時の案内に改善余地があることを確認した。

## 背景

WI-171〜WI-174 により、初回導線、`setup:agent`、`config:plan`、agent context managed section は実装済みになった。dogfood では registry 版 `phasegate@0.152.9` を一時プロジェクトに導入し、以下を確認した。

- `setup:agent --intent strict --with-ci --with-husky --apply --json` は config / Claude / Codex / Husky / CI / skills / package scripts を一括生成できる。
- `AGENTS.md` / `CLAUDE.md` は managed section と user-owned content を同居できる。
- 同じ `setup:agent strict` の再適用は冪等である。
- `uninstall --apply` は managed section のみを削除し、user-owned content を保持できる。
- `doctor`, `phasegate:check-ready`, `validate --layer L2` は green になる。

一方で、初回ユーザーが「自分のプロジェクトに必要な PhaseGate 機能が漏れなく設定された」と判断するには、まだ判断材料と検証範囲が不足している。

## 問題

### 1. setup planner の説明が「何を」中心で、「なぜ十分か」が弱い

`setup:agent` は変更対象を列挙できるが、選択された intent がどの機能領域を満たし、どの領域を意図的に manual / external として残すのかを明確にしない。結果として、ユーザーは plan を読んでも「これで全部なのか」を判断しづらい。

### 2. `setup:agent` と direct `install` の defaults が揺れる

dogfood では `setup:agent --intent strict` 再適用は冪等だったが、`install --dry-run --agent both` では `AGENTS.md` に微小差分が出た。入口コマンド間で rendering defaults が完全に揃っていないと、設定済みプロジェクトの「drift なし」感が弱くなる。

### 3. `config:plan` が具体的な config diff preview まで出さない

`config:plan` は targets / commands / validations / risks を返すが、`phasegate.config.json` のどの値をどう変更するかが抽象的である。設定変更 workflow としては、dry-run の段階で proposed patch / before-after / non-applicable reason を出したい。

### 4. `doctor` green が外部未完了を十分に説明しない

`doctor` green はローカル managed targets の整合を示すが、Codex user-level feature enablement、GitHub Actions 上での workflow 実行可否、npm / package manager 環境などの外部状態までは保証しない。green の意味と残る manual action を分けて表示する必要がある。

### 5. agent 実行環境での権限エラー案内が弱い

dogfood では sandbox 内で `.codex` 作成が `EPERM` になり、権限付き再実行で成功した。CLI 自体は Node の fatal error を返したが、agent / sandbox 環境での recovery action としては、どの target で、なぜ失敗し、dry-run / permission / rerun のどれを選ぶべきかを案内できる方がよい。

## スコープ

### Phase 1: Completeness model

- `setup:agent` の plan に機能領域別 completeness を追加する。
- 対象領域は `local-config`, `agent-hooks`, `agent-context`, `skills`, `git-hooks`, `ci`, `l2-validation`, `l4-drift`, `external-actions` とする。
- 各領域を `configured`, `planned`, `manual`, `not-applicable`, `unknown` に分類する。
- intent ごとに「strict なら何が complete であるべきか」を定義する。

### Phase 2: Default alignment

- `setup:agent`, `install`, `reconcile` の agent context rendering defaults を統一する。
- 同一 target / 同一 option で生成された managed section が入口コマンドによって drift しないようにする。
- direct `install` と orchestrated `setup:agent` の違いが必要な場合は、plan に explicit reason を出す。

### Phase 3: Actionable config plan

- `config:plan` に proposed config patch を追加する。
- JSON 出力には `before`, `after`, `patch`, `applicability`, `blockedReason` を含める。
- human 出力では、実際に編集される path / JSON pointer / value を読める形で出す。
- read-only の性質は維持し、apply は別 WI または明示 command に分離する。

### Phase 4: External readiness diagnostics

- `doctor` または `setup:agent` completion summary に local readiness と external readiness を分けて表示する。
- Codex hooks feature enablement、CI workflow execution、GitHub Actions availability、npm package version consistency など、ローカルだけでは確定できない項目を `manual-check` として明示する。
- `doctor` green の意味を「local managed setup green」として説明し、manual-check の未完了と混同しない。

### Phase 5: Permission-aware failure guidance

- install / setup apply 中の filesystem permission error を target-aware finding に変換する。
- `EPERM`, `EACCES`, readonly filesystem, sandbox denial を区別し、retry guidance を出す。
- partial apply が起きた場合、manifest / changed targets / rollback command を summary に含める。

## 受け入れ基準

- [ ] `setup:agent --dry-run --json` が completeness summary を返し、各 setup area の状態と残 action を説明する。
- [ ] `setup:agent --intent strict --apply --json` 後、同じ intent の再実行で全 managed targets が `already up to date` になる。
- [ ] `install --dry-run --agent both --json` と `setup:agent --intent strict --dry-run --json` の差分が、default drift ではなく explicit option / intent difference として説明される。
- [ ] `config:plan --intent l4-strict --json` が `phasegate.config.json` の proposed before/after を返す。
- [ ] `config:plan --intent codex-hooks --json` が local files と user-level external action (`codex features enable codex_hooks`) を別カテゴリで返す。
- [ ] `doctor --json` または `setup:agent` summary が local readiness と external manual-check を区別する。
- [ ] filesystem permission error が fatal stack ではなく、target, operation, likely cause, recovery command を含む structured error として返る。
- [ ] README / getting-started / troubleshooting が completeness summary と manual-check の読み方を説明する。
- [ ] dogfood scenario test が registry 相当の temp project で setup / config plan / doctor / uninstall の体験を検証する。

## 非スコープ

- `config:plan --apply` の実装
- GitHub API を使った remote workflow 実行結果の取得
- Codex / Claude 本体設定の自動変更
- L4 validator 自体の検出精度改善
- managed target strategy の全面再設計

## 関連 WI

- WI-171: first-time user onboarding
- WI-172: agent-driven setup orchestrator
- WI-173: agent configuration change workflow
- WI-174: agent context files as managed setup targets
- WI-145〜WI-148: install / uninstall / reconcile lifecycle foundation

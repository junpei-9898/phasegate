---
id: WI-143
type: story
severity: high
status: tested
affects: [traceability-model, config-foundation, harness-api, skill-quality, agent-integration, validator-system]
source: external
external_ref: https://github.com/junpei-9898/phasegate/issues/5
---

# WI-143: WI-first workflow enforcement — ad-hoc plan が WI taxonomy を silently bypass する drift を構造的に防ぐ

> 起票日: 2026-05-11
> 起票経緯: GitHub Issue #5 (`WI-first workflow enforcement: prevent ad-hoc plan files from bypassing WI taxonomy`) として外部報告。phasegate v0.143.0 を `init` で導入した実プロジェクト（5ヶ月運用中の CRM）で、ハーネス全層 green / skill 30+ / CI / husky hook 稼働状態にもかかわらず、WI 登録 0 件・ad-hoc plan 8 件が `inception/codding_plan/` 配下に蓄積していた。AI agent (Claude Code) が既存リポ慣習に従って WI 外に plan を書いたが、ハーネスは検出しなかった。

## 背景

PhaseGate は WI taxonomy (`inception/{unit}/WI-XXX/description.md`) を中心に Phase Gate / metadata validator / traceability を回す設計だが、以下 4 層に gap があり、WI を 1 件も切らないまま設計・実装が進む drift が silent に成立する:

### A. `init` defaults が permissive すぎる
- `quickMode.relaxedGates: ["phase-gate"]` が同梱 enabled
- `allowedCategories: ["bugfix", "docs", "test", "config"]` が ~80% の typical commit を覆う
- `--strict` / `--wi-first` flag が存在せず、opt-in での厳格化が不可能
- 「最初の WI を作るか？」を聞く interactive wizard が無い

### B. 計画系 skill が WI directory 存在を要求しない
- `implementation-planner` の SKILL.md が legacy の `US-XXX` 表記のまま
- `story-writer` は user story を作るが `inception/{unit}/WI-XXX/description.md` を scaffold しない
- `quick-implementor` には WI-aware trivial path (ISSUE-026 Phase D) があるが **opt-in**
- WI directory 不在で plan 生成を **refuse する skill が存在しない**

### C. 構造的 drift 検出 command が無い
- `phasegate-config-doctor` は config 値の診断のみ
- 「WI 外に何個の ad-hoc plan があるか」を答える command が無い
- 「`inception/` に plan があるのに WI 登録 0」を検出する command が無い
- `phasegate:detect-drift` は design/code drift focus で inception drift を見ない

### D. Agent preamble に WI-first ルールが無い
- `init --with-husky --with-ci` で skill は deploy するが、生成される `CLAUDE.md` / `AGENTS.md` に "plan を書く前に `inception/{unit}/WI-XXX/description.md` を作れ" が入らない
- AI agent (Claude / Codex) は既存リポ慣習 (`inception/codding_plan/`) に従い、自然と WI 外に plan を書く
- plan file 冒頭への `@work-item-id` template 注入が無い

## 本 WI でやること

### F1. `phasegate init --workflow strict` (new flag)
- `quickMode.relaxedGates: []` (phase-gate enforced)
- `quickMode.allowedCategories: ["chore"]` (それ以外は WI 必須)
- `inception/_shared/`, `inception/_cross/`, `inception/{unit}/.gitkeep` を scaffold
- Interactive: "Create your first WI now? [WI-001]" → `description.md` template 生成
- `--workflow` default は `standard` でも可だが、新規 PJ には docs で `strict` を推奨

### F2. `phasegate doctor` (new command) — **最優先**
`config-doctor` の sibling として構造的健全性を診断:
- WI 数 vs ad-hoc plan 数を集計し drift をレポート
- legacy plan (`*_plan.md` outside WI dirs) を検出し `migrate work-items --apply` を suggest
- `@work-item-id` annotation 欠落の construction docs を検出
- `relaxedGates: ["phase-gate"]` + plans-without-WIs の組み合わせを red flag
- 修復ステップを copy-paste 可能な command 付きで出力

### F3. Skill-level WI gatekeeping
- `implementation-planner` / `story-writer` / `logical-designer` の Phase 1 precondition に追加:
  ```
  ## Pre-flight check (BLOCKING)
  Before generating any plan, verify `inception/{unit}/WI-XXX/description.md` exists.
  If not, halt and ask the user to create the WI first (or offer to scaffold it).
  ```
- skill description を `US-XXX` → `WI-XXX` に統一
- `phasegate scaffold-wi <unit> <type>` CLI で WI 作成を one-liner 化

### F4. `phasegate emit-agent-rules` (new command)
`CLAUDE.md` / `AGENTS.md` に注入する block を生成:
```markdown
## PhaseGate WI Workflow (auto-generated; do not edit by hand)
- All plans/designs/implementations require a WI directory first.
- Path: `inception/{unit}/WI-XXX/description.md` with required frontmatter.
- Use `phasegate scaffold-wi` to create one.
- Plans written under `inception/codding_plan/` are legacy; new ones go in WI dirs.
```
- `phasegate update-skills` で harness version に追従して再生成

### F5. Inception-side filesystem hook (optional, opt-in)
- pre-commit で `inception/` 配下の新規ファイルが `_shared/` / `_cross/` / `{unit}/{WI-XXX}/` 以外なら warn/block
- 既存 husky pre-commit に piggyback

### F6. `migrate work-items` suggestion on `init` re-run
- `inception/` に file が既に存在するが WI が 0 件の状態で `phasegate init` を再実行した場合、"We detected N legacy plan files. Run migration? [Y/n]" を prompt

## 優先順位

1. **F2 (`doctor` CLI)** — 既存 PJ の drift を catch する最大レバレッジ
2. **F3 (skill gatekeeping)** — fix 後の AI driven regression 防止
3. **F4 (`emit-agent-rules`)** — `init` / `update-skills` 時に deploy する quick win
4. **F1 (`init --workflow strict`)** — 新規 PJ 向け
5. **F5 / F6** — polish

## 受け入れ基準

- [ ] `phasegate doctor` が WI 数 0 + ad-hoc plan ≥ 1 の状態を非ゼロ exit で検出できる
- [ ] `phasegate doctor` が `relaxedGates: ["phase-gate"]` + plans-without-WIs の組み合わせを red flag として報告する
- [ ] `phasegate doctor` の出力に copy-paste 可能な修復 command (`migrate work-items --apply` 等) が含まれる
- [ ] `implementation-planner` / `story-writer` / `logical-designer` skill が WI directory 不在で plan 生成を refuse する
- [ ] 3 skill すべての SKILL.md description / body の `US-XXX` 表記が `WI-XXX` に置換される
- [ ] `phasegate scaffold-wi <unit> <type>` で `inception/{unit}/WI-XXX/description.md` を template 付きで生成できる
- [ ] `phasegate emit-agent-rules` が `CLAUDE.md` / `AGENTS.md` に注入可能な markdown block を stdout に出力する
- [ ] `phasegate init --workflow strict` で `relaxedGates: []` / `allowedCategories: ["chore"]` の config が生成される
- [ ] `phasegate init` 再実行時、legacy plan を検出すると migration prompt が出る (F6)

## 非スコープ

- WI taxonomy 自体の再設計（WI-026 で確定済み taxonomy をベースに enforce する）
- `phasegate-config-doctor` skill (config 値診断) の本体機能変更 — `doctor` CLI はその sibling として独立追加
- 既存 ad-hoc plan の自動 migration ロジック本体（`migrate work-items` は既存; 本 WI は suggest するだけ）
- inception/ filesystem hook の defaults 有効化 (opt-in に留める)

## 関連

- WI-026: Taxonomy unification (`US-XXX` → `WI-XXX`)
- ISSUE-008: metadata validator (skill 側 WI annotation chain の前段)
- ISSUE-026 Phase D: `quick-implementor` の WI-aware trivial path
- `phasegate-config-doctor` skill: 本 WI の `doctor` CLI の sibling
- `scripts/harness/traceability-model/`: WI taxonomy core
- `scripts/harness/config-foundation/`: `init` defaults / `--workflow` flag
- `scripts/harness/harness-api/`: `doctor` / `scaffold-wi` / `emit-agent-rules` CLI 追加点
- `scripts/harness/skill-quality/`: skill description / preflight check 注入点
- `scripts/harness/agent-integration/`: `CLAUDE.md` / `AGENTS.md` rule 注入点
- GitHub Issue: https://github.com/junpei-9898/phasegate/issues/5

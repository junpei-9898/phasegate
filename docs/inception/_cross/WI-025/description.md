---
id: WI-025
type: issue
severity: normal
status: tested
legacy_id: ISSUE-025
affects: [harness-api / setup, docs]
---

# ISSUE-025: Codex 向け `phasegate init` が hooks 以外の必須セットアップを完了せず、README / skills 設計と不整合

## ステータス

- **状態**: ✅ TESTED（v0.138.0 時点の published dogfood で `init --agent codex` が `.codex/hooks.json` と `.codex/skills -> ../skills` を作成することを確認）
- **起票日**: 2026-04-24
- **完了確認日**: 2026-05-09
- **発見契機**: PhaseGate 自身の Codex ドッグフーディング時に、`npx phasegate init --agent codex` 系のセットアップ結果を確認したところ、Codex hooks は動作する一方で、Codex から project skills を見せるための配線が存在しないことが判明
- **影響Unit**: harness-api / setup, agent-integration, docs
- **深刻度**: Medium
- **優先度**: P1

## 問題の概要

現状の `phasegate init --agent codex` は、Codex 向け個別セットアップとして **`.codex/hooks.json` しか作成しない**。

その結果、README・skills ディレクトリ設計・実装の間で、Codex セットアップの期待値がずれている。

### 実際に確認できた現状

1. `scripts/harness/main.ts` の init 処理では:
   - `deploySkills(...)` は常に `.claude/skills` に展開
   - `deployCodexHooks(...)` は `.codex/hooks.json` だけを作成
2. `scripts/harness/setup/skill-deployer.ts` では:
   - `SKILLS_TARGET_DIR = ".claude/skills"`
   - Codex 用の skill 配置や symlink 作成ロジックが存在しない
3. `skills/README.md` では:
   - `.codex/skills -> ../skills` の shared skill 配線がある前提で説明している
4. 実リポジトリの dogfood 状態では:
   - `.codex/hooks.json` は存在
   - `.codex/skills` は存在しない
   - `.claude/skills` には 28 skill が存在

つまり、**Codex 用 init は hooks は作るが、skills 利用のための project-local wiring を完了していない**。

## なぜ問題か

### 1. Codex で PhaseGate の本来の操作モデルが成立しない

PhaseGate は hooks だけでなく、AIDLC の各 skill を agent から呼べることを前提にしている。

しかし Codex 向け init 後の状態では、project 配下の 28 skill が `.codex/skills` 経路で見えないため、Codex からは hooks だけ有効で、**skill ベースの運用に必要なセットアップが欠落**する。

### 2. ドキュメントと実装が矛盾している

- `skills/README.md` は `.codex/skills` が存在する前提
- 実装は `.claude/skills` のみ作成
- Codex integration docs は hooks に重点があり、skills 配線の要否が不明瞭

この状態だと、利用者は「Codex 対応済み」の意味を hooks 限定と解釈すべきか、Claude 同等の skill 利用まで含むのか判断できない。

### 3. `--agent codex` / `--agent both` の責務境界が曖昧

`--agent codex` を指定したときに、何が作成されるべきかが仕様として整理されていない。

最低でも、以下のどちらかに統一する必要がある:

- **共有 source-of-truth 方式**: `skills/` を実体として配置し、`.claude/skills` と `.codex/skills` の両方を symlink で向ける
- **個別展開方式**: `.claude/skills` と `.codex/skills` の両方へ必要 skill を明示的に配置する

現状はそのどちらでもなく、中途半端に `.claude/skills` と `.codex/hooks.json` だけが存在する。

## 本来整理されるべきセットアップ成果物

`npx phasegate init --agent codex` で、Codex 向けセットアップとして何を保証するかを仕様化する必要がある。

### 共通成果物

- `phasegate.config.json`
- `docs/principles/*.md`
- `docs/folder_management_rules.md`
- skill 実体（共有 or 配置方式は要決定）
- 必要に応じて `.husky/pre-commit`（`--with-husky` 指定時）

### Codex 固有成果物

- `.codex/hooks.json`
- **Codex から project skills を解決するための `.codex/skills` 導線**

### Claude 固有成果物

- `.claude/settings.json`
- `.claude/scripts/*`
- `.claude/skills` 導線

## 期待仕様（案）

もっとも自然なのは、`skills/README.md` の説明に合わせて **shared source-of-truth 方式** に揃えること。

### 期待ディレクトリ構成

```text
skills/                  # 実体
.claude/skills -> ../skills
.codex/skills  -> ../skills
```

この方式なら:

- skill の単一ソースを維持できる
- Claude/Codex 両方で同じ project skill を参照できる
- `update-skills` の責務も明確
- `skills/README.md` の説明と一致する

## 受け入れ基準

- [x] `--agent codex` のセットアップ成果物を README / docs / 実装で一貫して定義する
- [x] Codex でも project-local PhaseGate skills を解決できるようにする
- [x] `.codex/skills` の作成方式を決定し、実装する（`../skills` への symlink）
- [x] `--agent both` で Claude / Codex の両方が同じ skill 実体を参照できる
- [x] `skills/README.md` の説明と実際の `init` 結果が一致する
- [x] integration test で `init --agent codex` / `init --agent both` の生成物を検証する
- [x] Codex integration docs に「hooks だけでなく skills 導線がどう作られるか」を明記する

## 完了確認

- 実装: `scripts/harness/setup/skill-deployer.ts` の skill 実体配置を `skills/` に統一し、`.claude/skills` / `.codex/skills` は `../skills` への symlink として作成する。
- CLI: `phasegate init --agent codex` は `.codex/hooks.json` と `.codex/skills` を作成し、`.claude/settings.json` / `.claude/skills` は作成しない。`--agent both` は両 agent の導線を作成する。
- テスト: `scripts/harness/__tests__/integration/setup/init-codex-agent.integration.test.ts` と `scripts/harness/__tests__/unit/setup/skill-deployer.test.ts` で `codex` / `both` の symlink 生成を検証済み。
- Dogfood: `phasegate@0.138.0` published package で `init --name dogfood --skills core --agent codex --with-ci --yes` を実行し、`.codex/skills` が配置されることを確認済み。

## 非対象

- Codex native `apply_patch` の hook 制約そのものの解消
- Codex 側の system/plugin skill の仕様変更
- Claude 専用 hooks の挙動変更

## 関連

- `scripts/harness/main.ts` — init 時の agent 別分岐
- `scripts/harness/setup/skill-deployer.ts` — skills / hooks の配置ロジック
- `skills/README.md` — `.codex/skills -> ../skills` 前提の説明
- `docs/guide/codex-integration.md` — Codex 向けセットアップ説明
- ISSUE-013 — Codex CLI 対応そのものの issue。こちらは hooks 中心で完了済みだが、project skills 配線の観点が残っている

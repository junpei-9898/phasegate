---
traceability:
  initial_creation: true
---

# WI Documentation Improvement Backlog

作成日: 2026-05-12

## 目的

`docs/inception/_shared/wi_documentation_coverage_report.md` の調査結果を、正式に起票すべき WI 候補へ落とし込む。対象は README / DEVELOPMENT.md / docs/guide / skills / product docs / setup inventory の改善であり、既存 WI の単なる追記ではなく、PhaseGate の公開契約として保守すべき単位に分解する。

現時点の最大 WI は `WI-148` なので、新規起票する場合は `WI-149` 以降を使う。

## 起票方針

今回の改善は「ドキュメント修正」だけに見えるが、実態は次の 4 種類に分かれる。

1. 公開契約の不一致修正
   - 実装・product docs・guide・README の間で、コマンド名や設定意味が食い違っているもの。
   - これは P0 として独立 WI 化する。

2. 利用者が迷う表面の整理
   - README / CLI reference / installation guide / layer guide に、既に実装済みの利用方法が十分に出ていないもの。
   - 複数 WI の成果をまとめて公開面に反映する cross-cutting WI とする。

3. setup / doctor / skills の現行仕様への追従
   - install lifecycle, manifest, Codex hooks, Husky, guidance skill の責務境界。
   - これは PhaseGate 導入体験そのものなので、単なる README 修正に混ぜない。

4. 再発防止
   - CLI 名、skill 数、install target 名、doctor target 名、schema/config path などは今後も drift しやすい。
   - 一回の手修正で終わらせず、検出・棚卸しの仕組みを WI 化する価値がある。

## Must 起票

### WI-149: Public Documentation Contract Mismatch Remediation

- 配置: `docs/inception/_cross/WI-149/`
- type: `issue`
- severity: `high`
- 目的: 実装契約と公開ドキュメントが食い違っている P0 項目を一括で解消する。
- 対象:
  - `WI-093`: `paths.designDocs` と product root 導出の説明差分。
  - `WI-068`: plan checker の公開コマンド名不一致。
  - `WI-046`: `HarnessError` の `suggestedSkill`, `scaffoldCommand`, `templatePath` product docs 未反映。
  - `WI-041`: staged Markdown metadata validation が `phasegate pre-commit` に乗ることの公開説明不足。
- 主要成果物:
  - `docs/guide/configuration.md`
  - `docs/guide/cli-reference.md`
  - `docs/guide/hooks-integration.md`
  - `DEVELOPMENT.md`
  - `docs/product/construction/harness-error/*`
  - `docs/product/units/harness_error_unit.md`
- 受け入れ条件:
  - 上記 4 件について、実装・product docs・guide の説明が同じ名前・同じ意味で読める。
  - `skill:run-plan-checker` / `harness:skill-quality:plan-checker` のどちらを正とするかが決まっている。
  - 修正箇所に `@work-item-id WI-149` が付く。
- 依存:
  - なし。最優先で起票する。

### WI-150: Public CLI Catalog Consolidation

- 配置: `docs/inception/_cross/WI-150/`
- type: `issue`
- severity: `high`
- 目的: README / CLI reference / DEVELOPMENT.md に出る CLI 表面を、現在の実装・npm scripts・guide と揃える。
- 対象:
  - `phasegate:ci-check` と `ci-check` 表記揺れ。
  - `phasegate:check-ready`
  - `phasegate:detect-drift`
  - `phasegate:impact-analysis`
  - `ci-check --quick --fail-on-reject --dry-run --files`
  - regression-suite CLI
  - skill-quality CLI
  - `init --skills`, `--yes`, subcommand `--help` / `-h`, unknown flag suggestion
- 主要成果物:
  - `README.md`
  - `DEVELOPMENT.md`
  - `docs/guide/cli-reference.md`
- 受け入れ条件:
  - README は入口として主要コマンドと参照先を示し、全列挙は CLI reference に寄せる。
  - CLI reference は npm script 名、binary subcommand、help 表示のどれを指すかを混同しない。
  - regression-suite / skill-quality / quick CI の使い道が、初見でも辿れる。
- 依存:
  - `WI-149` の command naming 決定後に着手するのが安全。

### WI-151: Layer Status Drift Semantics Guide

- 配置: `docs/inception/_cross/WI-151/`
- type: `issue`
- severity: `normal`
- 目的: L2 / L4 / status / drift の運用意味を、利用者が CI やローカル運用で誤用しない粒度まで公開 guide に出す。
- 対象:
  - `phasegate:status --json`
  - `phasegate:detect-drift --json`
  - `configurationState`
  - `cachedArtifactState`
  - `liveValidationState`
  - hook / baseline health
  - effective layer enablement
  - `L2-013 cli-e2e-test-existence`
  - `missing` と `limitation` の違い
  - L4 fail-on-warning の前提条件
- 主要成果物:
  - `README.md`
  - `docs/guide/cli-reference.md`
  - `docs/guide/layer-model.md`
  - 必要なら `docs/guide/configuration.md`
- 受け入れ条件:
  - JSON 出力の主要キーと、それを人間・CI・agent がどう使うかが説明されている。
  - L4 warning を失敗扱いにする条件が README からも分かる。
  - `L2-013` が layer guide の validator 表に載る。
- 依存:
  - `WI-150` と並行可能。ただし CLI 名は `WI-150` に合わせる。

### WI-152: PhaseGate Setup Artifact Inventory Documentation

- 配置: `docs/inception/_cross/WI-152/`
- type: `story`
- severity: `high`
- 目的: PhaseGate の「正しくセットアップされている状態」を、設定ファイル・hook・manifest・runtime state の棚卸しとして公開 docs に定義する。
- 対象:
  - `phasegate.config.json`
  - `package.json`
  - `.claude/settings.json`
  - `.claude/settings.local.json`
  - `.claude/scripts/hook-config.json`
  - `.codex/hooks.json`
  - user/project Codex config
  - `.husky/*`
  - `.github/workflows/*`
  - `.phasegate/manifest.json`
  - `.phasegate/baseline.json`
  - `.phasegate/hook-skip-events.jsonl`
  - `.phasegate/backups/*`
  - `.phasegate/uninstalled-*.json`
  - `.phasegate/last-doctor-report.json`
  - active `.harness/*` artifacts
  - `AGENTS.md` / `CLAUDE.md`
- 主要成果物:
  - `docs/guide/installation.md`
  - `docs/guide/hooks-integration.md`
  - `docs/guide/configuration.md`
  - `docs/guide/retrofit-adoption.md`
  - 必要なら新規 `docs/guide/setup-artifacts.md`
- 受け入れ条件:
  - `phasegate.config.json`, `.claude/settings.json`, `.codex/hooks.json` だけ見れば足りる、という誤解がなくなる。
  - managed target と runtime state と legacy artifact が明確に分かれる。
  - `.github/workflows/phasegate-aidlc-gate.yml` と `.github/workflows/aidlc-gate.yml` の命名差分を解消または説明する。
  - `reporting.outputDir`, `reports`, `.harness/reports`, `reports/regression` の関係を説明する。
- 依存:
  - `WI-145..148` の installation lifecycle 仕様。

### WI-153: Bundled Setup Guidance Skills Refresh

- 配置: `docs/inception/_cross/WI-153/`
- type: `issue`
- severity: `high`
- 目的: `/phasegate-config-doctor` と `/phasegate-toolkit-guide` を、doctor / install / reconcile / Codex / Husky / manifest を扱える現行 setup skill に更新する。
- 対象:
  - `skills/phasegate-config-doctor/SKILL.md`
  - `skills/phasegate-toolkit-guide/SKILL.md`
  - 必要なら `skills/README.md`
- 主要変更:
  - config-doctor は `phasegate doctor` report, `.phasegate/manifest.json`, `.phasegate/last-doctor-report.json`, `.claude/settings.json`, `.codex/hooks.json`, `.husky/*`, `.github/workflows/*` を読む手順を持つ。
  - config-doctor の「init 再実行」中心の助言を `install` / `reconcile` / `doctor` / `lint` 中心に改める。
  - toolkit-guide は install lifecycle を独立カテゴリ化する。
  - toolkit-guide は `repairMode`, `repairHint`, `suggestedSkill` の読み方を説明する。
  - 両 skill の境界を「read-only docs 案内」と「doctor finding に基づく修復方針」に分ける。
- 受け入れ条件:
  - doctor が `suggestedSkill=phasegate-config-doctor` を出したとき、skill 側が実際にその相談を処理できる。
  - Codex hook feature flag と pre-commit backstop が setup 診断対象に入る。
  - 検証コマンドが L2 固定ではなく、変更内容ごとに `doctor`, `lint`, `phasegate:check-ready` などへ分岐する。
- 依存:
  - `WI-152` の inventory と同時進行可能。ただし用語は合わせる。

### WI-154: DEVELOPMENT And Skills README Modernization

- 配置: `docs/inception/_cross/WI-154/`
- type: `issue`
- severity: `normal`
- 目的: 開発者向け docs の古い skill 数、init オプション、installation lifecycle、Nyquist / skill-quality wiring を現行仕様へ更新する。
- 対象:
  - `DEVELOPMENT.md`
  - `skills/README.md`
- 主要変更:
  - `28 skills` などの古い数値を現行に合わせる。
  - `init --skills core|aidlc|all` の扱いを現行仕様に合わせる。
  - installation unit / command dispatch の開発者向け説明を追加する。
  - operations skills と Claude/Codex skill link の扱いを整理する。
  - Nyquist / regression-suite / skill-quality CLI wiring を現行に合わせる。
- 受け入れ条件:
  - README / guide / DEVELOPMENT / skills README の間で skill 数・skill 名・setup 方針が矛盾しない。
  - 開発者が新しい skill を追加するときの docs 更新先が分かる。
- 依存:
  - `WI-150`, `WI-153` の結果に合わせる。

### WI-155: Product Traceability Reflection Cleanup

- 配置: `docs/inception/_cross/WI-155/`
- type: `issue`
- severity: `normal`
- 目的: product docs の `@work-item-id` 反映粒度を改善し、legacy annotation 依存を減らす。
- 対象:
  - `WI-037..050`: legacy `@story-id Hxx-xx` 中心の箇所。
  - `WI-072`: `CommitMessage.workItemId` / `Work-Item: WI-XXX` の `logical_design.md` 反映。
  - `WI-097..103`: agent-integration の product reflection 粒度。
- 主要成果物:
  - `docs/product/construction/ci-governance/*`
  - `docs/product/construction/harness-api/*`
  - `docs/product/construction/harness-error/*`
  - `docs/product/construction/nyquist-validation/*`
  - `docs/product/construction/skill-quality/logical_design.md`
  - `docs/product/construction/agent-integration/*`
- 受け入れ条件:
  - 新規追記は `@work-item-id` を使う。
  - legacy ID は履歴として残してよいが、現行 WI との対応が機械的に追える。
  - product docs に反映するだけで、ソース変更は原則しない。
- 依存:
  - `WI-149` の HarnessError product docs 修正と重複しやすい。`WI-149` で P0 を先に直し、こちらは残りの体系化に限定する。

### WI-156: Documentation Drift Guardrails

- 配置: `docs/inception/_cross/WI-156/`
- type: `story`
- severity: `high`
- 目的: 今回見つかった docs drift を、今後のリリース前に検出できる仕組みにする。
- 検出候補:
  - README / CLI reference に載る npm scripts と `package.json` の差分。
  - CLI reference の command 名と実 CLI help / command registry の差分。
  - install target 名と guide の workflow file 名の差分。
  - skills README の skill 数と `skills/*/SKILL.md` 実数の差分。
  - `docs/guide/configuration.md` の主要 config key と schema/preset の差分。
  - legacy-only docs reference の検出。
- 主要成果物:
  - 新規 validator または既存 L2/L4 validator 拡張。
  - `docs/guide/layer-model.md` または `docs/guide/cli-reference.md` への検証説明。
  - `DEVELOPMENT.md` への release-before checklist。
- 受け入れ条件:
  - 少なくとも command/script drift, install target drift, skill count drift のいずれかを自動検出できる。
  - 手動チェックに残すものと自動チェックにするものが明確に分かれる。
  - 失敗時の remediation が docs に書かれている。
- 依存:
  - `WI-149..154` の手修正後に着手する。先に guardrail を作ると、古い docs を正として固定する危険がある。

## Should 起票

### WI-157: Legacy Setup Artifact Retirement Guide

- 配置: `docs/inception/_cross/WI-157/`
- type: `issue`
- severity: `normal`
- 目的: `.harness-hooks.yml`, old Fuse hooks, `.harness/session-state.json`, `.harness/context-priority.json`, `README.ja.md` 参照など、旧構想の残存を現行 docs から分離する。
- 起票判断:
  - `WI-152` に含めてもよいが、legacy cleanup を雑に混ぜると install docs が読みにくくなる。
  - 実ファイル削除や archive docs 修正までやるなら独立 WI にする。
- 受け入れ条件:
  - 現行 setup に必要なものと、過去互換・archive のものが混ざらない。
  - `hooks:config validate` や `.harness-hooks.yml` の扱いが明確になる。

### WI-158: Reporting Output Path Contract Normalization

- 配置: `docs/inception/_cross/WI-158/`
- type: `issue`
- severity: `normal`
- 目的: `reporting.outputDir`, `reports`, `.harness/reports`, `reports/regression` の関係を contract として整理する。
- 起票判断:
  - docs だけでなく実装 fallback や tests の見直しが必要なら独立 WI にする。
  - docs で説明するだけなら `WI-152` に吸収可能。
- 受け入れ条件:
  - 各 report 出力がどの config に従うか、固定パスなのか、legacy fallback なのかが分かる。
  - doctor / status / regression-suite の説明と矛盾しない。

## 起票しない方がよいもの

次は独立 WI にしない方がよい。

1. README にコマンドを 1 行追加するだけの WI
   - `WI-150` に束ねる。

2. `phasegate-config-doctor` と `phasegate-toolkit-guide` を別々の WI にすること
   - 2 つは境界定義が重要なので、同じ WI で設計した方がよい。

3. `WI-037..050` の legacy annotation を全置換する WI
   - 履歴の対応関係を壊すリスクがある。`@work-item-id` の追記・補強に留める。

4. `.claude/settings.local.json` を managed target にする WI
   - user-local override なので、読む対象にはしても install / doctor の managed target にしない。

5. user-level `~/.codex/config.toml` を repo 内管理する WI
   - repo 外のユーザー設定なので、skill / docs で確認方法を案内するに留める。

## 推奨順序

1. `WI-149`
   - 公開契約の P0 不一致を潰す。

2. `WI-150`, `WI-151`
   - CLI 表面と運用 semantics を揃える。

3. `WI-152`, `WI-153`
   - setup inventory と guidance skills を同じ語彙に揃える。

4. `WI-154`
   - DEVELOPMENT / skills README を現行仕様に戻す。

5. `WI-155`
   - product traceability を後追いで体系化する。

6. `WI-156`
   - drift guardrail を導入する。

7. 必要なら `WI-157`, `WI-158`
   - legacy cleanup と report path normalization を独立して処理する。

## 最小セット

予算や時間を絞るなら、最低限は以下の 5 本でよい。

1. `WI-149`: P0 不一致修正
2. `WI-150`: CLI catalog consolidation
3. `WI-152`: setup artifact inventory docs
4. `WI-153`: bundled setup guidance skills refresh
5. `WI-156`: documentation drift guardrails

この 5 本で、利用者が踏む地雷と再発しやすい drift の大半を潰せる。`WI-151`, `WI-154`, `WI-155` は品質を上げるが、上記 5 本よりは後でよい。

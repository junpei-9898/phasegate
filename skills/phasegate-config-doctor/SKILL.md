---
name: phasegate-config-doctor
description: 現在の phasegate.config.json を schema + プロジェクト検出結果と突き合わせて改善提案する診断スキル。read-only Q&A の phasegate-toolkit-guide とは異なり、設定変更を伴う相談に応える。使用タイミング:「phasegate のセットアップを最適化して」「architecture preset 入ってないけど何が適切？」「Quick Mode の relaxedGates に推奨設定教えて」「baseline 有効化しても大丈夫？」「monorepo に対して targetDirs / formatter が正しく検出されてる？」「v2 schema warning が出る、何を直せばいい？」など、現状 config の診断と改善 diff 提案を求める質問。
---

# Phasegate Config Doctor

現在の `phasegate.config.json` を診断し、改善案を **diff 形式** でユーザーに提示する skill。

## このスキルが解決する問題

phasegate を導入した直後の config は単純な default で、実プロジェクトの構造 (monorepo / formatter 選定 / architecture style / Quick Mode の運用方針) に最適化されていない。さらに setup lifecycle は `phasegate.config.json` だけでは完結せず、manifest、hook JSON、Husky、CI、skill link、doctor finding を合わせて読む必要がある。AI が schema や setup contract を知らずに勘で書き換えると壊れるため、**schema + 検出結果に基づいた決定的提案** が必要。<!-- @work-item-id WI-153 -->

## 設計原則

1. **silent 書き換え禁止** — 提案は diff として提示し、`AskUserQuestion` で承認を取ってから Edit
2. **検出結果を優先** — 機械的に決定可能な部分 (workspace 構造、formatter、bash 互換性) は AI 推論ではなく検出結果を採用
3. **AI 推論は判断要素のみ** — architecture preset 選定、relaxedGates 推奨値などは AI が判断するが根拠を必ず示す
4. **schema は enum 違反確認時のみ Read** — 日常診断は本 SKILL 内の判定基準で十分。schema 全文 Read は値域不明時に限定する
5. **read-only な Q&A は phasegate-toolkit-guide に委譲** — 「L2 って何？」など概念質問は本 skill スコープ外
6. **変更後は対象別に検証** — config 変更は `npx phasegate validate --layer L2`、setup lifecycle 変更は `npx phasegate doctor`、hook/script/metadata 変更は `npx phasegate lint` または `npm run phasegate:check-ready` を走らせてからユーザーに完了報告

## 診断プロセス

### Step 1: 現状把握 (read-only)

以下のファイルを Read してから診断する:

| 情報源 | パス | 用途 |
|---|---|---|
| 現 config | `phasegate.config.json` | 診断対象 |
| package.json | `package.json` | devDependencies (formatter 検出) / workspaces 検出 |
| pnpm workspace | `pnpm-workspace.yaml` (存在すれば) | workspace 検出 |
| lerna config | `lerna.json` (存在すれば) | workspace 検出 |
| hook config | `.claude/scripts/hook-config.json` | 既存 hook 設定確認 |
| doctor report | 明示された report path、またはユーザーが指定した `.phasegate/last-doctor-report.json` | `repairMode` / `repairHint` / `suggestedSkill` の確認 |
| manifest | `.phasegate/manifest.json` | install / reconcile / uninstall の managed target と hash 状態確認 |
| Claude hooks | `.claude/settings.json` | managed hook JSON と user customization の確認 |
| Codex hooks | `.codex/hooks.json` | managed hook JSON と Codex hook 配線確認 |
| Husky scripts | `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push` | pre-commit backstop と bypass audit の確認 |
| CI workflows | `.github/workflows/*` | `phasegate-aidlc-gate.yml` や既存 workflow との競合確認 |
| agent context | `AGENTS.md`, `CLAUDE.md` | PhaseGate managed section、lesson pointer section、user-owned content の境界確認 |

**schema は必要なときだけ Read** (enum 違反疑い時など): `node_modules/phasegate/scripts/harness/config-foundation/infrastructure/schemas/harness-config-v3.schema.json` (or `harness-config-v2.schema.json` if v2)。

phasegate リポジトリ自体 (dogfood) の場合は `node_modules/phasegate/` を `scripts/harness/config-foundation/...` に置換。

`doctor --report-out <path>` は指定された path にだけ書く。`.phasegate/last-doctor-report.json` は固定生成物ではないため、存在しない場合は `npx phasegate doctor --json` を実行して現状を読み取る。<!-- @work-item-id WI-152 -->

### Step 1.5: Fresh init 判定 (重要)

以下の **全条件** を満たす場合、フル診断は早期。Step 2 に進まず AIDLC 開始を案内する:

- `phasegate.config.json` が `phasegate init` 直後の default 状態 (`project.preset = "standard"` / `architecture.preset` 設定済 / `layers` / `quickMode` / `harnesses` が空 dict)
- `docs/product/construction/` が空または存在しない
- `scripts/`, `src/` 配下に Unit 構造 (`domain/application/infrastructure/presentation` 等) が無い

**該当時の応答**:

```
このプロジェクトは phasegate init 直後の状態のため、config を最適化するより先に
AIDLC を開始することを推奨します:

  /product-architect

product-architect で Unit を作り、いくつかの logical_design を書いた後で本 skill を再実行すると、
実態に基づいた具体的な改善提案ができます。
```

該当しない場合のみ Step 2 に進む。

### Step 2: 診断観点

各観点で **OK / WARN / SUGGEST** のいずれかを出す。

#### 観点 1: architecture セクション (preset / 整合性)

- `architecture` キーが無い → v2 として扱われる → SUGGEST: `architecture: { preset: "..." }` 追加
- `architecture.preset` 未指定 + `scripts/`, `src/` 配下のディレクトリ構造から推測 → SUGGEST:
  - `domain/` `application/` `infrastructure/` `presentation/` の 4 層あり → `clean` 推奨
  - DDD タクティカル (`entities/aggregates/repositories`) あり → `strict-ddd` 推奨
  - `core/`, `adapters/`, `ports/` パターン → `hexagonal` 推奨
  - 上記いずれも無し → ユーザーに確認 + `custom` 提案
- 検出根拠を必ず提示 (例:「`scripts/harness/{domain,application,infrastructure,presentation}` を検出 → `clean` 推奨」)
- `architecture.preset = "custom"` だが `architecture.layers` 未定義 → WARN: schema validator で reject される

#### 観点 2: project.preset (防御プリセット)

- `project.preset` 未指定 → SUGGEST: プロジェクト規模に応じて `minimal` / `standard` / `strict`
- 値が enum 外 → WARN

#### 観点 3: paths

- `paths.designDocs` / `paths.inceptionDocs` が default のまま (`docs/product/construction` / `docs/inception`):
  - 実 path を Read tool でリスト確認し、存在 + 中身あり → OK
  - 存在しない or 空 → fresh init scaffold 期 (Step 1.5 で早期 return しているはず) または別 path に置いている可能性 → ユーザーに確認
- default 以外で実 path に存在する → OK

#### 観点 4: quickMode

- `quickMode.allowedCategories` が default `['bugfix', 'docs', 'test', 'config']` のまま → プロジェクトの慣習に応じて拡張提案
- `quickMode.relaxedGates` が空 → small team なら `['phase-gate']` 追加を SUGGEST、enterprise なら現状維持を OK

#### 観点 5: harnesses (cascade / bundle / dead-code)

- `cascadeUpdate: false` → AI 主導開発なら `true` 推奨 (SUGGEST)
- `agentLessonCollection: false` → AI セッションの教訓を蓄積したいなら `true` 推奨 (SUGGEST)
- `bundleSizeLimit: 0` → frontend プロジェクトなら値設定推奨

#### 観点 6: baseline

- `baseline` セクション不在 → default `enabled: true, path: .phasegate/baseline.json` (v0.117 以降)
- 既存大規模プロジェクトに後追い導入なら baseline 有効化推奨 (新規違反のみ厳しく検査)

#### 観点 7: agentIntegration.stopHook.enforce (v0.122 以降)

- 未指定 (`false` 相当) → AI セッションの Stop hook 失敗を **warning のみ** で許容
- `true` セット → Complete Check 失敗時に Claude Code の turn を hard block (exit 2)
- 推奨: AI 主導開発で本格運用するなら `true` を SUGGEST

#### 観点 8: hook-config.json (`.claude/scripts/`)

- `targetDirs: ["src"]` のままで monorepo の場合 → WARN: `phasegate init` を再実行すれば monorepo 自動検出が効く (v0.120 以降)
- `formatter: "biome"` だが `@biomejs/biome` が devDependencies に無い → WARN: prettier に切り替え推奨
- v0.119 未満で deploy された hook script (bash 4 `mapfile` 使用) → WARN: macOS の bash 3.2 で silent fail。`phasegate init` 再実行で更新

#### 観点 9: setup lifecycle と doctor finding

- `phasegate doctor --json` の finding に `repairMode: "ai-assisted"` と `suggestedSkill.skillName = "phasegate-config-doctor"` がある → 本 skill が merge 方針、保持する user content、実行すべき `install --apply` / `--force` / `reconcile --apply` を提案する
- Claude-only / Codex-only 導入後は `phasegate doctor --agent claude --json` または `phasegate doctor --agent codex --json` を使って selected agent の readiness を読む。`scopedOutFindings` は未選択 agent の `not-applicable` 情報なので、ユーザーがその agent を導入したいと言っていない限り repair 提案にしない。<!-- @work-item-id WI-178 -->
- `repairHint` がある mechanical finding → 原則として hint のコマンドを優先し、実行前に対象ファイルと manifest の差分を確認
- manifest parse error → `.phasegate/manifest.json` を手で修復する前に backup / uninstall / reinstall の選択肢を提示
- reconcile / uninstall が refuse → user modified managed target として扱い、`--force` のリスクと backup path を説明して承認を取る
- Codex の `codex_hooks` feature flag は user-level setting。project-local `install` では変更されないため、必要なら `codex features enable codex_hooks` を案内
- Codex native `apply_patch` bypass は hook で完全捕捉できない。`.husky/pre-commit` の `phasegate pre-commit` が backstop になるため、Husky 配線を診断対象に含める
- 初回 setup / retrofit / CI-only / agent-hooks の判断が曖昧な場合は `npx phasegate setup:agent --dry-run --json` を先に使い、検出済み状態、質問、変更案、rollback、validation を根拠として提案する。<!-- @work-item-id WI-172 -->
- Claude Code setup 相談では `npx phasegate setup:agent --agent claude --dry-run --json` を先に使い、`plan.agentReadiness` の `claude` / `shared` が `configured` なら setup 修復ではなく WI 起票、inception 計画、product reflection、validation の順で作業開始を案内する。`setup:agent --apply --json` または `install --apply --json` の structured `error` がある場合は、`target`, `operation`, `code`, `likelyCause`, `recovery`, `partialChanges` を読み、`.claude` が file として存在する path conflict、sandbox/permission denial、PhaseGate managed target hash mismatch を区別して説明する。<!-- @work-item-id WI-177 -->
- 「L4 を厳しめにして」「Codex hook を有効にして」「CI で warning を fail にして」などの自然言語依頼は、`npx phasegate config:plan --intent <intent> --dry-run --json` で対象ファイル、コマンド、リスク、検証を確認してから diff を提案する。<!-- @work-item-id WI-173 -->
- `AGENTS.md` は標準運用ルールの managed section と lesson pointer section を分ける。`ci:auto-refresh-agent-context --apply` は lesson pointers 専用 section を更新し、標準運用ルールや user-owned content を置換してはいけない。<!-- @work-item-id WI-174 -->

### Step 3: 診断レポート

診断結果を以下の形式で提示する:

````markdown
## phasegate.config.json 診断結果

### サマリ
- ✅ OK: N 件
- ⚠️ WARN: N 件
- 💡 SUGGEST: N 件

### ⚠️ 修正推奨 (WARN)

#### W1: `architecture.preset = "custom"` だが `architecture.layers` が未定義
- 影響: schema validator で reject される
- 修正案:
  ```json-diff
  - "architecture": { "preset": "custom" }
  + "architecture": {
  +   "preset": "custom",
  +   "layers": [ /* layer 定義 */ ]
  + }
  ```
- 補足: layer 構造が clean / strict-ddd / hexagonal / onion / layered / flat のいずれかに該当するなら `preset: "<その値>"` のほうが簡潔

### 💡 改善提案 (SUGGEST)

#### S1: `architecture.preset` 未指定 → "clean" を推奨
- 検出根拠: `scripts/harness/{domain,application,infrastructure,presentation}` の 4 ディレクトリが存在
- 修正案:
  ```json-diff
   {
     "project": { ... },
  +  "architecture": { "preset": "clean" },
     "layers": { ... }
   }
  ```

### ✅ 問題なし (OK)
- project.preset = "standard"
- paths.designDocs / paths.inceptionDocs はデフォルト値で実プロジェクトと一致
- baseline セクション不在 → default 有効 (v0.117+)
````

### Step 4: 適用 (AskUserQuestion 経由)

提案件数に応じて使い分ける:

- **提案 1-3 件**: `AskUserQuestion` 1 回で「全て適用 / 個別選択 / 適用しない」を提示
- **提案 4 件以上**: WARN を先に `AskUserQuestion` で確認し、SUGGEST はバッチで別途確認

option 設計の例 (提案 2 件、WARN 1 + SUGGEST 1 のとき):

```
question: "phasegate.config.json に提案 2 件あります。どう適用しますか？"
options:
  - label: "全て適用 (推奨) — W1 + S1"
  - label: "WARN のみ適用 — W1 のみ"
  - label: "適用しない (情報のみ受け取る)"
```

ユーザーが適用対象を確定したら `Edit` で `phasegate.config.json` を変更。

**変更後の検証**:

```bash
npx phasegate validate --layer L2
```

setup target を触った場合は以下も使い分ける:

```bash
npx phasegate doctor
npx phasegate lint
npm run phasegate:check-ready
```

検証でエラーが出た場合は変更を **rollback** し、ユーザーに報告 (silent に進めない)。

## phasegate-toolkit-guide との使い分け

| 質問種別 | 使う skill |
|---|---|
| 「L2 って何？」「Quick Mode の仕組み教えて」(read-only Q&A) | phasegate-toolkit-guide |
| 「config の relaxedGates 何にすべき？」(設定診断 + 提案) | phasegate-config-doctor |
| 「monorepo 対応されてる？」(現状確認) | phasegate-toolkit-guide |
| 「monorepo 用に config 直して」(設定変更) | phasegate-config-doctor |

ユーザー質問が両方にまたがる場合は、まず phasegate-toolkit-guide で概念を説明 → ユーザーが「じゃあ修正して」と言ったら本 skill に切り替える。

---
name: phasegate-config-doctor
description: 現在の phasegate.config.json を schema + プロジェクト検出結果と突き合わせて改善提案する診断スキル。read-only Q&A の phasegate-toolkit-guide とは異なり、設定変更を伴う相談に応える。使用タイミング:「phasegate のセットアップを最適化して」「architecture preset 入ってないけど何が適切？」「Quick Mode の relaxedGates に推奨設定教えて」「baseline 有効化しても大丈夫？」「monorepo に対して targetDirs / formatter が正しく検出されてる？」「v2 schema warning が出る、何を直せばいい？」など、現状 config の診断と改善 diff 提案を求める質問。
---

# Phasegate Config Doctor

現在の `phasegate.config.json` を診断し、改善案を **diff 形式** でユーザーに提示する skill。**silent 書き換えは禁止** — 必ずユーザー確認を取ってから Edit を実行する。

## このスキルが解決する問題

phasegate を導入した直後の config は単純な default で、実プロジェクトの構造 (monorepo / formatter 選定 / architecture style / Quick Mode の運用方針) に最適化されていない。ユーザーが「設定を最適化したい」と言ったとき、AI が schema を知らずに勘で書き換えると壊れるため、**schema + 検出結果に基づいた決定的提案** が必要。

## 重要な設計原則

1. **silent 書き換え禁止** — 全提案は diff として提示し、ユーザー承認後に Edit
2. **schema を読んでから提案** — `node_modules/phasegate/scripts/harness/.../schemas/harness-config-v3.schema.json` を Read してから値域を確認
3. **検出結果を優先** — 機械的に決定可能な部分 (workspace 構造、formatter、bash 互換性) は AI 推論ではなく検出結果を採用
4. **AI 推論は判断要素のみ** — architecture preset 選定、relaxedGates 推奨値などは AI が判断するが、根拠を必ず示す
5. **read-only な Q&A は phasegate-toolkit-guide に委譲** — 「L2 って何？」など概念質問は本 skill のスコープ外

## 診断プロセス

### Step 1: 現状把握 (read-only)

以下のファイルを **必ず Read** してから診断する:

| 情報源 | パス | 用途 |
|---|---|---|
| 現 config | `phasegate.config.json` | 診断対象 |
| schema | `node_modules/phasegate/scripts/harness/config-foundation/infrastructure/schemas/harness-config-v3.schema.json` (or `harness-config-v2.schema.json` if v2) | 値域確認 |
| package.json | `package.json` | devDependencies (formatter 検出) / workspaces 検出 |
| pnpm workspace | `pnpm-workspace.yaml` | workspace 検出 |
| lerna config | `lerna.json` | workspace 検出 |
| hook config | `.claude/scripts/hook-config.json` | 既存 hook 設定確認 |

phasegate リポジトリ自体 (dogfood) の場合は `node_modules/phasegate/` を `docs/` / `scripts/harness/config-foundation/...` に置換。

### Step 2: 診断観点

以下の観点で順に診断する。各観点で **OK / WARN / SUGGEST** のいずれかを出す。

#### 観点 1: schema バージョン

- `architecture` キーが無い → v2 として扱われる → v0.120 以降では `architecture: { preset: "..." }` 追加を推奨 (SUGGEST)
- `architecture.preset` が "custom" だが `architecture.layers` 未定義 → schema validator で reject される (WARN)

#### 観点 2: project.preset (防御プリセット)

- `project.preset` が未指定 → SUGGEST: プロジェクト規模に応じて `minimal` / `standard` / `strict` から推奨
- 値が enum 外 → WARN

#### 観点 3: architecture.preset (アーキプリセット)

- 未指定 + `scripts/`, `src/` 配下のディレクトリ構造を検査して推測:
  - `domain/` `application/` `infrastructure/` `presentation/` の 4 層あり → `clean` を推奨
  - DDD タクティカル (entities/aggregates/repositories) あり → `strict-ddd` を推奨
  - `core/`, `adapters/`, `ports/` パターン → `hexagonal` を推奨
  - 上記いずれも無し、または独自命名 → ユーザーに確認 + `custom` を提案
- 検出根拠を必ず提示 (例: 「`scripts/harness/{domain,application,infrastructure,presentation}` を検出 → `clean` 推奨」)

#### 観点 4: paths

- `paths.designDocs` / `paths.inceptionDocs` が default のまま (`docs/product/construction` / `docs/inception`) → 実プロジェクトのパスに合っていれば OK
- 異なるパスに設計文書がある場合 → SUGGEST: 実パスに合わせて変更

#### 観点 5: quickMode

- `quickMode.allowedCategories` が default `['bugfix', 'docs', 'test', 'config']` のまま → プロジェクトの慣習に応じて拡張提案
- `quickMode.relaxedGates` が空 → small team なら `['phase-gate']` 追加を SUGGEST、enterprise なら現状維持を OK

#### 観点 6: harnesses (cascade / bundle / dead-code)

- `cascadeUpdate: false` → AI 主導開発なら true 推奨 (SUGGEST)
- `agentLessonCollection: false` → AI セッションの教訓を蓄積したいなら true 推奨 (SUGGEST)
- `bundleSizeLimit: 0` → frontend プロジェクトなら値設定推奨

#### 観点 7: baseline

- `baseline` セクション不在 → default `enabled: true, path: .phasegate/baseline.json` (v0.117 以降)
- 既存大規模プロジェクトに後追い導入なら baseline 有効化推奨 (新規違反のみ厳しく検査)

#### 観点 8: agentIntegration.stopHook.enforce (WI-087 Phase C-2)

- 未指定 (`false` 相当) → AI セッションの Stop hook 失敗を **warning のみ** で許容
- `true` セット → Complete Check 失敗時に Claude Code の turn を hard block (exit 2)
- 推奨: AI 主導開発で本格運用するなら `true` を SUGGEST

#### 観点 9: hook-config.json (`.claude/scripts/`)

- `targetDirs: ["src"]` のままで monorepo の場合 → WARN: `phasegate init` を再実行すれば WI-087 Phase B の自動検出が効く
- `formatter: "biome"` だが `@biomejs/biome` が devDependencies に無い → WARN: prettier に切り替え推奨
- WI-087 v0.119 未満で deploy された hook script (mapfile 使用) → WARN: macOS で silent fail

### Step 3: 提案フォーマット

診断結果を以下の形式でユーザーに提示する:

```markdown
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
- 補足: layer 構造が clean / strict-ddd / hexagonal / onion / layered / flat のいずれかに該当するなら、`preset: "<その値>"` に変更する方が簡潔

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

---

上記提案のうち、適用するものを選択してください:
- [全て適用]
- [W1 のみ適用]
- [S1 のみ適用]
- [何も適用しない (情報のみ)]
- [カスタム (個別選択)]
```

### Step 4: 適用

ユーザーが適用対象を確定したら、`Edit` ツールで `phasegate.config.json` を変更。

**変更後の必須検証**:

```bash
npx phasegate validate --layer L2
```

L2 でエラーが出た場合は変更を **rollback** し、ユーザーに報告 (silent に進めない)。

## アンチパターン

- ❌ 現 config を読まずに「一般論として推奨」を出す (実態と乖離する)
- ❌ schema を読まずに値を提案する (enum 外の値を出してしまう)
- ❌ ユーザー確認を取らずに Edit する
- ❌ 「とりあえず全部 strict にしておく」のような根拠なき強気提案
- ❌ phase-dependency-model 関連の改修を無検証で提案 (memory `feedback_dogfood_before_release.md` 適用 — paths config / Artifact 改修は dogfood 必須)
- ❌ 設定変更後に `npx phasegate validate --layer L2` を走らせずに完了報告

## phasegate-toolkit-guide との使い分け

| 質問種別 | 使う skill |
|---|---|
| 「L2 って何？」「Quick Mode の仕組み教えて」(read-only Q&A) | phasegate-toolkit-guide |
| 「config の relaxedGates 何にすべき？」(設定診断 + 提案) | phasegate-config-doctor |
| 「monorepo 対応されてる？」(現状確認) | phasegate-toolkit-guide |
| 「monorepo 用に config 直して」(設定変更) | phasegate-config-doctor |

ユーザー質問が両方にまたがる場合は、まず phasegate-toolkit-guide で概念を説明 → ユーザーが「じゃあ修正して」と言ったら phasegate-config-doctor に切り替える。

## 出力例 (簡易)

ユーザー: 「phasegate のセットアップ最適化して」

```
[phasegate.config.json を Read]
[harness-config-v3.schema.json を Read]
[package.json / pnpm-workspace.yaml を Read]
[scripts/ ディレクトリ構造を ls]

診断結果:
- ✅ OK: 5 件 (project / paths / harnesses / reporting / baseline)
- ⚠️ WARN: 1 件 (W1: architecture.preset 未指定 → v2 schema 扱い → warning が出る)
- 💡 SUGGEST: 2 件 (S1: clean preset 推奨 / S2: cascadeUpdate=true 推奨)

提案 diff: [上記フォーマット]

どれを適用しますか？
```

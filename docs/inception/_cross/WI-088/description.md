---
id: WI-088
type: chore
severity: normal
status: tested
affects: [skills, setup, docs]
github_issue: null
reporter: junpei-9898
related: [WI-086, WI-087]
---

# WI-088: phasegate 自身を AI エージェントが使いこなすための bundled guidance skills を追加する

> 起票日: 2026-05-08
> 起票経緯: WI-087 振り返りでの owner 指摘 — 「都度 AI に node_modules を調査してもらうムーブが多い」「phasegate ツールキットに関する Q&A や config・その他設定ファイルの設定を AI が使いこなすための skills を用意した方がいい」

## 背景

phasegate は AI エージェント (Claude Code, codex 等) が正しく動くための「足場」を提供するツールキットだが、**phasegate 自身を AI に使わせる足場が無い**。具体的な症状:

1. ユーザー (project owner 含む) が phasegate を導入したプロジェクトで AI に作業を依頼する際、phasegate のレイヤーモデル (L0-L4)・preset・hook 仕様などを AI が知らない
2. AI は `node_modules/phasegate/` 配下を grep / read で調査して仕様を推測することが多く、不正確かつ時間がかかる
3. `phasegate.config.json` の設定変更 (architecture preset, relaxedGates, baseline 有効化など) も AI が schema を知らないため、ユーザーが手動で docs/guide を読む or AI に長文プロンプトで仕様を教える運用になっている

これは phasegate のコア哲学 「設計意図とコードの構造的整合性を機械的に保証する」 に対し、**「phasegate 自体の使い方を AI が知るための機械的な仕組みが欠落している」** 構造矛盾。

## 提案: 2 個の guidance skill を bundle に追加

phasegate `init` で `.claude/skills/` 配下に既に 28 skill をデプロイしている (`skill-deployer.ts`)。同じ仕組みで以下 2 個を追加配布する:

### Skill 1: `phasegate-toolkit-guide` (Phase A)

**目的**: phasegate 概念の Q&A 用 skill。AI が「L2 って何？」「cascadeUpdate を有効にすると何が起こる？」「Quick Mode と Full Mode の違い」「architecture preset の使い分け」などを答える際の入り口。

**入力例 (AI が受け取る user message)**:
- 「phasegate の L1 と L2 の違いって何？」
- 「Quick Mode で書き込みを許可するカテゴリを増やしたい。どこをいじればいい？」
- 「`architecture.preset: "onion"` と `"clean"` どっちが私のプロジェクトに合う？」

**出力**: 該当する canonical doc (`docs/guide/layer-model.md`, `docs/guide/preset-selection.md`, `docs/guide/configuration.md` など) の該当セクションへのポインタ + 短い要約。

**設計原則 (stale 回避)**:
- skill 本体には **手順とポインタだけ書く**。実知識は phasegate 同梱の canonical doc を AI に読ませる構成
- 例: `node_modules/phasegate/docs/guide/layer-model.md` を読んでから答えよ、という指示
- skill markdown 自体に concept の本文を書かない (バージョン乖離リスク回避)
- これにより `npm update phasegate` で knowledge も自動更新される

### Skill 2: `phasegate-config-doctor` (Phase B)

**目的**: 現在の `phasegate.config.json` を schema + 検出結果と突き合わせて改善提案する skill。

**入力例 (AI が受け取る user message)**:
- 「phasegate のセットアップを最適化して」
- 「architecture preset 入ってないけど、このプロジェクトだとどれが適切？」
- 「Quick Mode の relaxedGates が空だけど、私のプロジェクトでオススメの設定教えて」

**出力**: 現状 config の診断 + 改善案 diff + ユーザー確認後に Edit で適用。

**読む情報源**:
1. 現在の `phasegate.config.json`
2. `node_modules/phasegate/scripts/harness/.../schemas/harness-config-v3.schema.json` (live schema)
3. `npx phasegate validate --layer L2` の出力 (現状の violation)
4. プロジェクト構造 (`pnpm-workspace.yaml` / `package.json.workspaces` / `src/` 検出 — WI-087 Phase B で実装済の `detectWorkspaceTargetDirs` を流用可能)
5. `devDependencies` から formatter 検出

**機械検出 + AI 推論のハイブリッド**:
- 機械的に検出可能な部分 (workspace, formatter) は WI-087 Phase B 既存ロジック流用
- AI の判断が要る部分 (architecture preset 選定、relaxedGates の業界別推奨値) は AI に推論させる
- 提案は **必ず diff 形式でユーザー確認**、silent 書き換えはしない

### Skill 3 (将来): `phasegate-troubleshoot` ※本 WI スコープ外

「hook が failure exit してる」「v2 schema warning が出てる」など症状ベースの診断。Phase A/B で dogfood し、frequent な failure pattern を蓄積してから別 WI で起票する。

## 実装対象

### Phase A: `phasegate-toolkit-guide` skill 追加

1. `skill-creator` skill を起動して `skills/phasegate-toolkit-guide/SKILL.md` を作成
   - **直接 Write は禁止** (memory `feedback_use_skill_creator_for_new_skills.md` 適用)
   - skill-creator のプロンプトに skill 名・目的・参照先 docs リスト・ARGUMENTS 規約を渡す
2. SKILL 内容: 各概念質問カテゴリごとに「該当する canonical doc を読んでから回答せよ」式のポインタを列挙
   - L0-L4 レイヤーモデル → `docs/guide/layer-model.md`
   - preset (防御プリセット / アーキプリセット) → `docs/guide/preset-selection.md`, CLAUDE.md
   - hook 仕様 (PreToolUse / PostToolUse / Stop) → `docs/guide/hooks-integration.md`
   - config 全般 → `docs/guide/configuration.md`
   - quickstart → `docs/guide/quickstart.md`
3. `scripts/harness/setup/skill-deployer.ts` の `SKILL_CATEGORIES` に新カテゴリ `guidance` を追加し、`phasegate-toolkit-guide` を含める
4. `getSkillsForSet("all")` に guidance カテゴリを含めて、`phasegate init` でデフォルト deploy されるようにする
5. `getSkillsForSet("core")` には含めない (core は continuous governance 用、guidance は ad-hoc Q&A 用なので分離)
6. integration test 追加: `init` 後に `.claude/skills/phasegate-toolkit-guide/SKILL.md` が存在することを確認

### Phase B: `phasegate-config-doctor` skill 追加

1. `skill-creator` skill を起動して `skills/phasegate-config-doctor/SKILL.md` を作成
2. SKILL 内容:
   - 入力読み取り手順 (現 config / schema JSON / validate L2 出力 / 検出結果)
   - 診断観点 (architecture preset 適合度・relaxedGates 推奨・baseline enabled 推奨など)
   - 提案フォーマット (diff + 影響範囲説明)
   - **silent 書き換え禁止**、必ずユーザー確認を取る
3. `SKILL_CATEGORIES.guidance` に `phasegate-config-doctor` を追加
4. integration test 追加

### Phase C: ドキュメント整合

1. `README.md` / `docs/guide/quickstart.md` に「phasegate を使う AI に Q&A や config doctor を任せたい場合」セクションを追加し、`/phasegate-toolkit-guide` `/phasegate-config-doctor` の起動方法を記載
2. CHANGELOG に「v0.123.0 — guidance skills (`phasegate-toolkit-guide` / `phasegate-config-doctor`) 追加」と記載

## 受け入れ基準

- [x] `skills/phasegate-toolkit-guide/SKILL.md` が `skill-creator` 経由で作成され、phasegate の skill 規約 (フロントマター) を満たす (Phase A / v0.123.0)
- [x] `skills/phasegate-config-doctor/SKILL.md` が `skill-creator` 経由で作成され、同様に規約を満たす (Phase B / v0.124.0)
- [x] `scripts/harness/setup/skill-deployer.ts` に `guidance` カテゴリが追加され、`getSkillsForSet("all")` に含まれる
- [x] `getSkillsForSet("core")` には含まれない (core/guidance の責務分離)
- [x] integration test 2 ケース以上追加し、全テストグリーン (Phase A 4 ケース + Phase B 4 ケース)
- [x] guidance skill の knowledge は **canonical doc へのポインタ式** で書かれており、phasegate のバージョン更新で自動追従できる構造になっている (skill markdown に concept の本文を埋め込まない)
- [x] CHANGELOG に WI-088 として記載 (v0.123.0 / v0.124.0 両方)
- [x] minor version bump (0.122.0 → 0.123.0 → 0.124.0)
- [x] `npx phasegate init` 実行後、`.claude/skills/phasegate-toolkit-guide/SKILL.md` と `.claude/skills/phasegate-config-doctor/SKILL.md` が deploy される (2026-05-08 `npx phasegate@0.124.0 init --skill-set all` を `/tmp/phasegate-dogfood-wi088` で実行、30 skills deploy + 両 SKILL.md frontmatter 健全性確認済)
- [ ] dogfood: phasegate リポジトリ自身で skill を起動し、「L1 と L2 の違いを教えて」「config に architecture preset 追加して」などの典型クエリで動作確認 (publish 後 — AI session 側での trigger 検証が必要、user 側で実機確認待ち)
- [ ] README.md / quickstart.md に guidance skill の使い方セクション追加 (将来別 WI で対応 — 本 WI では skill 本体追加に集中)

## スコープ外

- `phasegate-troubleshoot` skill (症状ベース診断) — 別 WI で Phase A/B dogfood 後に起票
- AI による `phasegate init` 高精度化 (workspace 自動検出を AI 推論で補強) — 別 WI で検討。本 WI の `phasegate-config-doctor` は **既存 init 後の config を AI で diagnosis** するスコープに留める
- skill knowledge の本文を skill markdown に埋め込む方式 — stale 回避のため明示的に避ける
- skill-creator 自体の改修

## 関連

- `skills/skill-creator/` — 本 WI の skill 作成手段
- `scripts/harness/setup/skill-deployer.ts` — `SKILL_CATEGORIES` / `getSkillsForSet` 拡張対象
- WI-086 (`docs/inception/_cross/WI-086/description.md`) — DX 改善の流れに連なる
- WI-087 (`docs/inception/_cross/WI-087/description.md`) — `detectWorkspaceTargetDirs` / `detectFormatter` 既存ロジックを Phase B で再利用予定
- `docs/guide/layer-model.md`, `docs/guide/preset-selection.md`, `docs/guide/configuration.md`, `docs/guide/hooks-integration.md`, `docs/guide/quickstart.md` — guidance skill が参照する canonical docs

## リリース手順

実装完了後 (Phase A + B 両方完了後):

1. CHANGELOG / package.json / WI-088 description.md 進捗ログ更新
2. commit (Work-Item: WI-088 trailer 必須)
3. tag v0.123.0 + push origin main --tags
4. user に publish を委ねる (`npm publish --auth-type=web` — memory `feedback_npm_publish_auth_type_web.md` 適用)
5. publish 確認後、dogfood 検証 (別 PJ で `npx phasegate init` → `.claude/skills/` 配下に新 skill が deploy されることを確認)

## 教訓フィードバック (memory 適用)

- `feedback_use_skill_creator_for_new_skills.md`: skill 新規作成は必ず `skill-creator` skill 経由で行う。直接 Write 禁止
- `feedback_dogfood_before_release.md`: skill-deployer 配信ロジック改修と類似のリスク (deploy 漏れ・カテゴリ列挙ミス) を本 WI でも警戒。リリース前に `phasegate init` で実 deploy を確認
- `feedback_npm_publish_auth_type_web.md`: publish は `--auth-type=web` 固定、`--otp` は使わない
- `feedback_verify_existing_before_extending.md`: 「phasegate に skill 提供機構が無い」主張は着手前に再確認 (実際は skill-deployer が既存、新 skill 追加で解消可能と確認済 — 2026-05-08)

## 進捗ログ

### Phase A 完了（v0.123.0）— 2026-05-08

`phasegate-toolkit-guide` skill を bundled guidance skill として追加:

- `skills/phasegate-toolkit-guide/SKILL.md` を `skill-creator` skill (`scripts/init_skill.py phasegate-toolkit-guide --path skills --resources references`) 経由で作成。skill-creator validator で pass 確認済 (memory `feedback_use_skill_creator_for_new_skills.md` 適用)。
- SKILL 内容: 9 概念カテゴリ (L0-L4 layer model / preset 2 系統 / Quick vs Full Mode / hook 仕様 / config 全般 / CLI / installation / skills overview / codex integration) ごとに `node_modules/phasegate/docs/guide/*.md` への参照を整理。本 skill 自体に概念知識を固定せず、`npm update phasegate` で knowledge が自動追従する構造を採用。
- `scripts/harness/setup/skill-deployer.ts` を quick-implementor 経由で拡張:
  - `SkillCategory` type union に `"guidance"` 追加
  - `SKILL_CATEGORIES.guidance = ["phasegate-toolkit-guide"]` 登録
  - `getSkillsForSet("all")` に guidance を含める。`getSkillsForSet("core")` には含めない
- 新規テスト 4 ケース (`scripts/harness/__tests__/unit/setup/skill-deployer.test.ts`):
  - `SKILL_CATEGORIES.guidance` に登録されていること
  - `getCategoryForSkill('phasegate-toolkit-guide') === 'guidance'`
  - `getSkillsForSet('all')` に含まれること
  - `getSkillsForSet('core')` に含まれないこと
- 全 3495 テスト (前回 3491 + 新規 4) グリーン、L1 violations なし

**Phase A 適用範囲**: 最小スコープ (5-7 概念質問カテゴリへのポインタ式) を実装。dogfood しながら必要に応じて拡張する方針 (本 WI の Phase B 完了後または別 WI で対応)。

### Phase B 完了（v0.124.0）— 2026-05-08

`phasegate-config-doctor` skill を Phase A の対 (設定変更系 skill) として追加:

- `skills/phasegate-config-doctor/SKILL.md` を `skill-creator` skill (`init_skill.py phasegate-config-doctor --path skills`) 経由で作成。skill-creator validator で pass 確認済 (memory `feedback_use_skill_creator_for_new_skills.md` 適用)。
- SKILL 内容: 9 診断観点 (schema バージョン / project.preset / architecture.preset / paths / quickMode / harnesses / baseline / agentIntegration.stopHook.enforce / hook-config.json) ごとに OK / WARN / SUGGEST の判定基準と修正案 diff フォーマットを定義。silent 書き換え禁止 / schema を読んでから提案 / `phasegate validate --layer L2` で事後検証必須、を skill body に明記。
- `scripts/harness/setup/skill-deployer.ts` の `SKILL_CATEGORIES.guidance` に `phasegate-config-doctor` を追加 (Phase A の `phasegate-toolkit-guide` と並ぶ)。
- 新規テスト 4 ケース (`scripts/harness/__tests__/unit/setup/skill-deployer.test.ts`):
  - `SKILL_CATEGORIES.guidance` に登録されていること
  - `getCategoryForSkill('phasegate-config-doctor') === 'guidance'`
  - `getSkillsForSet('all')` に含まれること
  - `getSkillsForSet('core')` に含まれないこと
- 全 3499 テスト (前回 3495 + 新規 4) グリーン、L1 violations なし

**Phase B 適用範囲**: WI-087 Phase B で実装した `detectWorkspaceTargetDirs` / `detectFormatter` 既存ロジックを skill body の診断観点 9 (hook-config.json) に文脈として参照。skill 自体は機械検出ロジックを再実装せず、AI が hook-config.json を Read して診断する設計。

**WI-088 全体スコープ**: 本 WI の guidance skill 系列 (Phase A: phasegate-toolkit-guide / Phase B: phasegate-config-doctor) は v0.124.0 で完了。`phasegate-troubleshoot` (症状ベース診断) は dogfood 結果を見てから別 WI で起票する方針 (本 WI スコープ外)。

### Dogfood 検証 — 2026-05-08

publish 後の deploy 確認:

- 別ディレクトリ `/tmp/phasegate-dogfood-wi088` に `npm install phasegate@0.124.0 --save-dev` → npm tarball 内に `node_modules/phasegate/skills/{phasegate-toolkit-guide,phasegate-config-doctor}/` 同梱を確認
- `npx phasegate init --skill-set all --yes` 実行 → `✓ Skills deployed to ... (30 skills, set: all)` を確認 (Phase A/B 反映前は 28 skills、+2 で 30 と整合)
- deploy 後 `skills/phasegate-toolkit-guide/SKILL.md` / `skills/phasegate-config-doctor/SKILL.md` の frontmatter (name / description) が破損なく読み込め、AI agent の trigger source として機能する形状を保持していることを確認
- `.claude/skills` は `../skills` への symlink でデプロイされ、両 skill が `.claude/skills/phasegate-toolkit-guide/` `.claude/skills/phasegate-config-doctor/` として AI から参照可能

**結論**: Phase A/B の deploy 経路は v0.124.0 で正常動作。残るのは AI session 内での trigger 動作確認のみで、これは user 側で実利用しながら検証する想定。

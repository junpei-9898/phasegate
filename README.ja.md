![Phasegate header](assets/phasegate-header.png)

# Phasegate

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 18](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

**AI agent に「設計してから書け」を hooks / git / CI で強制するツールキット。**
Claude Code / Codex / Cursor / Copilot — どの AI agent でも設計意図・レイヤー境界・テスト規約を守らせます。

[English README](README.md) ・ [開発者ガイド](DEVELOPMENT.ja.md)

---

## 30 秒でわかる Phasegate

1. **AI agent が設計文書なしで実装ファイルを書こうとすると、Write/Edit/Bash または git hook で止まる**
2. **コミット前に L1〜L3 のバリデーションが自動で走り**、レイヤー違反・テスト品質違反・依存方向違反を弾く
3. **ブロック時のエラーは AI が読んで自己修正できる形式**（理由・必要な設計文書・次に打つべきスキル名が出る）

既存プロジェクトには `npx phasegate install` で既存 hooks / scripts を壊さずに組み込み、新規プロジェクトの legacy bootstrap には `npx phasegate init` を使います。導入後は `phasegate doctor` / `uninstall` / `reconcile` で状態確認・削除・アップグレード追従ができます。

---

## なぜ Phasegate か

AI agent は速いが、設計を飛ばして実装に走ります。レイヤー境界を平気で越え、`any` 型で型システムを骨抜きにし、テストはあるけど実装の写経になっている — そんなコードを高速に量産します。レビューで全部捕まえるのは現実的ではありません。

Phasegate はこれを **「人がレビューで防ぐ」のではなく「ツールが hooks / git / CI レベルで防ぐ」** で解決します。設計文書がなければ書き込みまたは commit が止まる。レイヤー違反があれば CI が通らない。AI agent 自身が「次にどの設計スキルを呼べばいいか」を読んで自走します。

### こんなプロジェクトで効きます

| 向いている | 向いていない |
|---|---|
| AI agent に複数機能を任せる中〜大規模開発 | 数百行の使い捨てスクリプト |
| Clean Architecture / DDD / Hexagonal を採用 | 構造を持たないアドホック実装 |
| TDD・テスト規約を守らせたい | テストを書かない方針 |
| 設計とコードの乖離を継続的に検出したい | コードのみが Source of Truth |

---

## 動いている様子

AI agent が設計なしに `src/order/order-service.ts` を書こうとすると、PreToolUse hook が止めます。

```
フェーズゲート違反: src/order/order-service.ts
対象スコープ: Level 3 (実装), Unit: order
ブロック理由:
  - docs/product/construction/order/domain_model.md が存在しません
  - docs/product/construction/order/logical_design.md が存在しません
次のアクション: /story-implementor スキルを使用して設計フェーズから開始してください。
  実行例: /story-implementor --unit order
```

Claude Code / Codex はこのメッセージを読んで `/story-implementor` を起動し、ドメイン設計→論理設計→TDD 実装の順で進みます。単に失敗させるのではなく、AI agent が復帰できる形で「次に何を作るべきか」を返します。

---

## クイックスタート

まず [Getting Started](docs/guide/getting-started.md) から始めると、新規リポジトリ / 既存リポジトリ / CI 専用 / agent hook / strict 導入の各パスを、次に打つコマンドと成功状態に対応づけて案内します。

### 前提

Node.js >= 18, npm >= 9, TypeScript 5.x

### 3 ステップ

```bash
# 1. インストール
npm install --save-dev phasegate

# 2. 新規プロジェクトを初期化
npx phasegate init --name my-project --with-husky --with-ci

# 3. AI agent を起動して /product-architect から始める
claude
> /product-architect
```

`init` は初期 bootstrap として以下を生成します:

- `phasegate.config.json` — 品質設定の Single Source of Truth
- `skills/` — 29 の AIDLC スキル一式
- `.claude/skills/` ・ `.codex/skills/` ・ `.agents/skills/` — agent 向けの skill symlink
- `.claude/settings.json` — PreToolUse / PostToolUse / Stop hook
- `.codex/hooks.json` — Codex CLI hooks 設定（`--agent codex|both` 時）
- `docs/principles/*.md` — アーキテクチャ哲学・テスト規約（immutable）
- `docs/folder_management_rules.md` — ドキュメント配置ルール（**正本**）
- `--with-husky` を付けると `.husky/pre-commit` ・ `.husky/commit-msg` ・ `.husky/pre-push` も配置
- `--with-ci` を付けると `.github/workflows/aidlc-gate.yml` ・ `.github/workflows/consistency-check.yml` ・ `.github/workflows/agent-context-refresh.yml` も配置

**`init` が生成しないもの**（後で skill が作る）:

- `docs/inception/` 配下の WI directory — `/product-architect` 以降のスキル実行で生成
- `docs/product/` 配下の確定設計文書 — `/domain-designer` `/logical-designer` 等が生成
- `docs/ADR/` — `/skill-creator` や手動で必要に応じて作成

`init` は legacy 互換の bootstrap 経路です。既存 hooks / scripts / package metadata に構造化 merge したい場合は `install` を使います。「設計してから書け」を強制する仕組みなので、設計文書はユーザーがスキル経由で作るのが既定動作です。

既存プロジェクトへの導入は、**チーム共通で入れる (team install)** か **自分だけで試す (personal install)** かで手順が変わります。誰のリポジトリで誰がメンテするかで選んでください。

| シナリオ | コマンド | 影響範囲 |
|---|---|---|
| 新規プロジェクトを bootstrap | `npx phasegate init --name <name> --with-husky --with-ci` | リポジトリ全体（team） |
| 既存プロジェクトにチーム共通で導入 | `npx phasegate install --apply` | リポジトリ全体（team） |
| チーム所有リポジトリで個人評価 | `npx phasegate install --personal --agent claude --apply` | 自分の作業コピーのみ（ローカル） |

#### team install — チーム共通で導入する場合

`package.json` / `CLAUDE.md` / `.husky/*` / `.github/workflows/*` などのチーム共有ファイルを merge 対象に含めます。**この変更はコミット後にチーム全員へ影響します**。事前に dry-run で差分を確認してから apply してください。

```bash
npx phasegate install --dry-run
npx phasegate install --apply
npx phasegate doctor
```

`install` は既存の Claude / Codex hooks や Husky script を捨てずに PhaseGate の設定を merge します。書き込み前に変更予定を表示し、package scripts と `phasegate` devDependency、root `skills/` への selected bundled skills 配布、agent skill symlink、未作成の CI workflow、`.phasegate/manifest.json` を整えます。強制的な managed 更新が必要な場合は `npx phasegate install --apply --force` を使います。この場合、置き換え対象は `.phasegate/backups/` に退避されます。<!-- @work-item-id WI-210 -->

#### personal install — 自分だけで試す場合（チーム所有リポジトリで評価したい）

チーム所有のリポジトリで自分だけ PhaseGate を試したい場合は `--personal` フラグを使います。**チーム共有ファイルには一切触れず、自分の agent runtime だけを設定する** ローカル専用パスです。

```bash
npx phasegate install --personal --agent claude --dry-run
npx phasegate install --personal --agent claude --apply
```

| 項目 | personal install の挙動 |
|---|---|
| **触らないファイル** | `package.json` / `AGENTS.md` / `CLAUDE.md` / `.husky/*` / `.github/workflows/*` / `.gitignore` / GitHub CLI 設定 / repo secrets / CI 設定 |
| **作るファイル** | `.phasegate-local/phasegate.config.json`（ローカル専用 config）／ runtime から見えるローカル agent context（Claude は `.claude/CLAUDE.md`、Codex は root の `AGENTS.md` が不在または既に PhaseGate 管理下のときのみ `AGENTS.md`）／ `.claude/settings.json` + `.claude/skills/` または `.codex/hooks.json` + `.codex/skills/`（選択した agent の runtime artifact）／ `.git/hooks/pre-commit` + `.git/hooks/commit-msg`（ローカル git hook）／ `.phasegate-local/docs/`（設計原則文書コピー）／ `.phasegate/manifest.json` |
| **既存 skills の扱い** | 個人用 skills directory がある場合は merge — bundled skills を refresh し、user 所有の skill は保持する |
| **コミット漏れ対策** | `.git/info/exclude` にローカル専用 block を管理して、個人用ファイルが誤ってチームの commit に混ざらないようにする。commit 時の L2 防御は `.git/hooks/` で発火する |
| **Codex hook trust** | Codex CLI >= 0.124.0 では hooks は stable / default-on。`.codex/hooks.json` 更新後は `/hooks` で current definition hash を再 trust する |

チーム所有の `AGENTS.md` が既に存在する場合、Codex の personal install はそれを変更せず、`doctor --personal --agent codex` が残りの context ステップを（`AGENTS.override.md` に隠すのではなく）報告します。Codex を併用する場合は `--agent codex` または `--agent both` を指定します。アンインストールは team install と同様に `npx phasegate uninstall --apply` を使えば manifest 経由でローカル成果物のみが除去されます。<!-- @work-item-id WI-207 --> <!-- @work-item-id WI-208 --> <!-- @work-item-id WI-209 --> <!-- @work-item-id WI-213 --> <!-- @work-item-id WI-215 -->

後で PhaseGate を外す場合は、manifest ベースの uninstall を使います。

```bash
npx phasegate uninstall --dry-run
npx phasegate uninstall --apply
```

`uninstall` は manifest を読んで、PhaseGate が作成したファイルを削除し、merge した Claude / Codex / Husky / `package.json` から PhaseGate 管理部分だけを取り除きます。ユーザーの既存設定は保持し、manifest は `.phasegate/` 配下に履歴として archive します。

PhaseGate をアップグレードした後は、reconcile で既存の managed files を現在の bundled template に追従できます。

```sh
npx phasegate reconcile --dry-run
npx phasegate reconcile --apply
```

`reconcile` は PhaseGate 管理部分だけを更新し、ユーザーの hook / script / dependency は保持します。新しい deploy target が追加されていれば install と同じく追加し、project install の shared skills 実体が欠落している場合も修復し、`.phasegate/manifest.json` の version / hash も更新します。install 後に user 改変された managed file は `--force` 無しでは refuse し、force 時は `.phasegate/backups/reconcile-<timestamp>/` に退避してから上書きします。<!-- @work-item-id WI-210 -->

### Codex CLI を使う場合

```bash
npx phasegate install --agent codex --with-husky --apply
npx phasegate doctor --agent codex
```

両方使う場合は `--agent both`。Codex CLI >= 0.124.0 ではネイティブ `apply_patch` の Update/Add/Delete も編集前 hook に入り、違反を hard block します。`.codex/hooks.json` 更新後は `/hooks` で definition hash を再 trust してください。pre-commit (L2) は backstop として維持します。詳細は [Codex Integration Guide](docs/guide/codex-integration.md) を参照。<!-- @work-item-id WI-384 -->

### Grok Build / Antigravity CLI を使う場合

```bash
npx phasegate install --agent grok --apply
npx phasegate doctor --agent grok
npx phasegate install --agent antigravity --apply
npx phasegate doctor --agent antigravity
```

Grok は hooks 対応の CLI 1.0.0 系（検証対象）が最低要件です。Claude compatibility scanner を使うため、Phasegate は `.claude/settings.json` と `.claude/skills` を管理し、二重発火する `.grok/hooks` は作りません。hook が静かに効かない場合は `grok inspect`、`/hooks`、`--trust` または `/hooks-trust` で load / trust を確認してください。Antigravity hooks は CLI v1.0.14 以降が最低要件で、Phasegate は `agy` 1.1.x で検証しています。`.agents/hooks.json` の named `phasegate-gate` と `.agents/skills` を使い、静かに効かない場合は `agy` の `/hooks` で load を確認します。編集前 hard block の対応範囲は `agy` CLI で、IDE / desktop の hook 発火は保証しません。その範囲では L2 pre-commit が主防御です。全 runtime は `--agent all`、従来の `both` は Claude + Codex のままです。詳細は [Grok guide](docs/guide/grok-integration.md) と [Antigravity guide](docs/guide/antigravity-integration.md) を参照してください。<!-- @work-item-id WI-385 -->

### アップデート

```bash
npm update phasegate
npx phasegate reconcile --dry-run
npx phasegate reconcile --apply
```

`update-skills` は互換 alias として残っていますが、推奨は `reconcile` です。`.phasegate/manifest.json` に記録された PhaseGate 管理ファイル全体を最新版 template に追従できます。

---

## 主な機能

| 機能 | できること |
|---|---|
| **フェーズゲート** | 設計文書がないと実装ファイルへの Write/Edit/Bash をブロック。AIDLC 準拠 / カスタム gate の両方をサポート |
| **5 層バリデーション (L0-L4)** | エディタ保存 → pre-commit → CI → 週次まで段階的に品質チェック |
| **29 AIDLC スキル** | 要求定義 → ドメイン設計 → テスト設計 → TDD 実装をスキルとして提供 |
| **Quick Mode** | バグ修正・docs・テスト追加など軽微変更ではゲートを緩和して高速化 |
| **複数 runtime hooks** | Claude Code / Codex / Grok Build / Antigravity CLI の payload を形状で判定し編集前 gate を実行 |
| **HarnessError 形式** | 全エラーに ADR 参照 + 修正例が含まれ、AI が自己修正できる |
| **Baseline (retrofit)** | 既存リポジトリ導入時、`baseline` snapshot に登録した既存ファイルは構造的に編集されるまで gate 対象外 |
| **カスタム gate** | AIDLC 以外のプロジェクトでも schema-first など独自の前提条件を設定できる |
| **World Model** | 設計文書・ソース・テスト・matrix・attestationを型付き事実グラフへ抽出。決定的`world:*` CLI、L2 fast-path、L3 authoritative再導出、bounded SessionStart、attestation v2 root pinを提供 |

---

## 5 層防御モデル

```
+------------------------------------------------------------------+
| L0  AI agent runtime + git hooks                                 |
|     PreToolUse / PostToolUse / Stop / SessionStart /             |
|     UserPromptSubmit + .husky/pre-commit + .husky/commit-msg     |
+------------------------------------------------------------------+
| L1  エディタ時 / `phasegate lint`                                |
|     @unit / @layer メタデータ, レイヤー違反, AI アンチパターン   |
+------------------------------------------------------------------+
| L2  pre-commit                                                   |
|     phase-gate, story-reflection, テスト品質 (semantic AAA),      |
|     coverage-attestation-gating (L2-016, fail-closed)            |
+------------------------------------------------------------------+
| L3  CI/CD                                                        |
|     security, performance, coverage 90%/95%, 要件カバレッジ,       |
|     injection-scan (L3-006, advisory)                            |
+------------------------------------------------------------------+
| L4  週次 (default off)                                           |
|     設計-コード乖離, 文書整合性, デッドコード,                  |
|     doc-freshness, pointer-validation                            |
+------------------------------------------------------------------+
```

| Layer | 実行タイミング | コマンド |
|---|---|---|
| **L0** | AI agent / git hook | runtime 自動（`.claude/settings.json` 等） |
| **L1** | 保存時 | `npx phasegate lint` |
| **L2** | コミット前 | `npx phasegate validate --layer L2` |
| **L3** | CI/CD | `npx phasegate validate --layer L3` |
| **L4** | 週次 cron | `npx phasegate validate --layer L4` |

エラーは `HarnessError` 形式（理由 / ADR 参照 / 修正例）で返されるため、AI agent が自己修正できます。

**L2 の追加ゲート**: `L2-STORY-REFLECTION` は git の source-touch により layer-aware になり、複数 WI を含む commit では file-tag scoped の attribution で反映元を判定します。`L2-016 coverage-attestation-gating` は fail-closed で、`✅` を主張するには attestation ID が必須です（ID なしの ✅ はブロック）。既存の非ゲート行は `ungated-legacy` マーカーで可視化したまま段階返済します。

**L3 の追加ゲート**: `L3-006 injection-scan` は指示搭載ファイルに対する advisory（**warning-only、非 blocking**）なインジェクションスキャナで、人間レビューへの注意喚起に留めます。

詳細: [5-Layer Defense Model](docs/guide/layer-model.md)

---

## セキュリティ姿勢

Phasegate はプロンプトインジェクションを独立した新規脅威として扱いません。[ADR-030](docs/ADR/030-injection-threat-model-and-trust-root.md) の通り、インジェクションに成功したエージェントは、phasegate が元々仮定してきた **「洗浄を試みるエージェント」と同一の脅威** — すなわち正規の権限（Bash / ファイル書き込み / commit）で品質防御を回避しようとする悪意ある内部者 — として振る舞います。したがって対策は「穴を塞ぐ」「コンテンツが指示になる経路を減らす」の 2 軸に還元され、専用の別枠防御ではなく既存の L0-L4 モデルの延長で扱います。

**信頼のルート**: L0-L2 はローカルで実行される以上、Bash を持つエージェントには原理的に偽造・迂回可能です。これらは **fast-path**（正直なエージェントの事故防止 / 騙されかけたエージェントの早期停止）として正直に位置づけます。**信頼のルート（authoritative）は L3 CI の再検証**で、攻撃者が制御できない環境で evidence を独立に再計算します。「ローカルが緑なら安全」は明示的に保証しません。

この姿勢を 5 コンポーネントで実装します:

| コンポーネント | 役割 | 正直な位置づけ |
|---|---|---|
| **指示ファイル整合性 pin** | 指示搭載ファイル（SKILL.md / `CLAUDE.md`・`AGENTS.md` テンプレート / hook 定義 / `.husky/*`）の SHA-256 manifest（`phasegate.integrity.json`）。`integrity:pin` で意図的変更を記録、SessionStart hook が drift を警告、CI が再計算して authoritative に照合 | ローカル照合は warn-only の fast-path、CI が authoritative |
| **coverage attestation ゲート (L2-016)** | fail-closed の参照形式ゲート。`✅` の主張には attestation ID が必須で、bare ✅ はブロック。既存行は `ungated-legacy` で可視化し段階返済 | L2 は参照形式をゲートする。evidence の独立再実行は L3 側の将来分 |
| **hook 出力の spotlighting** | hook が中継するリポジトリ由来の自由文字列を固定のデータ境界フェンスで包み、「データであって指示ではない」ことを明示 | リポジトリ由来テキストが指示に昇格する経路を減らす |
| **advisory インジェクションスキャナ (L3-006)** | 指示搭載ファイルの既知インジェクションパターンを検査。**advisory / warning-only** で非 blocking のため「すり抜け＝安全」という誤った信頼を生まない | パターン検査は回避可能。finding は警告のみ、最終判断は人間レビュー |
| **エージェント権限 allowlist** | エージェント操作を allowlist（明示的に許されたものだけ実行）に反転。網羅漏れのある deny 列挙（`git merge`/`checkout`/`reset` は deny 済みなのに `git switch` が漏れていた等）を是正 | 未知の危険操作を既定で拒否 |

**ADR-030 が明記する残存リスク**: ローカル層（L0-L2）は偽造可能なので L3 が信頼のルート／スキャナは回避可能なので advisory に留める／CI を持たない PJ には信頼のルートが不在（`phasegate doctor` が警告）／red・警告付き PR を人間が手動 merge する経路は機械防御の対象外。

---

## World Model

phasegate のゲートは従来一方向でした: 書き込み時にコードを設計と照合する。**World Model**（[ADR-031](docs/ADR/031-world-model-ownership-and-corpus-lifecycle.md)〜[037](docs/ADR/037-world-cli-and-output-contract.md)）はこの制約面を**端点対称**にします。設計文書・ソースメタデータ・テスト・requirement-test matrix・attestation を型付き・content-addressed な事実グラフとして抽出し、pin された制約は**どちらの端点が変わっても**再評価されます — 設計文書を編集すれば、それを根拠として主張していたコード側に可視の義務が生まれます（逆方向だけではなく）。

3 コマンドは常に明示実行できます。`world.enabled` の product 既定値は `false` で、有効化すると登録済み L2/L3 統合が動きます。このリポジトリでは dogfood のため有効です。

```bash
npx phasegate world:inspect --json    # 決定的な read-only snapshot: node / edge / 抽出 diagnostics
npx phasegate world:pin --constraint <id> --endpoint <claimant|premise> --apply
npx phasegate world:derive --json     # 制約評価から obligation report を再導出
```

正直さを保つための設計上のコミットメント:

- **obligation report は immutable な導出結果。** `world:derive --write` は `.harness/world-obligations.json` に report を永続化しますが、判定は常に corpus から再導出されます — 永続 report を手編集・削除しても結果は変わりません。
- **新規違反は初日から fail-closed。** 既存違反は閉じた・人間レビュー可能な baseline（`phasegate.world-baseline.json`）として採用され、縮小のみ許されます（同一 ruleset での追加は拒否）。
- **既知の意味的ギャップは宣言するもので「再発見」しない。** explicit debt は `phasegate.world-debts.json` に宣言し import として表示。waiver（`phasegate.world-waivers.json`）は fingerprint / 理由 / 期限 / Work Item が必須です。
- **決定性は契約。** 同一 checkout での 2 回実行は byte-identical な JSON を出力します。
- **enforcement は二つの信頼レベルを持つ。** `L2-017` は偽造可能な local fast-path、`L3-008` は current corpus から authoritative に再導出し、`.harness/world-obligations.json`を信頼しません。adopted legacy は可視・非blocking、新規構造違反や不正宣言はfail-closedです。
- **agent context はbounded。** SessionStartは最大5件 / 2000文字でopen itemを表示し、adopted legacyは件数だけに集約。導出不能時は固定warningへfail-openします。
- **evidenceはroot一件だけをpinする。** attestation v2はfragment digestを複製せず`worldSnapshotRoot`をgate-run evidenceへ封印し、v1 produce / verify互換も維持します。

World enforcementはproduction統合済みです。`L2-017` / `L3-008`は登録済み、bundled CI gateはWorld有効projectで決定的deriveを条件付き実行し、このリポジトリはfull dogfood pathを実行します。

---

## 29 スキル

AIDLC (AI-Driven Development Life Cycle) は **要求定義 → 設計 → テスト設計 → TDD 実装** の順序を強制するプロセスです。各スキルは前のレベルの成果物を入力にします。

**最初の一歩**: Claude Code / Codex 内で `/product-architect` を実行。

### 6 グループ（29 スキル）

| グループ | スキル |
|---|---|
| **Foundation (4)** | `/product-architect` `/story-writer` `/story-mapper` `/unit-designer` |
| **Design (5)** | `/domain-designer` `/logical-designer` `/mock-designer` `/uiux-designer` `/environment-designer` |
| **Test Engineering (7)** | `/unit-test-designer` `/it-test-designer` `/scenario-test-designer` `/unit-test-logic-designer` `/it-test-logic-designer` `/scenario-test-logic-designer` `/test-coverage-checker` |
| **Implementation (3)** | `/story-implementor` `/quick-implementor` `/implementation-readiness-checker` |
| **Verification (7)** | `/consistency-checker` `/cascade-updater` `/codex-delegator` `/codebase-mapper` `/doc-health-checker` `/engineering-perspective` `/skill-creator` |
| **Operations (3)** | `/phasegate-config-doctor` `/phasegate-toolkit-guide` `/release-publisher` |

各スキルの詳細・成果物・前提条件: [Skills Overview](docs/guide/skills-overview.md)

---

## メタデータ規約

ソースファイル先頭に `@unit` / `@layer` を、テストには `@story` または `@work-item-id` を記載します。L1 / L2 はこれを使ってレイヤー違反検出・drift-detection・WI トレーサビリティを行います。

```typescript
// @unit config-foundation
// @layer domain
// @work-item-id WI-042   ← 任意（traceability に貢献）
// @story US-001          ← テストファイルのみ（legacy 互換）

export class ConfigSchema { ... }
```

| タグ | 値 | 必須性 |
|---|---|---|
| `@unit` | `/unit-designer` が定義した Unit 名（例: `config-foundation`） | **必須**（L1-001 が検証） |
| `@layer` | `architecture.preset` で定義した層名（例: `domain` / `application` / `infrastructure` / `presentation`） | **必須**（L1-002 が検証） |
| `@work-item-id` | このファイル変更を駆動した WI（例: `WI-042`） | 任意 |
| `@story` | 検証する US / WI の ID（例: `US-001`, `H02-04`） | テストでは推奨（legacy 互換） |

### product 文書での反映宣言

product 文書（`docs/product/construction/{unit}/*.md`）の章ごとに、反映元の WI を `@work-item-id` で記載します:

```markdown
## ポート定義

<!-- @work-item-id WI-042 -->
### OrderRepository Port
- findById(id: OrderId): Promise<Order>

<!-- @work-item-id WI-042, WI-051 -->
### PaymentGateway Port
- charge(amount: Money): Promise<Receipt>
```

L2-STORY-REFLECTION バリデータがこのアノテーションを検出し、inception 設計が product に反映されているかを判定します。

> **legacy 互換**: 既存 product 文書の `@story-id US-XXX` / `@story-id H##-##` / `@issue-id ISSUE-XXX` は、WI frontmatter の `legacy_id` 経由で読み替えられます。一括置換は **しません**。新規記述は `@work-item-id WI-XXX` を使ってください。

---

## 設定の要点

`phasegate.config.json` が品質設定の Single Source of Truth です。**ほぼ全項目にデフォルトがあるため、まずは init が生成したものをそのまま使えば動きます**。

```jsonc
{
  "project":   { "name": "my-project", "preset": "standard" },
  "architecture": { "preset": "clean" },
  "layers": {
    "L1": { "enabled": true },
    "L2": { "enabled": true  }, "L3": { "enabled": true  },
    "L4": { "enabled": false }
  },
  "phaseDependencies": { "preset": "standard", "storyReflection": { "enabled": true } },
  "quickMode":      { "allowedCategories": ["bugfix", "docs", "test", "config"] },
  "protectedFiles": { "exclude": ["package.json"] },
  "paths": {
    "designDocs": "docs/product/construction",
    "inceptionDocs": "docs/inception",
    "principlesDocs": "docs/principles",
    "folderRulesDoc": "docs/folder_management_rules.md"
  },
  "baseline":       { "enabled": true, "path": ".phasegate/baseline.json" }
}
```

### 3 系統の preset（呼称分離）

phasegate には独立した 3 系統の preset があります。役割が違うので呼び分けます。

| 呼称 | 設定キー | 値 | 役割 |
|---|---|---|---|
| **防御プリセット** | `project.preset` | `minimal` / `standard` / `strict` | 有効レイヤーとカバレッジ閾値を決める |
| **アーキプリセット** | `architecture.preset` | `clean` / `strict-ddd` / `onion` / `hexagonal` / `layered` / `flat` / `custom` | L1 が検査する層構造と依存方向 |
| **フェーズプリセット** | `phaseDependencies.preset` | `full` / `standard` / `minimal` / `custom` | フェーズゲートの厳密度 |

`npx phasegate init --preset <id>` の `--preset` は **フェーズプリセット**（`full / standard / minimal / custom`）を設定します。`project.preset` の `strict` は別概念です。

選定ガイド: [Preset Selection Guide](docs/guide/preset-selection.md)

### 主要キー

| キー | 効果 |
|---|---|
| `quickMode.fullModeRequiredWhen` | Quick Mode → Full Mode への強制エスカレート条件（複数カテゴリ混在 / 新規ドメインファイル / API 契約変更）。安全側の default は全 `true` |
| `protectedFiles.exclude` | デフォルト保護対象（`package.json`, `tsconfig.json`, `biome.json` 等）から除外したいファイル |
| `paths.designDocs` / `paths.inceptionDocs` / `paths.principlesDocs` / `paths.folderRulesDoc` | PhaseGate が参照・配置する設計/原則/配置ルール文書の場所。`docs/` 以外の既存規約にもマッピング可能 |
| `baseline.enabled` | 既存リポジトリ導入時の retrofit grandfather。default `true`。`npx phasegate baseline` で snapshot 生成 |
| `phaseDependencies.storyReflection` | inception 設計が product docs に反映されるまで `src/{unit}/` への書き込みをブロック |

詳細: [Configuration Guide](docs/guide/configuration.md)

---

## CLI 主要コマンド

```bash
npx phasegate <command> [options]
```

| コマンド | 説明 |
|---|---|
| `init --name <name>` | 新規プロジェクト向け legacy bootstrap（skills/config/hooks 配置）。既存 hooks/scripts/CI がある場合は `install` を推奨 |
| `install --dry-run` / `--apply` | 既存設定を保持しながら PhaseGate を構造化 merge し、`.phasegate/manifest.json` を作成 |
| `doctor` | silent / partial installation を診断し、修復 hint を表示（`--json`, `--strict`, `--report-out <path>`） |
| `uninstall --dry-run` / `--apply` | manifest に基づいて PhaseGate 管理ファイル・管理 block を削除し、ユーザー設定は保持 |
| `reconcile --dry-run` / `--apply` | 現在の package template に PhaseGate 管理ファイルを追従し、manifest hash を更新 |
| `update-skills` | `reconcile` の互換 alias |
| `setup:agent --dry-run` / `--apply` | リポジトリの setup 状態を診断し、質問 / risk / rollback / validation 付きの agent-readable な setup plan を生成・適用 |
| `config:plan --intent <intent>` | 安全な設定変更 intent を対象ファイル / コマンド / risk / rollback / validation にマップ |
| `integrity:pin` | 指示搭載ファイルの SHA-256 manifest（`phasegate.integrity.json`）を生成 / 更新（意図的変更を記録。`--dry-run`, `--json`） |
| `integrity:verify` | manifest と実ファイルを照合。drift 検出時は exit 2、クリーン時は exit 0（`--json`）。ローカルは advisory、CI が authoritative |
| `world:inspect` | 決定的な read-only World snapshot を構築・表示（`--format human\|json`, `--json`）。抽出 diagnostics があれば exit 1 |
| `world:pin --constraint <id> --endpoint <claimant\|premise>` | 制約端点の digest をプレビュー。`--apply` で `phasegate.world-constraints.json` を atomic に更新 |
| `world:derive` | World 制約評価から obligation report を再導出（`--write` で `.harness/world-obligations.json` へ永続化、`--out <path>`, `--json`）。blocking obligation で exit 1、未知 schema 等の契約エラーで exit 2 |
| `lint` | L1 Biome AST チェック |
| `validate --layer <L1\|L2\|L3\|L4\|all>` | 指定レイヤーのバリデータ実行（`--format human\|agent\|ci`） |
| `ci-check` | CI フルチェック（L2-L4）。`--quick` で Quick Mode |
| `check-change-category --paths <csv>` | 変更ファイルを Quick Mode カテゴリに分類、Full Mode 強制が必要かを返す |
| `baseline` | retrofit grandfather snapshot 生成（`--dry-run`, `--force`, `--paths <glob>`, `--json`） |
| `scaffold-design --unit <id> --phase <logical\|domain\|uiux\|unit-test\|it-test>` | 最小構成の設計文書を `templates/` から生成 |
| `scaffold-wi <unit> <type>` | 次の空き WI 番号で `docs/inception/{unit}/WI-XXX/description.md` を生成 |
| `phasegate:status` | 全体の健全性サマリ |
| `work-items:status --dry-run` / `--apply` | 成果物から WI status を導出し、必要に応じて `description.md` frontmatter を更新。`--apply` は既定で downgrade を拒否し、必要時のみ `--allow-downgrade` を指定 |
| `phasegate:check-phase --unit <id>` | 指定 Unit の現在フェーズ |
| `phasegate:detect-drift` | 設計-コード乖離レポート |
| `migrate work-items --dry-run` / `--apply` | 既存リポジトリの旧 `ISSUE-XXX` / `H{NN}-{NN}` directory を WI 統一レイアウト（`_cross/{WI-XXX}/` / `{unit}/{WI-XXX}/`）へ移行。frontmatter（`type` / `severity` / `legacy_id` / `affects`）を自動注入。冪等。`--json` で CI/スクリプト連携可。詳細: [Work Item Migration](docs/guide/cli-reference.md#work-item-migration) |
| `migrate --schema v3` | `phasegate.config.json` を v3 schema へ昇格（`architecture` キー追加） |
| `ci:generate-template --type <aidlc-gate\|pre-commit\|consistency-check\|agent-context-refresh>` | CI/CD テンプレート生成（`--render` で bundled template を stdout 出力） |
| `ci:auto-refresh-agent-context --dry-run` / `--apply` | AGENTS.md pointer と CLAUDE.md 標準セクションを更新 |
| `refresh-claude-md --dry-run` / `--apply` | user section を保持して CLAUDE.md だけを更新 |
| `p2:check-agent-context` | AGENTS.md / CLAUDE.md の鮮度を検査 |
| `list-errors --layer <L0-L4>` | エラー定義一覧 |
| `hook <pre-tool-use\|post-tool-use\|stop\|session-start\|user-prompt-submit>` | agent hook を起動（stdin から JSON を読む。session-start / user-prompt-submit は JSON context を出力） |
| `pre-commit` | L2 pre-commit バリデータをステージファイルに適用 |
| `bypass:audit --base <ref> [--head <ref>]` | push/CI range に pre-commit validation を再適用し、gate failure に structured bypass evidence を要求 |

完全な CLI Reference: [CLI Reference](docs/guide/cli-reference.md)

---

## Hooks 統合

### Claude Code

`init` が `.claude/settings.json` に以下を配置します。

| Hook | タイミング | 動作 |
|---|---|---|
| **PreToolUse** | Write/Edit/Bash の実行前 | フェーズゲート違反 / 保護ファイル / Bash 経由迂回をブロック。Quick→Full 強制条件のチェックも実行 |
| **PostToolUse** | Write/Edit の実行後 | Biome AST ルールを自動実行、違反を即時フィードバック |
| **Stop** | セッション終了前 | L2-L4 全チェックを実行、グリーンでないと終了を保留 |
| **SessionStart** | セッション開始時 | harness status context を注入。指示ファイル整合性 pin を in-process で照合し、drift 時のみ **warn-only / fail-open** で警告（authoritative な照合は CI） |
| **UserPromptSubmit** | プロンプト送信時 | リポジトリ由来 context を注入。中継するリポジトリ由来テキストを固定のデータ境界フェンスで包み（spotlighting）、指示ではなくデータとして扱わせる |

### Codex CLI

`install --agent codex --apply` で `.codex/hooks.json` を配置します。Codex CLI >= 0.124.0 の native `apply_patch` payload を受理し、全 target を既存 gate へ合流させます。hook definition 更新後は `/hooks` で再 trust が必要です。<!-- @work-item-id WI-384 -->

| 編集経路 | 事前 hard block | commit 時 block |
|---|---|---|
| Bash 書き込み（`sed -i`, `tee`, heredoc, `cat >`） | ✅ PreToolUse(Bash) | ✅ pre-commit |
| Bash 経由 `apply_patch <<'PATCH'` | ✅ PreToolUse(Bash) | ✅ pre-commit |
| Codex ネイティブ `apply_patch` Update/Add/Delete | ✅ PreToolUse(apply_patch) | ✅ pre-commit |

PostToolUse(apply_patch) は既存 lint 経路を実行します。ローカル hook が未 trust / skip の場合に備え、pre-commit と CI を backstop / authoritative re-check として残します。

詳細: [Hooks Integration](docs/guide/hooks-integration.md) ・ [Codex Integration](docs/guide/codex-integration.md)

---

## ドキュメント・ライフサイクル

Phasegate は **「inception で設計を起こし → product に確定させ → src に実装する」** という単方向のデータフローを物理的に強制します。各段階で生成される文書と PhaseGate の振る舞いが対応しています。

### 三階層モデル

```
docs/inception/{unit}/{WI-XXX}/   ← 一時的な計画・設計（WI ごと、流動）
        ↓ 設計成果物の反映（@work-item-id 付きで累積更新）
docs/product/construction/{unit}/  ← 確定設計（Unit ごとの正本、永続）
        ↕ フェーズゲート
scripts/harness/{unit}/(domain|application|infrastructure|presentation)/*.ts
```

### Work Item (WI) の置き場

WI は規模・影響範囲に応じて 3 通りに振り分けます。

| 配置先 | 用途 |
|---|---|
| `docs/inception/_shared/` | 非 WI の横断計画・戦略・調査メモ |
| `docs/inception/_cross/{WI-XXX}/` | 複数 Unit に影響する cross-cutting WI |
| `docs/inception/{unit}/{WI-XXX}/` | 単一 Unit が所有する WI |

> **廃止済み**（v0.104.0 で物理削除）: `docs/inception/issues/`, `docs/inception/{unit}/issues/`, `docs/inception/{unit}/{US-XXX}/`。既存資産は `npx phasegate migrate work-items --apply` で `WI-XXX` へ移行済み。`legacy_id` で旧 ID の grep 互換は維持。

### WI frontmatter（必須）

各 WI の `description.md` 先頭に:

```yaml
---
id: WI-042
type: story | issue | fix | refactor | chore   # 後述
severity: trivial | normal | high
status: drafted | reflected | implemented | tested   # PhaseGate が自動更新
affects: [unit-a, unit-b]                            # cross-unit のみ列挙
legacy_id: ISSUE-XXX | US-XXX | H{NN}-{NN}          # 任意
---
```

L2 metadata validator が frontmatter の妥当性を検証します。

### type による要求成果物の段階化

| `type` | inception 必須 | product 反映 | 用途 |
|---|---|---|---|
| `story` | description + logical_design + domain_model + test 設計 | 全カテゴリ累積 | 新機能 |
| `issue` | description + logical_design + domain_model + 関係 test 設計 | 関係カテゴリ累積 | バグ・仕様不整合 |
| `refactor` | description + logical_design | logical_design 更新 | リファクタ |
| `fix` | description + PR link | 関係カテゴリに `@work-item-id` 追記 | typo・依存更新等 |
| `chore` | description.md 1 行 + PR link | 不要 | 雑用 |

`fix` / `chore` は軽量パスとして提供。formal な story で起票するには重すぎる修正もここで証跡が残せます。

### State Machine

```
DRAFTED (inception 揃う)
  ↓ Phase 0/2 reflection
REFLECTED (product に @work-item-id 反映済み)
  ↓ Phase 3 implementation
IMPLEMENTED (src 実装あり / lint・type・test green)
  ↓ Phase 4 test
TESTED (@work-item-id 付きテストあり / green)
```

`type: chore` は DRAFTED で完結。`type: fix` は DRAFTED → REFLECTED → IMPLEMENTED の簡略パス。`status` は PhaseGate が自動更新します。

`phasegate work-items:status --dry-run` で current status / derived status / reason / next action / structured missing evidence を確認できます。単一 WI に絞る場合は `--id WI-XXX`、CI 風に stale status を検出する場合は `--fail-on-stale`、`description.md` frontmatter の `status:` 行だけを書き戻す場合は `--apply` を指定します。標準 L2 validation は `L2-014 work-item-status-staleness` も実行し、stale WI status を pre-commit / CI の fail signal として扱います。

詳細仕様: [`docs/folder_management_rules.md`](docs/folder_management_rules.md)

---

## 導入後のプロジェクト構造

```
your-project/
├── phasegate.config.json
├── docs/
│   ├── folder_management_rules.md          # WI 仕様の正本（init で配置）
│   ├── principles/                         # 開発原則（init で配置・immutable）
│   ├── inception/                          # AIDLC スキルが生成
│   │   ├── _shared/                        # 横断計画
│   │   ├── _cross/{WI-XXX}/                # cross-unit WI
│   │   └── {unit}/{WI-XXX}/                # Unit 所有 WI
│   ├── product/                            # 確定設計（累積更新）
│   │   ├── product_overview.md
│   │   ├── user_stories.md
│   │   ├── units/{unit}.md
│   │   └── construction/{unit}/
│   │       ├── domain_model.md
│   │       ├── logical_design.md
│   │       └── ...
│   └── ADR/
├── src/                                    # 実装コード（@unit/@layer 必須）
├── .claude/{settings.json, skills/}
├── .codex/{hooks.json, skills/}            # --agent codex|both 時
└── skills/                                 # init で再生成可能
```

推奨 `.gitignore`:

```
node_modules/
skills/            # init で再生成可能
.claude/skills/    # symlink
.codex/skills/     # symlink
dist/
reports/
```

---

## 既知の制約とロードマップ

主要な導入パスはそのまま利用できますが、一部の機能は user 側の配線が必要、または今後の minor release での改善対象です。各 Work Item は `docs/inception/_cross/WI-XXX/description.md` に起票済みです。

| Work Item | 内容 |
|---|---|
| **[WI-128](docs/inception/_cross/WI-128/description.md)** | L4 運用ロールアウトの仕上げ。`doc-freshness` / `pointer-validation` は L4-004 / L4-005 として登録済みで、`p2:*` 互換コマンドも維持。WI-033 は完了済みとして閉じ、残りの scheduling / default / 運用 docs は後続 WI で扱う。@work-item-id WI-128 |

L3 Nyquist Validation の `requirement-test-matrix.json` は `phasegate:generate-matrix` で product docs の受け入れ基準と test metadata から生成できます。`--json` では missing tests / orphan tests / preserved references / intent coverage warnings を確認できます。

---

## ドキュメント

- [Installation](docs/guide/installation.md) — 詳細インストール手順
- [Getting Started](docs/guide/getting-started.md) — 初回 / 日常 / CI / agent 利用の各パス
- [Configuration](docs/guide/configuration.md) — `phasegate.config.json` 完全リファレンス
- [CLI Reference](docs/guide/cli-reference.md) — 全 CLI コマンド・オプション
- [Skills Overview](docs/guide/skills-overview.md) — 29 スキルの実行順序と成果物
- [5-Layer Defense Model](docs/guide/layer-model.md) — L0-L4 詳細・HarnessError 形式
- [Hooks Integration](docs/guide/hooks-integration.md) — Claude Code Hooks 設定
- [Codex Integration](docs/guide/codex-integration.md) — Codex CLI セットアップ・カバレッジ
- [Grok Integration](docs/guide/grok-integration.md) — Claude 互換 hook、payload 対応、trust 確認
- [Antigravity Integration](docs/guide/antigravity-integration.md) — `agy` CLI named hook、payload 対応、IDE / desktop 境界
- [Quick Mode vs Full Mode](docs/guide/quick-vs-full-mode.md) — `/story-implementor` vs `/quick-implementor`
- [Retrofit Adoption Guide](docs/guide/retrofit-adoption.md) — 既存リポジトリへの段階的導入
- [Preset Selection Guide](docs/guide/preset-selection.md) — 3 系統の preset 選定

phasegate 自体の開発: [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md)

---

## ライセンス

[MIT License](LICENSE)

---

*Last updated: 2026-07-17 — v0.254.0*

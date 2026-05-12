---
id: WI-086
type: fix
severity: high
status: implemented
affects: [agent-integration, config-foundation, quick-mode, setup, docs]
github_issue: https://github.com/junpei-9898/phasegate/issues/2
reporter: junpei-9898
related: [WI-087]
---

# WI-086: モノレポ構成で hooks 設定がスッと通らず、Write/Edit 違反もブロックされない

> 起票日: 2026-05-07
> 起票経緯: GitHub Issue #2（外部レポーター junpei-9898, 2026-05-07）
> 関連: GitHub Issue [#2](https://github.com/junpei-9898/phasegate/issues/2)、WI-087（同種 DX issue・別レポーター nakataj-mti）

## 背景

phasegate v0.112.0 をモノレポ構成プロジェクトに導入したレポーターから、
PreToolUse / PostToolUse hook の前提設定がデフォルトでは無効化される件と、
hook を有効化しても Claude Code セッション中の実 Write 呼び出しがブロック
されない件が報告された。

WI-087（GitHub Issue #3, nakataj-mti）と独立して報告されており、
**finding #1（targetDirs / formatter デフォルト）** は完全に重複する。
Quick Mode の silent allow 仕様（WI-087 finding #3）と Stop hook の
exit code 仕様（WI-087 finding #4）も背景としては重なる。

## 環境（レポーター報告）

- phasegate: v0.112.0
- OS: macOS (Darwin 24.1.0)
- Claude Code: PreToolUse / PostToolUse hooks 経由で発火
- リポジトリ構成: モノレポ
  - `atomica-irori/hosting/src/`
  - `atomica-irori/functions/src/`
  - `atomica-irori/engine/src/`
  - `atomica-irori-test/src/`

## 再現手順（レポーター報告）

1. `.claude/settings.json` に PreToolUse / PostToolUse hook として
   `npx phasegate hook pre-tool-use` / `npx phasegate hook post-tool-use` を登録
2. `phasegate.config.json` はデフォルト (preset: standard)
3. 違反コード（`@unit` / `@layer` 欠落、`any` 型乱用）を含む TS ファイルを
   `atomica-irori/hosting/src/` 配下に Write
4. ブロックされず、ファイルが書き込まれる

## 期待挙動

L1-001 / L1-002 / L1-005 違反を検出し、Write 操作をブロックまたは
セッションにエラー通知が伝播する。

## 実挙動（レポーター報告）

- `pre-tool-use`: 手動で違反 JSON を流しても EXIT=0（ブロック判定なし）
  ```bash
  echo '{"tool_name":"Write","tool_input":{"file_path":"...src/x.ts","content":"export function bad(x: any): any { return x as any; }"}}' \
    | npx phasegate hook pre-tool-use
  # → EXIT=0
  ```
- `post-tool-use`: 手動で同じ入力を流すと `Lint失敗 (exitCode=1)` で EXIT=1
  しかし Claude Code セッション内で実際に Write した直後の post-tool-use
  発火では何も通知されない（無音）

## 設定面の問題（レポーター報告）

- `phasegate.config.json` が v2 schema 扱いで起動時に warning が出る
  （migrate コマンド案内はあるが、初期化時に v3 で生成すべき）
- モノレポ構成で `targetDirs` に相当する設定をユーザーが明示しないと、
  PROJECT_ROOT 直下の `src/` のみが対象になり、サブパッケージの
  `src/` が完全に対象外となる

## 再検証結果（grep ベース、2026-05-07）

### 1. `targetDirs: ["src"]` 単一固定（WI-087 finding #1 と重複）

`templates/.claude/scripts/hook-config.json:1-5`

```json
{
  "targetDirs": ["src"],
  "formatter": "biome",
  "formatterArgs": ["check", "--write"]
}
```

- `phasegate init` がデプロイするデフォルトの `targetDirs` は `["src"]`
  リテラルのみ。モノレポの `pkg/<workspace>/src/` には一切マッチしない
- `analyze-errors-hook.sh:55-60` / `format-typescript-hook.sh:54-60` は
  `target_dir/` プレフィックス前方一致でフィルタリングしているため、
  PROJECT_ROOT 直下の `src/` 以外は **silent exit 0**

### 2. v2 schema warning が `phasegate init` 直後でも出る（要再現）

`scripts/harness/main.ts:388`

```ts
if (result.schemaVersion === "v2") {
  emitV2SchemaWarningOnce(result.sourcePath);
}
```

`init` で生成される `phasegate.config.json` テンプレートが v2 のまま
だと、新規プロジェクトで毎回 warning が出る。テンプレートが v3 に
追従しているかどうかは要確認（init 経路の dogfood が必要）。

### 3. `pre-tool-use` が違反 Write をブロックしない経路の特定

`scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts:144-151`

```ts
const output = await useCase.execute({ toolName: effectiveToolName, targetFilePaths });

if (output.shouldBlock) {
  ...
  process.exit(2);
}

process.exit(0);
```

`HandlePreToolUseUseCase` は L1 違反（`@unit` / `@layer` 欠落 / `any` 乱用）
を **検査していない**。pre-tool-use hook は **フェーズゲート保護 +
Quick Mode カテゴリ判定** のみで、L1 lint は post-tool-use 側に分離
されている。レポーターの期待「L1-001 / L1-002 / L1-005 を pre で
ブロックする」は現行設計と仕様乖離。

### 4. post-tool-use の stderr / exit code 伝播

`templates/.claude/scripts/analyze-errors-hook.sh:118-123` は decision JSON を
stdout に出力するが、hook 起動時の `mapfile`（WI-087 finding #2）で
配列が空になり exit 0 で抜けるため、**そもそも JSON 出力に到達して
いない**。Claude Code 側は decision を受け取れず、警告も block も
発火しない。WI-087 finding #2 を fix することで本件の症状の大部分が
解消する見込み。

## 本 WI でやること

WI-087 と統合して扱う方針も検討対象（同一カテゴリの DX issue が
2 件のため）。ただし以下の追加スコープが本 WI 固有:

### Phase 1: 方針確定（要 ADR or 軽量決議）

- (A) WI-087 と統合し 1 本の "init-experience" WI に集約する
- (B) 本 WI を独立で残し、`pre-tool-use` の L1 ブロック仕様を
  別 ADR（pre vs post 責務境界）として切り出す

phasegate チーム推奨: **(A) で WI-087 と統合**。`pre-tool-use` の
L1 ブロックは本来の hook 責務分離（pre = フェーズゲート / post = lint）
を破壊するため、レポーター期待を仕様明示で吸収する方針が妥当。

### Phase 2: 設計

WI-087 の設計に統合。固有スコープ:

1. `phasegate init` が **モノレポを検出** した場合の `targetDirs` 自動推論
   ロジック（package.json の `workspaces` / `pnpm-workspace.yaml` /
   `lerna.json` を読む）
2. v2 → v3 schema migration を `phasegate init` の初期生成側で先行適用
   （新規プロジェクトで warning が出ない初期値）
3. `pre-tool-use` の責務をドキュメント化（"pre は L1 lint をやらない"
   という設計意図を `docs/guide/agent-integration.md` に明記）

### Phase 3: 実装

1. 監修済み設計に従い、WI-087 と同一 PR で実施
2. `phasegate init` のテンプレート生成に schema v3 を強制
3. workspaces 自動検出ロジック追加（pnpm / yarn / npm / lerna 対応）
4. `docs/guide/agent-integration.md` の "Hook 責務一覧" セクションに
   pre-tool-use が L1 違反検出を行わない旨を明記

### Phase 4: ドキュメント整合

1. `docs/guide/quickstart.md`（モノレポ向け追記）
2. `CHANGELOG` に GitHub Issue #2 参照付きで記載

### Phase 5: リリース

1. minor バージョン bump（WI-087 と同一リリースで集約）
2. `npm publish --auth-type=web`
3. GitHub Issue #2 にリリース版コメント + close

## 受け入れ基準

- [x] `phasegate init` がモノレポを検出した場合、`targetDirs` を
      ワークスペースのソースディレクトリ配列で生成する
- [x] `phasegate init` 直後の新規プロジェクトで v2 schema warning が
      発生しない（テンプレートが v3 で生成される）
- [x] `pre-tool-use` hook の責務が `docs/guide/hooks-integration.md` に
      明記され、L1 lint は post 側で実行される設計意図がレポーター視点
      でも理解できる
- [x] WI-087 finding #2（`mapfile` 互換性）の修正により、モノレポ環境で
      違反 Write 後に block decision JSON が Claude Code に伝播する
- [x] CHANGELOG に GitHub Issue #2 参照付きで記載される
- [x] GitHub Issue #2 にリリース版コメント + close 完了

## スコープ外

- L1 lint を pre-tool-use 側でも実行する設計変更（責務分離破壊のため
  別 ADR で別途検討）
- monorepo 検出ロジックの非標準ワークスペース対応（Bazel / Buck 等）
- レポーター環境固有の Claude Code バージョン依存挙動（Claude Code 側の
  hook spec 変更が原因の場合は upstream 報告へ転送）

## 関連

- `templates/.claude/scripts/hook-config.json:1-5`（`targetDirs` デフォルト）
- `templates/.claude/scripts/analyze-errors-hook.sh:18-22`（`mapfile` 経由の
  config 読み込み — WI-087 finding #2 と同一）
- `templates/.claude/scripts/format-typescript-hook.sh:20-22`（同上）
- `scripts/harness/main.ts:384-405`（v2 schema warning emit）
- `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts:144-151`
  （pre-tool-use の責務範囲）
- `docs/guide/agent-integration.md`（hook 責務分離のドキュメント化先）
- WI-087 (`docs/inception/_cross/WI-087/description.md`) — 同種 DX issue
- GitHub Issue [#2](https://github.com/junpei-9898/phasegate/issues/2)

## 参考

- レポーターの v0.112.0 環境での再現手順は GitHub Issue #2 本文を参照
- Claude Code Hooks 仕様: https://code.claude.com/docs/en/hooks
  （PreToolUse は exit code 2 で block）

## 進捗ログ

### v0.119.0 — 2026-05-07

WI-087 Phase A（`mapfile` bash 4+ 依存修正）により、本 issue がレポートしていた
「post-tool-use がセッション中に呼ばれても通知されない（無音）」症状の主因が解消。
詳細は WI-087 進捗ログ Phase A を参照。

### v0.120.0 — 2026-05-07

WI-087 Phase B との統合対応で finding #1（モノレポ構成で `targetDirs` がサブパッケージ
配下を捕捉できない）と「v2 schema warning が `phasegate init` 直後でも出る」を解消:

- `phasegate init` がモノレポ workspace 定義（pnpm-workspace.yaml / package.json
  workspaces / lerna.json）を検出し `targetDirs` を自動生成
- `phasegate.config.json` テンプレートに `architecture: { preset: "clean" }` を追加し
  schemaVersion = 'v3' で生成 → v2 warning 解消

### v0.121.0 — 2026-05-07

WI-087 Phase C-1 との統合対応で「pre-tool-use の責務範囲明文化」を解消:

- `docs/guide/hooks-integration.md` に "Responsibility Separation" セクションを追加し、
  pre = フェーズゲート / post = lint / Stop = complete-check の責務分担表を明記
- 「pre-tool-use は意図的に lint を実行しない (lint は書き込み後の content が必要)」旨を
  ユーザー視点で明文化。レポーター期待「pre で違反 Write を exit 2 でブロックしてほしい」が
  現行設計と乖離する理由を、責務分離の必然性として説明

これにより、本 issue の主要 4 症状はすべて修正完了 (post-tool-use silent no-op /
v2 schema warning / モノレポ targetDirs / 責務範囲ドキュメント)。pre-tool-use の
L1 lint 拡張は別 ADR で検討する方針 (本 issue のスコープ外)。

### v0.138.1 監査 — 2026-05-09

WI-087 の Phase A/B/C-1/C-2 進捗ログ、CHANGELOG、実装ファイル、回帰テストを再確認し、
WI-086 のリポジトリ内スコープは完了済みと判定。GitHub Issue #2 は `gh issue view` で
`CLOSED` を確認済み。

dogfood: 一時 pnpm workspaces プロジェクトで `phasegate init --yes --agent claude --skills core` を実行し、
`hook-config.json` が `targetDirs: [pkg/core/src, services/api/src]` と `formatter: eslint-prettier` を
生成すること、`phasegate.config.json` に `architecture.preset: clean` が入ること、hook script が
`/bin/bash` で `mapfile` エラーなく起動することを確認した。

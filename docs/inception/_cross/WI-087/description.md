---
id: WI-087
type: fix
severity: high
status: drafted
affects: [agent-integration, config-foundation, quick-mode, setup, docs]
github_issue: https://github.com/junpei-9898/phasegate/issues/3
reporter: nakataj-mti
related: [WI-086]
---

# WI-087: phasegate init: deployed hook scripts and config defaults don't fit real-world projects (monorepo, formatter detection, bash 3.2)

> 起票日: 2026-05-07
> 起票経緯: GitHub Issue #3（外部レポーター nakataj-mti, 2026-05-07）
> 関連: GitHub Issue [#3](https://github.com/junpei-9898/phasegate/issues/3)、WI-086（同種 DX issue・別レポーター junpei-9898）

## 背景

`phasegate init` を TypeScript pnpm モノレポで実行した結果、
`.claude/scripts/` 配下にデプロイされた PostToolUse hook スクリプト群が
**独立した 2 つの理由で silent no-op** になることが報告された。
ユーザーは harness が active と思い込むが、format / lint / type-check
guard は一切走らない。

これは単一バグではなく、デフォルト値とデプロイ資産の portability に
関わる **DX issue クラスタ**。WI-086（GitHub Issue #2, junpei-9898）と
独立して報告されているが、findings の **#1（targetDirs / formatter
デフォルト）** は完全に重複しており、本 WI で WI-086 の対応も統合する
方針を推奨する。

## 環境（レポーター報告）

- phasegate: `0.112.0`
- preset: `standard`, architecture: `clean`
- OS: macOS (Darwin 25.x), default `/bin/bash` is **3.2.57**
- Project: pnpm monorepo, workspaces under `pkg/*`, `services/*`, `tools/*`
- Formatter: `prettier` (+ `eslint`). No `biome` in deps.

## 再現手順（レポーター報告）

1. `npx phasegate init` on a pnpm monorepo with `prettier` + `eslint` in devDependencies
2. `cat .claude/scripts/hook-config.json` → `targetDirs: ["src"]`, `formatter: "biome"`
3. Edit any TS file under `pkg/<workspace>/src/`. Note no biome/tsc output, no prettier formatting
4. Run `bash .claude/scripts/format-typescript-hook.sh` directly with stdin → `mapfile: command not found` on macOS
5. Test `pre-tool-use` with `pkg/domain/x.ts` (blocks, exit 2) vs. `pkg/usecase/x.ts` (passes silently, exit 0)

## 再検証結果（grep ベース、2026-05-07）

レポーターの 4 findings をすべて再検証し、**4 件すべて再現**を確認した。

### Finding #1: `.claude/scripts/hook-config.json` defaults assume a single-package layout

`templates/.claude/scripts/hook-config.json:1-5`

```json
{
  "targetDirs": ["src"],
  "formatter": "biome",
  "formatterArgs": ["check", "--write"]
}
```

- `targetDirs: ["src"]` リテラル固定。pnpm / yarn / lerna の workspaces を
  読まない
- `formatter: "biome"` ハードコード。`@biomejs/biome` が devDependencies に
  存在しない場合、`npx @biomejs/biome` で **registry から都度 pull**（slow、
  かつ既存 prettier config と競合）

**Suggestion (レポーター)**: `init` 時に `package.json` を読む
- `workspaces` があれば workspace パターンから `targetDirs` を生成
- なければソースディレクトリを実検出（リテラル `"src"` ではなく）
- `devDependencies` から formatter 検出: `@biomejs/biome` → `biome`、
  `prettier` → `eslint-prettier`、それ以外 → `null`（明示 opt-in）

> 本 finding は WI-086 finding #1 と完全に同一。統合対応する。

### Finding #2: Hook scripts use `mapfile` (bash 4+), broken on macOS default `/bin/bash` 3.2

`templates/.claude/scripts/format-typescript-hook.sh:20-22` と
`templates/.claude/scripts/analyze-errors-hook.sh:18`

```bash
mapfile -t TARGET_DIRS < <(jq -r '.targetDirs[]' "$CONFIG_FILE" 2>/dev/null)
```

- macOS `/bin/bash` は bash 3.2 系で `mapfile` builtin **非対応**
- shebang は `#!/bin/bash`（`templates/.claude/scripts/format-typescript-hook.sh:1`）
- 結果: `mapfile: command not found` → `TARGET_DIRS=()` のまま →
  `${#TARGET_DIRS[@]} -eq 0` 判定で **silent exit 0**
- ユーザーには何も表示されず、hook が deliberately quiet と誤認される

**Suggestion (レポーター)**: portable な while-read idiom に置換

```bash
TARGET_DIRS=()
while IFS= read -r line; do
    [[ -n "$line" ]] && TARGET_DIRS+=("$line")
done < <(jq -r '.targetDirs[]' "$CONFIG_FILE" 2>/dev/null)
```

または shebang を `#!/usr/bin/env bash` に変更し bash 4+ を要件として
ドキュメント化（`brew install bash`）。**portable rewrite が望ましい**
（追加インストール不要、attack surface も小さい）。

### Finding #3: Quick Mode pre-tool-use guard scope is surprising

Quick Mode 中（`story-implementor` セッション非アクティブ時）、
`npx phasegate hook pre-tool-use` は `domain` カテゴリ（例: `pkg/domain/**`）
書き込みのみブロックする。`pkg/usecase`, `pkg/infra`, `services/**`,
`tools/**`, `docs/**` への書き込みは **silent pass-through**（exit 0）。

`scripts/harness/quick-mode/infrastructure/adapters/harness-config-quick-mode-config-adapter.ts:27`

```ts
allowedCategories: ['bugfix', 'docs', 'test', 'config'],
```

仕様上は意図された挙動（rule string `MIXED_CHANGES`、message:
"Full mode 必須変更が検出されました ... allowedCategories外のファイルが
含まれています"）だが、初見ユーザーが任意 edit で hook を試すと
"hook が走っていない" と結論する。

**Suggestion (レポーター)**:
- Quick Mode で write が allow される際、stderr に 1 行 notice を出す
  (`phasegate: write allowed (Quick Mode, category=usecase)`)。exit 0 維持で
  semantics は不変だが visibility が上がる
- または `phasegate init` 出力に "In Quick Mode, only `<categories>` writes
  are blocked; ..." セクションを追加

### Finding #4: `phasegate hook stop` exits 0 even when Complete Check fails

```
$ echo '{"session_id":"...","cwd":"..."}' | npx phasegate hook stop
Complete Check失敗 (exitCode=1)
echo $?  # → 0
```

`scripts/harness/agent-integration/presentation/stop-hook.ts:89-94`

```ts
if (output.executed && output.cliResult) {
  if (output.cliResult.exitCode !== 0) {
    process.stderr.write(`Complete Check失敗 (exitCode=${output.cliResult.exitCode})\n`);
  }
  process.exit(output.cliResult.exitCode);
}
```

実装上は `output.cliResult.exitCode`（例: 1）で exit するが、Claude Code
の Stop hook 仕様では **exit 2** が turn block の条件。exit 1 だと
warning が transcript に出るだけで hard gate にならない。

**Suggestion (レポーター)**: `--enforce` flag (or config flag) で
Complete Check 失敗時に exit 2 + `permissionDecision: "deny"` JSON を
返すモードを追加。default off、strict mode として opt-in 可能に。

## 本 WI でやること

### Phase 1: 方針確定（要 ADR）

レポーターは findings を A/B/C 3 グループに分類している:

- **(A) Highest impact**: portable bash in deployed hook scripts（finding #2）
- **(B) High DX win**: smarter defaults from `package.json` detection（finding #1）
- **(C) Documentation**: Quick Mode guard scope（finding #3）と Stop hook
  semantics（finding #4）の明確化

phasegate チーム推奨は **A → B → C の順で全件対応**。理由:

1. (A) は 1 行 fix でクラス全体の silent failure を解消、無条件で merge 可
2. (B) は monorepo（業界標準）への対応がないと OSS としての一次採用に届かない
3. (C) のうち #4（Stop hook exit code）は `--enforce` opt-in 方式で
   後方互換維持しつつ "本気で gate したいチーム" を救える

ADR を 1 本起票し、(A)/(B)/(C) の採用方針 + 後方互換戦略を確定する。
WI-086 のスコープを本 ADR に統合する。

### Phase 2: 設計（`logical-designer` 推奨）

1. `templates/.claude/scripts/*.sh` の bash 3.2 互換化（`mapfile` 撤廃、
   shebang は `#!/bin/bash` 維持で macOS box そのまま動作）
2. `phasegate init` の `package.json` 検出ロジック設計
   - workspaces 検出: pnpm-workspace.yaml / package.json `workspaces`
     / lerna.json 順
   - formatter 検出: `devDependencies` から `@biomejs/biome` →
     `prettier` → null の優先順位
3. Quick Mode 通過時の stderr notice（informational、exit 0 不変）
4. Stop hook の `--enforce` flag 仕様
   - phasegate.config.json `agentIntegration.stopHook.enforce: boolean`
   - true なら Complete Check 失敗で exit 2 + decision JSON
   - false（default）なら現行挙動

### Phase 3: 実装（`story-implementor` or `quick-implementor`）

- finding #2（bash 3.2 互換化）は単独 PR で `quick-implementor` 可
- finding #1（`init` 自動検出）は新ロジック追加のため `story-implementor`
- finding #3（Quick Mode notice）は単独 PR で `quick-implementor` 可
- finding #4（Stop hook enforce）は config 拡張 + 仕様変更のため
  `story-implementor`

### Phase 4: ドキュメント整合

1. `docs/guide/quickstart.md`: monorepo セクション追加
2. `docs/guide/configuration.md`: `agentIntegration.stopHook.enforce`
   追記
3. `docs/guide/agent-integration.md`: Quick Mode の category gating
   仕様を「ユーザーが最初に踏むケース」目線で明文化
4. CHANGELOG に GitHub Issue #2 / #3 参照付きで記載

### Phase 5: リリース

1. minor バージョン bump
2. `npm publish --auth-type=web`
3. GitHub Issue #2 / #3 双方にリリース版コメント + close
4. **dogfood 必須**: monorepo（pnpm workspaces）構成のサンプルプロジェクト
   で `npx phasegate init` → hook 動作確認 → publish の順
   （memory `feedback_dogfood_before_release.md` 適用）

## 受け入れ基準

- [ ] `templates/.claude/scripts/format-typescript-hook.sh` /
      `analyze-errors-hook.sh` から `mapfile` が消え、bash 3.2 で動作する
- [ ] macOS 標準 `/bin/bash` 3.2.57 で hook scripts を直接実行しても
      `mapfile: command not found` が出ない
- [ ] `phasegate init` がモノレポを検出した場合、`targetDirs` を
      ワークスペースのソースディレクトリ配列で生成する
- [ ] `phasegate init` が `devDependencies` から formatter を検出し、
      `biome` 不在環境では `eslint-prettier` を自動採用する
- [ ] Quick Mode で書き込み許可時、stderr に 1 行 notice が出る
      （exit code は 0 のまま、semantics 不変）
- [ ] `agentIntegration.stopHook.enforce: true` で Complete Check 失敗時に
      exit 2 + decision JSON `"deny"` が返る
- [ ] default（`enforce: false`）では現行挙動を維持（後方互換）
- [ ] dogfood: pnpm workspaces サンプルで `npx phasegate init` → hook 動作
      → リリースの順を踏む
- [ ] CHANGELOG に GitHub Issue #2 / #3 参照付きで記載
- [ ] GitHub Issue #2 / #3 にリリース版コメント + close 完了

## スコープ外

- Bazel / Buck / Pants など非標準モノレポツールの workspace 自動検出
- L1 lint を `pre-tool-use` 側でも走らせる設計変更
  （責務分離破壊のため別 ADR で検討）
- Stop hook の deny 理由を Claude Code セッションログに永続化する仕組み
- `phasegate hook stop --enforce` の per-skill / per-error code 切り替え
  （初版は boolean のみ）

## 関連

- `templates/.claude/scripts/hook-config.json:1-5`（finding #1）
- `templates/.claude/scripts/format-typescript-hook.sh:20-22`（finding #2）
- `templates/.claude/scripts/analyze-errors-hook.sh:18`（finding #2）
- `scripts/harness/quick-mode/infrastructure/adapters/harness-config-quick-mode-config-adapter.ts:27`
  （finding #3, allowedCategories デフォルト）
- `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts:144-153`
  （finding #3, exit 0 経路）
- `scripts/harness/agent-integration/presentation/stop-hook.ts:89-94`
  （finding #4, exit code 伝播）
- WI-086 (`docs/inception/_cross/WI-086/description.md`) — 同種 DX issue
- GitHub Issue [#3](https://github.com/junpei-9898/phasegate/issues/3)

## 参考

- 起票者の v0.112.0 環境での再現手順は GitHub Issue #3 本文を参照
- レポーターから「(A) と (B) は PR 送付の意思あり」との表明あり。
  受け入れ準備が整い次第 contribution の打診をしてもよい
- Node.js: [child_process](https://nodejs.org/api/child_process.html)
- Claude Code Hooks 仕様: https://code.claude.com/docs/en/hooks

## 進捗ログ

### Phase A 完了（v0.119.0）— 2026-05-07

finding #2（`mapfile` bash 4+ 依存）を修正:

- `templates/.claude/scripts/format-typescript-hook.sh` 2 箇所、
  `templates/.claude/scripts/analyze-errors-hook.sh` 1 箇所の `mapfile -t ARRAY < <(...)` を
  `while IFS= read -r line; do ARRAY+=("$line"); done < <(...)` に置換
- shebang は `#!/bin/bash` のまま維持（bash 3.2 互換のため）
- macOS bash 3.2.57 で動作確認済 — `targetDirs` 配列が正しくロードされ、
  対象ディレクトリ下のファイルに対して format / lint decision JSON が
  Claude Code に返ることを確認
- WI-086（Issue #2）の "post-tool-use silent no-op" 症状の主因も同じ `mapfile`
  だったため、本修正で副次的に解消

スコープ外（次回以降のリリースで対応）:
- Phase B: finding #1（`phasegate init` の monorepo 検出 / formatter 検出）
- Phase C: finding #3（Quick Mode notice）/ finding #4（Stop hook `--enforce` flag）

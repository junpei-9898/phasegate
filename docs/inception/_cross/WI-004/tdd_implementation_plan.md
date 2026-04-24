# TDD実装計画: ISSUE-004 Phase B（CLI サブコマンド化）

## 1. スコープ

### 対象ISSUE
[WI-004](./description.md) Phase B「CLI サブコマンド化（中期）」

### 受け入れ基準
- 他PJ（`node_modules/phasegate/...` レイアウト）と phasegate 自身（`scripts/harness/...` レイアウト）の**両方**で hook が同一コマンドで起動できる
- `templates/.claude/settings.json` から `npx tsx node_modules/phasegate/...` のような実装詳細パスが消え、`npx phasegate hook pre-tool-use` のような安定 CLI 経由になる
- 12 スキルの `scripts/delegate-sonnet.sh` 直接参照が `npx phasegate delegate-sonnet` に統一される
- 既存の `pnpm test`（2997 件）がすべてグリーン
- 新規 IT テストで CLI ディスパッチを検証

### 影響する層・Unit
| Unit | 層 | 変更内容 |
|---|---|---|
| harness-api | presentation | `bin/phasegate` 配下の `main.ts` に `hook` / `pre-commit` / `delegate-sonnet` ケース追加 |
| agent-integration | presentation（既存活用） | `presentation/pre-tool-use-hook.ts` 等は変更なし。CLI から動的 import で起動 |
| skill-quality | スキル本文 | 12 スキル SKILL.md の `scripts/delegate-sonnet.sh` 文字列を `npx phasegate delegate-sonnet` に置換 |
| (templates) | テンプレ | `.claude/settings.json` と `.husky/pre-commit` を CLI 呼び出し形式に書き換え |

---

## 2. 前提条件検証

- `implementation-readiness-checker` 実行日時: 2026-04-17（直前セッションで完了）
- 判定結果: ✅ 実装準備完了（agent-integration / harness-api / skill-quality 全 Unit に必須設計文書あり）

### Phase B の特殊性
本 Phase は新規 US ではなく **既起票 ISSUE-004 を設計根拠とする横断改修**。`logical_design.md` への追記は行わず、本計画ファイルが設計兼実装計画を兼ねる（ユーザー承認済み方針）。

---

## 3. 設計判断

### 3.1 ディスパッチ方式: 動的 import 方式を採用

**選択肢:**
- (A) 子プロセス spawn（`tsx <hook-path>`）
- (B) 動的 import（`await import('...hook.js')`）

**採用: (B) 動的 import**

**理由:**
1. `main.ts` 自体が既に tsx 配下で実行されているため、import は同一プロセスで動く
2. hook TS ファイルは module-load 時に `main()` を実行し最終的に `process.exit()` するため、import の完了を待たずに hook の終了コードがそのまま phasegate プロセスの終了コードになる（hook の意図通り）
3. 子プロセス起動のオーバーヘッド（〜100ms）を回避
4. パス解決が `harnessRoot` 起点の単一の `join()` で完結し、cwd に依存しない（=ISSUE-004 P0-1 の本質的解決）

**例外: `delegate-sonnet` のみ spawn**
- `delegate-sonnet.sh` は bash スクリプトなので動的 import 不可
- `child_process.spawn('bash', [scriptPath, ...args], { stdio: 'inherit' })` で透過的にラップする
- 終了コードと stdout/stderr をそのまま伝播

### 3.2 サブコマンド命名

| 既存テンプレ呼び出し | 新サブコマンド |
|---|---|
| `npx tsx scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts` | `npx phasegate hook pre-tool-use` |
| 同上 post-tool-use | `npx phasegate hook post-tool-use` |
| 同上 stop | `npx phasegate hook stop` |
| `npx tsx scripts/harness/integrations/pre-commit.ts` | `npx phasegate pre-commit` |
| `bash scripts/delegate-sonnet.sh ...args` | `npx phasegate delegate-sonnet ...args` |

`hook` をサブコマンド階層化することで将来追加（`hook session-start` 等）への拡張余地を残す。

### 3.3 パス解決戦略

`main.ts` の既存 `getHarnessRoot()`（L41-43）を流用。
- `process.argv[1]` = main.ts の絶対パス
- `harnessRoot` = main.ts の 2 階層上 = パッケージルート
- 他PJ から `npx phasegate` で起動された場合、`process.argv[1]` は `node_modules/phasegate/scripts/harness/main.ts` を指すため、`harnessRoot` は `node_modules/phasegate` に正しく解決される
- phasegate 自身からの `pnpm run phasegate` 呼び出しでは `harnessRoot` は repo ルートに解決される

これにより**単一実装で両環境に対応**できる。

### 3.4 後方互換性

- 既存 `templates/.claude/settings.json` の `npx tsx node_modules/phasegate/...` 形式は v0.34.0 で配布済み。新形式に置換した v0.35.0 以降の `npx phasegate init` で settings.json を再配置するユーザーは新形式を取得する
- 既存の `.claude/settings.json`（init 既存スキップ仕様）は手動更新が必要。CHANGELOG / Migration ノートで案内する
- `scripts/delegate-sonnet.sh` 自体は引き続き出荷（直接呼びの後方互換性維持）

---

## 4. TDD実装順序

### Step 1: ITテスト RED → GREEN（新規 CLI サブコマンド検証）

**テスト追加先:** `scripts/harness/__tests__/it/harness-api/cli-hook-dispatch.it.test.ts`（新規）

| テストケース | RED 期待 | GREEN 実装 |
|---|---|---|
| `phasegate hook pre-tool-use` で stdin JSON を読み取り PreToolUse hook が起動する | `Unknown command: hook` で exit 2 | main.ts に `case 'hook'` 追加 |
| `phasegate hook post-tool-use` 同上 | 同上 | 同上 |
| `phasegate hook stop` 同上 | 同上 | 同上 |
| `phasegate pre-commit` で pre-commit.ts が起動する | `Unknown command: pre-commit` で exit 2 | main.ts に `case 'pre-commit'` 追加 |
| `phasegate delegate-sonnet --dry-run --prompt "test" --output /tmp/x` でラッパーが正常終了 | `Unknown command: delegate-sonnet` で exit 2 | main.ts に `case 'delegate-sonnet'` 追加 |
| `phasegate hook` （サブコマンド未指定）で usage と exit 2 | — | サブコマンドバリデーション |
| `phasegate hook unknown` で usage と exit 2 | — | 同上 |

**実装方針:**
- 各 hook ケースは `await import(join(harnessRoot, 'scripts/harness/agent-integration/presentation/pre-tool-use-hook.js'))` を実行
- `pre-commit` ケースも同様に `integrations/pre-commit.js` を import
- `delegate-sonnet` ケースは `child_process.spawn('bash', [join(harnessRoot, 'scripts/delegate-sonnet.sh'), ...args], { stdio: 'inherit' })`、終了コードを伝播

### Step 2: テンプレート書き換え（テストなし、目視 + 既存テストで検証）

| ファイル | 変更内容 |
|---|---|
| `templates/.claude/settings.json` | 3 つの hook command を `npx phasegate hook X` 形式に置換 |
| `templates/.husky/pre-commit` | `npx tsx scripts/harness/integrations/pre-commit.ts` → `npx phasegate pre-commit` |

`scripts/harness/__tests__/it/setup/skill-deployer-templates.it.test.ts`（既存があれば）で settings.json テンプレの整合性を再確認。なければ既存 `npm pack --dry-run` で配布物を確認する。

### Step 3: 12 スキル本文の置換（一括正規表現置換）

`replace_all: true` の Edit を 12 ファイルに適用：
```
旧: scripts/delegate-sonnet.sh
新: npx phasegate delegate-sonnet
```
すべて Phase 2 の文中表現の置換であり、コード呼び出しではない（スキルが README として AI に読まれる）。

### Step 4: 全テスト実行

```bash
pnpm test
```
2997 件すべてグリーンを期待。新規 IT テスト 7 件追加で 3004 件想定。

### Step 5: README / CHANGELOG 更新

| ファイル | 追記内容 |
|---|---|
| `README.md` / `README.ja.md` | CLI Reference セクションに `hook` / `pre-commit` / `delegate-sonnet` サブコマンド追加 |
| `CHANGELOG.md` | v0.35.0 セクションを新規追加（ISSUE-004 Phase B 完了、settings.json 形式変更の Migration ノート含む） |

---

## 5. Codex 委任プロンプト（Phase 2 用）

### Wave 1: CLI サブコマンド実装 + IT テスト

**プロンプト要旨:**
- 対象ファイル: `scripts/harness/main.ts`（switch 文に 3 ケース追加）
- 新規ファイル: `scripts/harness/__tests__/it/harness-api/cli-hook-dispatch.it.test.ts`
- 触らないファイル: それ以外すべて
- スコープ違反禁止: `docs/` 配下に新規ファイルを作るな（過去の Codex 違反パターン）

### Wave 2: テンプレート + 12 スキル + ドキュメント

メインセッション（Opus）が直接実施（機械的置換のため Codex 委任不要）。

---

## 6. 環境検証チェックリスト

### 事前検証（実装前に実行）
- [x] `pnpm test` がベースライン（2997 件）でグリーン
- [x] `bin/phasegate` が repo ルートから正常起動（`npx phasegate --version` で確認）
- [x] `scripts/harness/agent-integration/presentation/{pre,post,stop}-tool-use-hook.ts` 存在確認
- [x] `scripts/harness/integrations/pre-commit.ts` 存在確認
- [x] `scripts/delegate-sonnet.sh` 存在確認

### 事後検証（実装後に実行）
- [ ] `pnpm test` 全件グリーン
- [ ] `echo '{"cwd":"/tmp","tool_name":"Read","tool_input":{"file_path":"/tmp/x"}}' | npx phasegate hook pre-tool-use` が exit 0 / 2 のいずれかで終わる（未知のエラーで落ちない）
- [ ] `npx phasegate delegate-sonnet --dry-run --prompt "test" --output /tmp/x` が DRY RUN を表示して exit 0
- [ ] `npx phasegate --help` の usage に新サブコマンドが表示される

---

## 7. QA（不明点・確認事項）

### [Question] Q1: pre-commit.ts は最新スタックと整合しているか？

`scripts/harness/integrations/pre-commit.ts` は `core/config-loader.js` `core/metadata-parser.js` `core/error-reporter.js` をインポートしているが、Clean Architecture 構造の `domain/application/infrastructure/presentation` のいずれにも属さない `core/` ディレクトリは旧構造の遺物の可能性がある。

**推奨案:** Phase B のスコープでは pre-commit.ts の動作には触れず、既存ファイルをそのまま動的 import するだけに留める。pre-commit.ts 自体の Clean Architecture 化は別 ISSUE として切り出す（観察事項として ISSUE-004 に追記）。

[Answer]
✅ 推奨案を採用（2026-04-17 ユーザー承認）。pre-commit.ts は無変更、動的 import のみ。

---

### [Question] Q2: `phasegate hook` のサブコマンド呼び分けは main.ts に直書きでよいか？

CLI 階層（`hook` → `pre-tool-use` 等）を増やすと main.ts のサイズが膨らむ。harness-api Unit の handlers として切り出すべきか？

**推奨案:** 現状 `phasegate:check-ready` 等が main.ts に直書きされているため、整合性のため hook ケースも main.ts 直書きで OK。将来 main.ts のリファクタリング ISSUE で一括して handlers 切り出しを実施する。

[Answer]
✅ 推奨案を採用（2026-04-17 ユーザー承認）。main.ts 直書き。

---

### [Question] Q3: delegate-sonnet の引数は forward で十分か？

`scripts/delegate-sonnet.sh` の `--prompt` `--prompt-file` `--output` `--max-turns` `--dry-run` をそのまま CLI に通す方針。`process.argv.slice(2).filter(a => a !== 'delegate-sonnet')` で配列を渡し、bash 側でパースさせる。CLI 側で再パースする必要はないか？

**推奨案:** 透過 forward で十分。CLI 側パース不要。スコープを広げない。

[Answer]
✅ 推奨案を採用（2026-04-17 ユーザー承認）。透過 forward。

---

### [Question] Q4: `.claude/settings.json` の dev repo 側はどう扱うか？

repo の `.claude/settings.json` は手動メンテされており、template とは別物。template のみ書き換えるが、dev repo の hook 設定も新形式に揃えるか？

**推奨案:** dev repo の `.claude/settings.json` はユーザー判断で別途更新（本 Phase B のスコープ外）。理由: dev repo は `scripts/harness/...` 直接パスでも動く（=不具合がない）ため、緊急性なし。CHANGELOG に「v0.35.0 以降は dev 環境でも `npx phasegate hook X` 形式が推奨」と記載のみ。

[Answer]
✅ 推奨案を採用（2026-04-17 ユーザー承認）。dev repo は本 Phase スコープ外。

---

## 8. 前提条件・リスク

### 前提条件
- 動的 import で `process.exit()` 呼び出しが正しく phasegate プロセスを終了させること（Node.js 標準動作のため信頼可能）
- `tsx` の ESM ローダが import 時に `.js` 拡張子を `.ts` に解決できること（現状全 import が `.js` 表記なので問題なし）
- Codex CLI が main.ts への switch case 追加を `feedback_codex_scope_violations.md` に従って **scripts/ 配下のみ**で完結させること（プロンプトで強調）

### リスク
- **R1**: pre-commit.ts が `core/` 旧構造を参照しているが、これは Phase B のスコープでは触らない（Q1 の方針）。動的 import で動くことだけ確認。
- **R2**: 動的 import を試した結果、hook 内の `process.exit()` が main.ts の早期終了を引き起こすため、main.ts 後段の処理（例: storyReflection サマリー）が走らなくなる。**hook ケースでは早期 return が前提**なので問題なし。
- **R3**: スキル本文置換で `bash scripts/delegate-sonnet.sh` のような完全表現が混じっている場合、`scripts/delegate-sonnet.sh` 単体の置換だけで先頭の `bash` が残る。Grep 結果（先ほど確認）では `\`scripts/delegate-sonnet.sh\` 経由` の文中表現のみだったので、置換結果は自然な日本語になる。ただし将来 Phase 2 実行手順を書く際に `bash` プレフィックスが復活する可能性あり。

---

## 9. ファイル変更サマリー

### 新規
- `scripts/harness/__tests__/it/harness-api/cli-hook-dispatch.it.test.ts`

### 変更
- `scripts/harness/main.ts` — switch 文に 3 ケース（`hook` / `pre-commit` / `delegate-sonnet`）と usage 追記
- `templates/.claude/settings.json` — 3 つの hook command を CLI 形式に
- `templates/.husky/pre-commit` — `npx phasegate pre-commit` に
- `skills/{12 files}/SKILL.md` — `scripts/delegate-sonnet.sh` → `npx phasegate delegate-sonnet`
- `README.md` / `README.ja.md` — CLI Reference 追記
- `CHANGELOG.md` — v0.35.0 セクション追加
- `package.json` — version `0.34.0` → `0.35.0`

### 触らない
- `scripts/harness/agent-integration/presentation/*-hook.ts`
- `scripts/harness/integrations/pre-commit.ts`
- `scripts/delegate-sonnet.sh`
- `docs/` 配下（本計画ファイル除く）
- `.claude/settings.json`（dev repo 側）

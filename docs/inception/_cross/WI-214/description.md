---
id: WI-214
type: issue
severity: normal
status: tested
affects: [config-foundation, agent-integration, setup, documentation]
source: dogfood
---

# WI-214: `paths` 設定の拡張と README への明文化（principles / folder_management_rules / product-wide artifacts）

> 起題日: 2026-05-22
> 起題経緯: WI-213（personal install のコア防御 deploy 漏れ）の調査中に、設計文書群のパスマッピングが部分的にしか提供されておらず、README にも記載が無いことが判明した。WI-213 とは独立した「設定 schema 拡張 + ドキュメント整備」issue として切り出す。
>
> **実行順序**: WI-213 → 本 WI（WI-214）の順で進める。WI-213 で先に personal install の Gap 3（principles / folder_management_rules の local-only 配置）が **暫定的なハードコード（例: `.phasegate-local/principles/` 直書き）** で実装される想定。本 WI はその後 schema 拡張 + ハードコード解消 + ドキュメント整備でリファクタリングする。並行作業による `docs/templates/personal/phasegate-local-config.json` / `setup/skill-deployer.ts` / README.ja の編集衝突を避けるための逐次運用。

## 問題

phasegate は v0.115 以降 `paths.designDocs` / `paths.inceptionDocs` を導入して **設計文書群を `docs/` 配下以外にも置ける** 設計になっているが、現状は **部分的なマッピング** に留まっており、ドキュメントも一部に集中している。

### 現状のマッピング可否（v0.160.16 確認）

| 対象パス | 設定キー | マッピング可？ | 確認方法 |
|---|---|:-:|---|
| `docs/inception/` | `paths.inceptionDocs` | ✅ 可 | `scripts/harness/config-foundation/infrastructure/schemas/harness-config-v3.schema.json:441-448` |
| `docs/product/construction/` | `paths.designDocs` | ✅ 可 | 同上 |
| `docs/product/product_overview.md` 等の Level 1 product-wide artifacts | （無し） | ⚠️ literal reference のみ。`phaseDependencies.preset: "custom"` + `gates[]` でしか上書き不可 | `docs/guide/configuration.md:627-637` |
| `docs/principles/*.md` | **無し** | ❌ ハードコード | `scripts/harness/setup/skill-deployer.ts:545` (deploy 先) ／ `scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts:496` (保護パターン `/(?:^|\/)docs\/principles\//`) |
| `docs/folder_management_rules.md` | **無し** | ❌ ハードコード | `scripts/harness/setup/skill-deployer.ts:528` |

### 影響

1. **principles をプロジェクト独自パスに移せない**: 既存リポジトリで `docs/` 以外（例: `documentation/`, `meta/`）を使う規約がある場合、phasegate を adopt するには principles を `docs/principles/` に強制配置せざるを得ない。
2. **personal install での local-only 配置ができない**: WI-213 Gap 3 の解決策として `.phasegate-local/principles/` への配置を考えたとき、principles パスが hardcode されているために素直に解決できない（WI-213 の依存課題）。
3. **README / README.ja に `paths` 設定の記載が無い**: `docs/guide/configuration.md` には L65-68 / L615-637 で詳細記載があるが、README / README.ja の「設定の要点」「configuration」セクションには登場しないため、ユーザーが設定可能であることに気付けない。

### ドキュメント化状況（grep 確認）

| ファイル | `paths.designDocs` / `paths.inceptionDocs` の説明 |
|---|---|
| `docs/guide/configuration.md` | ✅ 記載あり（L65-68 サンプル、L615-637 placeholder 仕様、WI-149 注） |
| `README.md` | ❌ なし |
| `README.ja.md` | ❌ なし |
| `docs/guide/installation.md` | ❌ なし |
| `docs/guide/getting-started.md` | ❌ なし |

## 受け入れ基準

- [x] `paths` schema に `principlesDocs`（default: `docs/principles`）と `folderRulesDoc`（default: `docs/folder_management_rules.md`）を追加し、v3 schema / preset (`standard.json` / `strict.json` / `minimal.json`) を更新する。
- [x] `scripts/harness/setup/skill-deployer.ts` の `principlesSourceDir` / `folderRulesRelativePath` ハードコード（L545 / L528）を `paths.principlesDocs` / `paths.folderRulesDoc` 経由で解決する。
- [x] `scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts:496` の `/(?:^|\/)docs\/principles\//` 保護パターンを設定値ベース（または `paths.principlesDocs` から生成）にする。
- [x] `docs/templates/personal/phasegate-local-config.json` も新フィールドに対応し、personal install 用デフォルト値を明示する（WI-213 とのインターフェース）。
- [x] 既存 config (`paths.principlesDocs` / `paths.folderRulesDoc` を持たない config) は default 値で後方互換動作する（migration 不要）。
- [x] WI-213 が暫定的にハードコードで配置した `.phasegate-local/principles/` / `.phasegate-local/folder_management_rules.md` への参照が、本 WI 完了時点で `paths.principlesDocs` / `paths.folderRulesDoc` 経由の解決に切り替わっている（重複コードや暫定ハードコードが残らない）。
- [x] `README.md` / `README.ja.md` の「設定の要点」「Configuration」セクションに `paths` 系キーの一覧と「`docs/` 配下以外にもマッピング可能」という旨を追記する。
- [x] `docs/guide/configuration.md` の `paths` セクションを新キー対応で更新し、`{principlesDocsRoot}` / `{folderRulesPath}` 等の placeholder 仕様を追加する。
- [x] `docs/guide/installation.md` に「既存リポジトリで `docs/` 以外を使っている場合は `paths` 設定で吸収できる」旨の note を追加する。
- [x] 統合テストを追加し、`paths.principlesDocs: "documentation/principles"` 等の非デフォルト値で skill deploy / 保護ファイルパターン / personal install fallback が一貫して機能することを担保する。

## 非スコープ

- WI-213（personal install のコア防御 deploy 漏れ）本体の修正。本 WI はその前提となる schema 拡張と README 整備を担当し、WI-213 はそれを利用して personal scope に置き換える。
- Level 1 product-wide artifacts (`docs/product/product_overview.md` 等) の `paths` 経由マッピング。これは `phaseDependencies.gates[]` 経由で既に上書き可能なため、本 WI では既存挙動を維持し、ドキュメントに「product-wide artifacts は別経路で上書き」という記述を補強するに留める。
- `docs/inception/` / `docs/product/construction/` 既存マッピングの再設計。これらは WI-149 で導入済みでそのまま流用する。

## Dogfood Evidence (2026-05-22)

ローカル `0.160.16` checkout で確認した。

| 観点 | 確認方法 | 観察結果 |
|---|---|---|
| `paths` schema の現状 key | `cat scripts/harness/config-foundation/infrastructure/schemas/harness-config-v3.schema.json` L433-450 | `designDocs` / `inceptionDocs` のみ。`principlesDocs` / `folderRulesDoc` は無い |
| `docs/principles/` のハードコード箇所 | `grep -rn "principles" scripts/harness --include="*.ts" \| grep -v __tests__` | `setup/skill-deployer.ts:545` deploy 先 ／ `agent-integration/.../handle-pre-tool-use-usecase.ts:496` 保護 regex |
| `docs/folder_management_rules.md` のハードコード箇所 | `grep -rn "folder_management_rules" scripts/harness --include="*.ts"` | `setup/skill-deployer.ts:528` |
| README の `paths` 記載 | `grep -n "paths\b\|designDocs\|inceptionDocs" README.md README.ja.md` | 全部別文脈（CLI option / 文中の「paths」）。設定キーとしての言及無し |
| configuration.md の記載 | `grep -n "paths\b\|designDocs\|inceptionDocs" docs/guide/configuration.md` | L65-68 サンプル / L622-625 placeholder 表 / L627-637 スコープ外説明あり |

## Related

- WI-149 — `paths.designDocs` / `paths.inceptionDocs` を最初に導入した WI。本 WI はその拡張。
- **WI-213 — 本 WI の先行 WI**。personal install のコア防御 deploy 漏れ修正。WI-213 が先に暫定ハードコードで principles / folder_management_rules を `.phasegate-local/` に配置し、本 WI でそれを `paths.*` 設定経由に refactor する。
- `docs/principles/architecture-philosophy.md` — マッピング対応後も意味的な内容は変わらない参照。

## Implementation Verification (2026-05-22)

| Command | Result |
|---|---|
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm exec vitest run scripts/harness/__tests__/unit/config-foundation scripts/harness/__tests__/unit/setup/skill-deployer.test.ts scripts/harness/__tests__/integration/agent-integration/harness-config-config-query-adapter.test.ts scripts/harness/__tests__/integration/installation/install-handler.test.ts` | PASS: 27 files / 253 tests |
| `pnpm exec tsx scripts/harness/main.ts validate --layer L2 --format human` | PASS |
| `pnpm harness:check-ready` | PASS |
| `git diff --check` | PASS |
| `npm pack --dry-run` | PASS: `phasegate@0.160.18` |

## Published Dogfood Evidence (2026-05-22)

Published package: `phasegate@0.160.18` (`npm view phasegate version` returned `0.160.18`).

| Flow | Command / Check | Result |
|---|---|---|
| Personal install from npm | `npx phasegate@latest install --personal --agent both --apply --json` in `/private/tmp/phasegate-wi214-published.dZeN1m` | PASS. `refused: []`; created `.phasegate-local/phasegate.config.json`, local agent context, local hooks, local docs, and per-agent skills. |
| Personal doctor from npm | `npx phasegate@latest doctor --personal --agent both --json` | PASS. `phasegateVersion: 0.160.18`, `overallStatus: green`, `findings: []`, `installationMode: personal`. |
| Personal path mapping | Read `.phasegate-local/phasegate.config.json` | PASS. `paths.principlesDocs` is `.phasegate-local/docs/principles`; `paths.folderRulesDoc` is `.phasegate-local/docs/folder_management_rules.md`. |
| Personal local docs | `ls -l .phasegate-local/docs/folder_management_rules.md .phasegate-local/docs/principles/*.md` | PASS. Folder rules and all three principles docs exist; `.git/hooks/pre-commit` and `.git/hooks/commit-msg` are executable. |
| Custom repo paths from npm | Existing `phasegate.config.json` with `documentation/principles` and `documentation/folder_rules.md`, then `npx phasegate@latest init --name custom-path-dogfood --agent codex --yes` in `/private/tmp/phasegate-wi214-custom.AS5Ms9` | PASS. `Design docs deployed (4 files)` and files were created under `documentation/`, not `docs/`. |
| Custom path preservation | Read `phasegate.config.json` after init | PASS. `paths.designDocs`, `paths.inceptionDocs`, `paths.principlesDocs`, and `paths.folderRulesDoc` retained the custom `documentation/...` values. |

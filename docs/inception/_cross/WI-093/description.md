---
id: WI-093
type: fix
severity: high
status: tested
affects: [phase-dependency-model, traceability-model, validator-system, docs]
github_issue: https://github.com/junpei-9898/phasegate/issues/4
reporter: nakataj-mti
related: [WI-091, WI-085]
---

# WI-093: paths.designDocs を L2-001 / traceability-model の hardcoded 経路に完全 threading (WI-085 incomplete fix の補完)

> 起票日: 2026-05-08
> 起票経緯: WI-091 finding #4。WI-085 v0.117.0 で `paths.inceptionDocs` 側 (inception の plan 文書) の threading は完了したが、`paths.designDocs` 側 (product_overview.md / user_stories.md / unit logical_design 等) は phase-nodes / traceability-model 配下で hardcoded のまま残っている。reporter (nakataj-mti) は `docs/product → ../mydocs/product` の symlink workaround で運用中。

## 背景・症状

reporter の `phasegate.config.json`:
```json
{ "paths": {
    "designDocs": "mydocs/product/construction",
    "inceptionDocs": "mydocs/inception" } }
```

実際のファイル配置: `mydocs/product/product_overview.md`, `mydocs/product/user_stories.md` 等。

`phasegate validate --layer L2` 実行結果 (v0.128.0 dogfood で再現):
```
[FAIL] L2-001 ⚠ Phase Gate Level 2: FAILED
  - 成果物が不足しています: docs/product/product_overview.md  ← hardcoded
  - 成果物が不足しています: docs/product/user_stories.md       ← hardcoded
```

WI-085 で対処したはず (v0.117 系) だが、`designDocs` 側のパスは置き換え漏れがあった。

## 根本原因 (grep 確認済)

| ファイル | 行 | 内容 | 状態 |
|---------|---|------|------|
| `phase-dependency-model/domain/definitions/standard-phase-nodes.ts` | 29 | `{inceptionDocsRoot}/_shared/product_overview_plan.md` | ✓ placeholder |
| `standard-phase-nodes.ts` | 34 | `docs/product/product_overview.md` | ✗ hardcoded |
| `standard-phase-nodes.ts` | 46 | `docs/product/user_stories.md` | ✗ hardcoded |
| `full-phase-nodes.ts` | 34, 46 | 同上 | ✗ hardcoded |
| `minimal-phase-nodes.ts` | 34 | `docs/product/product_overview.md` | ✗ hardcoded |
| `traceability-model/domain/services/traceability-chain-builder.ts` | 20 | `STORY_CATALOG_PATH = 'docs/product/user_stories.md'` | ✗ hardcoded |
| `traceability-model/infrastructure/gateways/markdown-story-catalog-gateway.ts` | 55 | `'user_stories.md'` 相対パス | ✗ hardcoded |

WI-085 では `inceptionDocsRoot` 側の templating を通したが、**`designDocsRoot` を必要とする `product_overview.md` / `user_stories.md` のパスは置き換え漏れ**。

## 実装方針

### Phase 1: phase-nodes 3 ファイルの placeholder 化
- `{full,standard,minimal}-phase-nodes.ts` の hardcoded `docs/product/*.md` を `{designDocsRoot}/...` placeholder に置換
- `Artifact.resolve(pathRoots)` 側で `paths.designDocs` 値を使って展開
- `phase-dependency-model/domain/values/artifact.ts:21-22, 91-96` の `DEFAULT_PATH_ROOTS` / placeholder 展開ロジックを再利用 (既存 templating と凝集)

### Phase 2: traceability-model 2 ファイルの config 経由化
- `traceability-chain-builder.ts:20` の `STORY_CATALOG_PATH` を constructor injection で受け取る形にリファクタ
- `markdown-story-catalog-gateway.ts:55` の hardcoded `'user_stories.md'` を `{designDocsRoot}/user_stories.md` に変更
- DI 経路は `phase-dependency-model/infrastructure/config/harness-config-phase-config-provider.ts:147-153` を踏襲

### Phase 3: dogfood 検証
- reporter 環境を再現する設定 (`paths.designDocs: "mydocs/product/construction"`) で `validate --layer L2` 実行
- blocker メッセージが `mydocs/product/product_overview.md` を参照することを確認
- 既存 default 動作 (`paths.designDocs: "docs/product/construction"`) で挙動不変を確認
- symlink workaround (`docs/product → ../mydocs/product`) を外しても動くことを確認

## カテゴリ判定
- 種別: 既存コードの bugfix (WI-085 incomplete fix の補完)
- API 契約変更: traceability-model の constructor injection 変更で軽微な影響あり
- 新ドメインモデル / レイヤー構造変更なし
- 5 ファイル + DI 経路調整、複数 Unit (`phase-dependency-model` / `traceability-model`)
- type: fix、severity: high (reporter が symlink workaround 運用中で実害あり、GitHub Issue #4 で公開報告)
- **story-implementor 案件** (DI 配線変更 + 複数 Unit にまたがる)

## 受け入れ基準
- [x] 5 ファイル (`{full,standard,minimal}-phase-nodes.ts:34/46` + `traceability-chain-builder.ts:20` + `markdown-story-catalog-gateway.ts:55`) の hardcoded `docs/product/...` が `{designDocsRoot}/...` placeholder または config 経由解決に置換される
- [x] `Artifact.resolve(pathRoots)` で `paths.designDocs` が展開される
- [x] `traceability-chain-builder.ts` の `STORY_CATALOG_PATH` が constructor injection 化される
- [x] dogfood: `paths.designDocs: "mydocs/product/construction"` で `validate --layer L2` を実行 → blocker が `mydocs/...` を参照
- [x] 既存 default 動作 (`paths.designDocs: "docs/product/construction"`) 不変
- [x] 既存テスト全て pass、新規 IT テスト追加 (paths customize 時の挙動)
- [x] WI-085 description.md に「v0.117 では `inceptionDocs` のみ threading、`designDocs` 側は WI-093 で補完」の post-mortem を追記
- [x] CHANGELOG に GitHub Issue #4 finding #4 解消として記載
- [x] dogfood: reporter 環境想定で symlink workaround を外しても動作することを確認

## 実装結果

- phase-dependency-model の Level 1 product 直下文書を `{designDocsRoot}/../...` に置換し、`Artifact.resolve()` / `expandRoots()` で POSIX 正規化するようにした。
- traceability-model は `createTraceabilityModelModule(rootDir, { pathRoots })` で `paths.designDocs` を受け取り、product root を導出して `MarkdownStoryCatalogGateway` / `MarkdownUnitDefinitionGateway` / `MarkdownDesignDocumentGateway` / `TraceabilityChainBuilder` に注入する。
- `ProjectRelativePath` は `docs/` / `scripts/` 固定 root 制約を外し、任意のプロジェクト相対 POSIX パスを許容する。
- 新規テスト:
  - `scripts/harness/__tests__/integration/phase-dependency-model/main-check-phase-gate-custom.integration.test.ts`
  - `scripts/harness/__tests__/unit/traceability-model/traceability-custom-paths.test.ts`

## 検証結果

- `pnpm exec tsc --noEmit`: pass
- targeted tests: `pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts unit/traceability-model/traceability-custom-paths.test.ts unit/traceability-model/traceability-chain-builder.test.ts integration/phase-dependency-model/main-check-phase-gate-custom.integration.test.ts`: 3 files / 11 tests pass
- full regression: `pnpm test`: 453 files / 3520 tests pass
- local/self-host reporter fixture (`/private/tmp/phasegate-local-wi093`, symlink なし): `validate --layer L2 --format human` は exit 1 / FAIL、L2-001 blocker に `mydocs/product/product_overview.md` を表示し、`docs/product/product_overview.md` は出ないことを確認。
- changed file metadata: `validate-metadata` pass
- `npm pack --dry-run`: pass (`phasegate@0.130.0`, `phasegate-0.130.0.tgz`)
- `pnpm harness:check-ready`: pass
- post-publish dogfood (`/private/tmp/phasegate-dogfood-wi093-published`, `npx phasegate@0.130.0`, symlink workaround なし):
  - `validate --layer L2 --format human` with `paths.designDocs: "mydocs/product/construction"`: exit 1 / FAIL、L2-001 blocker は `mydocs/product/product_overview.md` を参照。
  - `validate --layer L2 --format human` with default `paths.designDocs: "docs/product/construction"`: exit 1 / FAIL、L2-001 blocker は `docs/product/product_overview.md` を参照。
  - `validate-metadata mydocs/product/construction/sample/domain_model.md`: exit 0 / PASS。`mydocs/product/user_stories.md` の story catalog を参照する traceability path を確認。
  - `docs/product` は symlink ではないことを確認。

## スコープ外
- WI-091 finding #2 (severity 集計 / WI-094) / #5 advanced (pointers spec / WI-095) — 別 WI
- `paths.*` 設定の schema 拡張 (例: `paths.testRoot`, `paths.adrDocs` など) — 別 WI で漸進
- WI-085 で完了した `inceptionDocs` 経路の再 audit (本 WI は `designDocs` のみ)

## 関連
- WI-085 description.md (`paths` threading の先行 WI)
- WI-091 description.md finding #4 セクション
- WI-092 description.md (`createValidatorSystemModule()` の DI sweep — 本 WI 着手前に完了させると安全)
- GitHub Issue [#4](https://github.com/junpei-9898/phasegate/issues/4)
- `phase-dependency-model/domain/values/artifact.ts:21-22, 91-96` (`DEFAULT_PATH_ROOTS` / placeholder 展開)
- `phase-dependency-model/infrastructure/config/harness-config-phase-config-provider.ts:147-153` (DI 経路)

## 教訓フィードバック (memory 適用)
- `feedback_dogfood_before_release.md`: paths config 改修は publish 前に非デフォルト paths で `validate --layer L2` を実行して確認する規律を継続。本 WI 完了時に reporter 環境想定の dogfood (symlink なしで動くこと) を必ず実施。WI-085 の経験で「composition root の DI 配線漏れ」は単体テスト全 PASS でも見逃すという教訓を強化する。

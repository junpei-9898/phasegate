---
traceability:
  initial_creation: true
---

# WI-239 Logical Design

<!-- @work-item-id WI-239 -->

## Design Scope

WI-239 は L1 ルール `no-comment-flood`（unit `biome-ast-engine`, CLI code `L1-007`）のコメント密度分子の定義を訂正する。

現行実装では `comment-density-parser.ts` が「行頭が `//` または `/*` で始まる全行」を `commentLineCount`（密度分子）として数える。この定義は、PhaseGate 自身が L1 ルール (`require-unit-comment` / `require-layer-comment`) で**必須化しているメタデータヘッダ**（`// @unit` / `// @layer` / `// @work-item-id` / `// @story` 等）や、Clean Architecture 上で正当な**宣言前 JSDoc (`/** … */`)**（型/DTO/ポート/薄いアダプタのフィールド・宣言説明）を分子に加算するため、慣用的で健全な型・DTO・ポート・バレル・薄アダプタのファイルが誤って flood 判定される（false positive）。

`npx phasegate lint` は 11 ファイルでこの false positive により失敗する:

- attestation: `produce-attestation-input.ts`, `verify-attestation-output.ts`, `gate-result-source-port.ts`, `matrix-source-port.ts`, `ac-bound-scope-service.ts`, `granularity-derivation-service.ts`, `index.ts`, `file-system-source-digester-adapter.ts`, `node-crypto-content-hasher-adapter.ts`
- nyquist-validation: `matrix-schema-loader.ts`
- validator-system: `ac-bound-coverage-policy-port.ts`

## 解法（承認済み）

密度分子（`commentLineCount`）から次を**除外**する:

1. **先頭の必須メタデータヘッダ行** — ファイル冒頭の連続したコメント領域にある `//` メタデータタグ行（`@unit` / `@layer` / `@work-item-id` / `@story` 等）。最初のコード行または非メタデータコメントが現れた時点でヘッダ領域は終了する。
2. **`/** … */` doc-comment ブロック** — `/**` で始まるブロックコメントはブロック全体を除外する。

分子に**残す**のは、narrative な `//` 行コメントと、非 doc の `/* … */` ブロックのみ。

**変更しないもの:**

- 分母（空行を除いた全論理行数 `logicalLineCount`）
- 閾値 `maxCommentRatio: 0.35`, `maxRepeatedBlocks: 1`, `minLogicalLines: 15`（`rule-definition-registry.ts` / `phasegate.config.json`）
- `LintRunner` のルール評価ロジック
- ドメイン VO `SourceModuleSnapshot` / mapper / adapter の**フィールド名**（`commentLineCount` を維持し、意味だけ再定義する）
- `repeatedCommentBlocks` の挙動（narrative コメント集合に対して算出。メタデータヘッダは単一出現のため反復検出に影響しない）

これにより flood signal の実効性（narrative なコメント洪水は依然として検出）を保ったまま、慣用ファイルの false positive を解消する。

## フィールドセマンティクスの再定義（Q3 承認）

`commentLineCount` フィールド名は据え置き、その意味を「密度に寄与するコメント行数（メタデータヘッダと JSDoc を除く narrative コメント行数）」へ**その場で再定義**する。新フィールドは追加しない。ドメイン設計文書（`docs/product/construction/biome-ast-engine/logical_design.md` / `domain_model.md`）へこの意味変更を反映する。

## 受け入れ基準

- `npx phasegate lint --json` の `no-comment-flood` (`L1-007`) 件数が 0、exit 0
- 上記 11 ファイルが flood 判定から外れる
- harness 全体で新規に flood 判定されるファイルが 0（健全ファイルが flip しない）
- narrative な `//` コメント洪水は依然として検出される（ガードテストで担保）
- 既存の `commentDensity` / `no-comment-flood` テストは green を維持
- `npm run test` full suite green、L2 / L3 green

## テスト方針（RED → GREEN）

- RED #1（parser）: 「メタデータヘッダとJSDocは密度分子から除外される」 — `produce-attestation-input.ts` を模した inline fixture（先頭 `// @unit`/`// @layer` + フィールド毎の `/** */`）で density-relevant コメント数 → ratio ≤ 0.35 を assert。修正前は fail、修正後は pass。
- RED #1b（parser）: 「ポートインタフェースの宣言前JSDocは除外される」 — `gate-result-source-port.ts` を模した inline fixture。
- GUARD（parser）: 「narrativeな//コメント洪水は依然として検出される」 — 実関数に filler `//` を大量に混ぜた fixture で ratio > 0.35 を維持。ルールが実 signal を失わないことを証明。

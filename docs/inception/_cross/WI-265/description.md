---
id: WI-265
type: fix
severity: normal
status: drafted
affects: [biome-ast-engine]
---

# WI-265: L1 rule-code mapper の L1-007/L1-008 不整合修正

> 起票日: 2026-07-16
> 経緯: v0.184.0 の dogfooding で発見され defer されていた実バグ。CLI 出力のルールコード表示がドメインの canonical レジストリと食い違っていた。

## 背景 / 根本原因

`biome-ast-engine` unit のドメインレジストリ `rule-definition-registry.ts` は L1 ルールとエラーコードの canonical 対応を以下のように定義している（ドメインが真実）:

| ルール名 | canonical コード |
|---------|-----------------|
| `no-code-duplication` | `L1-006` |
| `no-ghost-file` | `L1-007` |
| `no-comment-flood` | `L1-008` |

一方、CLI 表示経路が使う 2 つのマッピングテーブルはレジストリと食い違っていた:

- `infrastructure/mappers/rule-violation-code-mapper.ts`
- `application/mappers/build-harness-error-payload-output-mapper.ts`

両者とも `no-ghost-file` → `L1-006`、`no-comment-flood` → `L1-007`、`no-code-duplication` → `L1-008` と、
レジストリと 3 ルール分ズレていた。この結果 `npx phasegate lint` の実出力で `no-comment-flood` が `L1-007` と誤表示されていた。

`rule-violation-code-mapper.ts` は `HarnessErrorFormatterAdapter.format` から呼ばれ CLI 表示コードを生成する。
`build-harness-error-payload-output-mapper.ts` は `BuildHarnessErrorPayloadUseCase` が HarnessError ペイロードのコードを付与するのに使う。両方がレジストリ非整合だった。

## 修正方針

**レジストリ (`rule-definition-registry.ts`) を canonical とし、2 つのマッピングテーブルをレジストリに整合させる。**

- `RULE_TO_CODE`（rule-violation-code-mapper.ts）を registry の値に一致させる
- `RULE_CODE_BY_NAME`（build-harness-error-payload-output-mapper.ts）を registry の値に一致させる

## 回帰テスト（drift-gate）

個別ルールのハードコード検証ではなく、**レジストリ全件との整合を assert する drift-gate 型テスト**を追加する。
`RuleDefinitionRegistry.getAll()` の全 `RuleDefinition` について `mapRuleNameToCode(name) === registry.errorCode` を検証し、
将来どちらか一方だけが変更された場合に必ず fail する形にする。

## 波及先（ドキュメント）

ドキュメントの L1-007/L1-008 表記にはレジストリ非整合なものが複数存在するが（`docs/product/harness_product_overview.md`,
`docs/ADR/001-*`, `integration_contract.md` 等）、本 WI のスコープはコードの実バグ修正に限定する。
ドキュメントの網羅的整合は別 WI で扱う。ただし、レジストリと直接矛盾する product 文書の canonical 表を優先的に是正する。

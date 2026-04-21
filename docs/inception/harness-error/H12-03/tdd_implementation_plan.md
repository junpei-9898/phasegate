# TDD実装計画: H12-03 / ISSUE-007 Wave 3 — HarnessError actionability

## 1. スコープ

**対象ストーリー:** ISSUE-007 Phase B / P1-2「phase-gate エラーが actionable でない」

**受け入れ基準（本 Wave で close 予定）:**
- phase-gate エラーに `suggestedSkill` / `scaffoldCommand` / `templatePath` フィールドが追加される
- 実際のエラー表示に次のアクション（スキル名 + scaffold CLI）が明示される

**影響する層:**
- `harness-error/domain` — HarnessError / ErrorDefinition に optional フィールド追加
- `harness-error/application` — HarnessErrorContract DTO 拡張 + Mapper 更新
- `harness-error/infrastructure/registry` — L2-001 等に default 値を付与
- `agent-integration/application` — pre-tool-use hook のエラーメッセージ構築で fields を参照

**影響しない層:**
- L0/L1/L2/L3 validator 本体（エラー定義のメタ拡張のみで、validator ロジック自体は不変）
- hook 以外の CLI 出力フォーマット（Wave 外）

## 2. 前提条件検証

- `implementation-readiness-checker` 相当チェック結果:
  - `docs/product/construction/harness-error/logical_design.md` ✅ 存在
  - `docs/product/construction/harness-error/domain_model.md` ✅ 存在
  - `docs/product/construction/harness-error/unit_test_design.md` ✅ 存在
  - `docs/product/construction/harness-error/it_test_design.md` ✅ 存在
  - `docs/product/construction/harness-error/coverage_report.md` ✅ 存在
- baseline 有効化済み（`phasegate.config.json.baseline.enabled=true` / `.phasegate/baseline.json` 1259 エントリ） → 既存ファイル修正は grandfather skip で phase-gate 非発火

## 3. TDD 実装順序（テストピラミッド準拠）

### Stage 1: Unit テスト (RED → GREEN → REFACTOR) — domain 層

| 対象 | テスト内容 | 実装内容 |
|---|---|---|
| `HarnessError` value-object | 3 optional フィールドの保持・equals 対称性・toContract 出力 | `suggestedSkill?`, `scaffoldCommand?`, `templatePath?` を追加（全て `string \| null`） |
| `HarnessErrorContract` | snake_case キー（`suggested_skill` 等）で optional 出力 | Contract interface 拡張 |
| `ErrorDefinition` value-object | `defaultSuggestedSkill` / `defaultScaffoldCommand` / `defaultTemplatePath` の保持と解決メソッド | ErrorDefinition props 拡張 + `resolveSuggestedSkill()` 等 |

**ファイル:**
- `scripts/harness/harness-error/domain/value-objects/harness-error.ts`
- `scripts/harness/harness-error/domain/value-objects/error-definition.ts`
- `scripts/harness/__tests__/unit/harness-error/harness-error.test.ts`
- `scripts/harness/__tests__/unit/harness-error/error-definition.test.ts`

### Stage 2: IT テスト (RED → GREEN → REFACTOR) — registry / contract mapper

| 対象 | テスト内容 | 実装内容 |
|---|---|---|
| `L2_ERROR_DEFINITIONS[L2-001]` | 3 フィールドが populate されている | `createDefinition` ヘルパー拡張、L2-001 に `suggestedSkill='/logical-designer'`, `scaffoldCommand='npx phasegate scaffold-design --unit <id> --phase logical'`, `templatePath='docs/templates/logical_design.template.md'` をセット |
| `HarnessErrorContractMapper` | HarnessError → Contract 変換で snake_case キーが入る | Mapper 更新 |
| `CreateHarnessErrorUseCase` | ErrorDefinition から HarnessError 生成時に default 値を継承 | UseCase 更新 |

**ファイル:**
- `scripts/harness/harness-error/infrastructure/registry/l2-error-definitions.ts`
- `scripts/harness/harness-error/application/mappers/harness-error-contract-mapper.ts`
- `scripts/harness/harness-error/application/usecases/create-harness-error-use-case.ts`
- `scripts/harness/__tests__/integration/harness-error/harness-error-contract-mapper.test.ts`
- `scripts/harness/__tests__/integration/harness-error/create-harness-error-use-case.test.ts`

### Stage 3: IT テスト (RED → GREEN → REFACTOR) — agent-integration hook 統合

| 対象 | テスト内容 | 実装内容 |
|---|---|---|
| `HandlePreToolUseUseCase.buildPhaseGateBlockOutput` | 生成される error.message に scaffold CLI 行が含まれる | L2-001 の ErrorDefinition を lookup して message に追加行を挿入 |
| `HandlePreToolUseUseCase.buildFullModeRequiredBlockOutput` | 同上（FULL_MODE_REQUIRED は /story-implementor だが scaffold ヒントも出す） | 同様に追加 |

**ファイル:**
- `scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts`
- `scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-usecase.test.ts`

**実装方式:** 最小限の結合。agent-integration から harness-error の ErrorDefinition レジストリを lookup する port を導入（`ErrorGuidanceQueryPort`）。既存の WRITE スキップ等と同じ optional port パターンで後方互換を維持。

### Stage 4: 出力例の確認（目視）

Wave 2 と同じ dogfooding 手順で hook を直接呼び出し、stderr に下記が含まれることを確認:

```
フェーズゲート違反: ...
対象スコープ: ...
ブロック理由:
  - ...
次のアクション:
  ・スキル: /logical-designer を起動して unit=<id> を指定
  ・scaffold: npx phasegate scaffold-design --unit <id> --phase logical
  ・テンプレ: docs/templates/logical_design.template.md
```

## 4. 環境検証チェックリスト

- [x] Node 18+ / pnpm 10.x
- [x] vitest 3.x
- [x] baseline.json 存在（grandfather skip 有効）
- [ ] `pnpm test` 既存全通過（Wave 3 開始前の確認）
- [ ] Wave 3 追加テスト全通過（Wave 3 完了時の確認）
- [ ] `npx phasegate lint`（L1 metadata）違反ゼロ（Wave 3 完了時）

## 5. QA（不明点・確認事項）

### [Question] Q1: 各 LX error-definitions ファイルへの拡張範囲

本 Wave では **L2-001 (phase_gate) のみ** に suggestedSkill/scaffoldCommand/templatePath を populate する提案（phase-gate retrofit 痛点の解消が狙いのため）。L1-L4 全エラーへの展開は Wave 外（別 issue）。

**推奨案:** L2-001 のみ populate。他は将来拡張で Wave 4 以降または別 issue。

[Answer] 推奨案で進める（2026-04-22）


### [Question] Q2: scaffold CLI 未実装の段階で `scaffoldCommand` 文字列を出すべきか

Wave 4 で `npx phasegate scaffold-design` を実装する予定。Wave 3 時点では未実装なので、エラーに出る CLI 文字列を実行しても "unknown command" で失敗する。

**推奨案:** それでも文字列として出す。理由:
- ドキュメント的価値（ユーザーに「これから CLI ができる」と伝わる）
- Wave 4 実装時にエラーメッセージを再度触る必要がない
- `suggestedSkill` (/logical-designer) は既に動作するので、最低限の解消手段は提示できている

[Answer] 推奨案で進める（2026-04-22）


### [Question] Q3: `HandlePreToolUseUseCase` への `ErrorGuidanceQueryPort` 依存追加

agent-integration から harness-error のレジストリを読むには port 経由が必要。infrastructure adapter で harness-error Unit の composition-root からエラー定義を取得する（Wave 2 の `CiGovernanceBaselineGrandfatherAdapter` と同じクロス Unit パターン）。

**推奨案:** optional port として追加（未注入時は既存のハードコード message を出す。後方互換）。

[Answer] 推奨案で進める（2026-04-22）


### [Question] Q4: `suggestedSkill` 値の整合性

`/logical-designer` / `/domain-modeler` / `/story-implementor` など複数候補がある。L2-001 の blockers は複数 artifact（logical_design.md, domain_model.md, ...）をまとめて列挙するため、単一スキルを推奨できない場合がある。

**推奨案:** L2-001 の defaultSuggestedSkill は `/story-implementor` とする（最終的に全段階を回すスキル）。blocker 個別のスキル推薦は Wave 4 以降で artifact path パターンマッチングで細分化。

[Answer] 推奨案で進める（2026-04-22）


### [Question] Q5: 既存 `HandlePreToolUseUseCase` の hardcoded message との共存

現状 `buildPhaseGateBlockOutput` は `'次のアクション: /story-implementor スキルを使用して...'` をハードコードしている。

**推奨案:** ErrorGuidanceQueryPort 注入時はそれを優先、未注入時は従来のハードコード文字列を維持（後方互換）。ただし `pre-tool-use-hook.ts` presentation では本番 adapter を必ず注入するように配線する。

[Answer] 推奨案で進める（2026-04-22）


## 6. 前提条件・リスク

**リスク:**
- **クロス Unit 参照**: agent-integration → harness-error の infrastructure-to-infrastructure 読み取りは Wave 2 の ci-governance 呼び出しと同じパターンだが、harness-error composition-root に「エラー定義一覧取得」のエントリポイントが必要（既存 `listErrorDefinitionsUseCase` で賄える想定）
- **テスト増: 20-30 ケース程度見込み** (HarnessError 3 field × 数ケース + ErrorDefinition + Mapper + UseCase + hook IT)
- **baseline grandfather の恩恵で実装時の FULL_MODE_REQUIRED 回避可能** — 新規 port 追加ファイルはベースライン外になるため、そこだけ phase-gate が発火する可能性。その場合は Wave 1/2 と同じ一時 config フリップで対応

**前提:**
- 本 Wave では Wave 4 (`scaffold-design` CLI) / Wave 5 (retrofit-adoption.md) は扱わない
- ISSUE-007 Wave 3 が着地すると、受け入れ基準 8 項目中 5 項目が ✅ になる（Wave 4/5 で残 3 項目）

## 7. 実行方式

- メインセッションで直接実行（サブエージェント不要、範囲が既知のため）
- TDD: まず失敗するテストを書く → 実装 → GREEN → 次のテスト
- バージョン bump: v0.66.0 → v0.67.0
- Wave 3 完了時に `issue_description.md` 実装履歴表を更新

---
id: WI-368
type: story
severity: medium
status: drafted
affects: [ci-governance, harness-api]
source: GitHub issue #42（inception 系ドキュメントにテンプレート実体が無い）
---

# WI-368: inception plan 文書のテンプレート実体化 + `scaffold-inception` 新設

<!-- @work-item-id WI-368 -->

## 背景

`templates/` にあるのは construction フェーズ 5 本（logical / domain / uiux /
unit-test / it-test）のみ。L2 の Level-1 フェーズゲートが要求する
`docs/inception/_shared/*_plan.md` と `docs/product/product_overview.md` には
テンプレート実体が無く、構造の正本は SKILL.md 内の散文コードブロックしか無い。

結果として retrofit 導入した PJ は「Level-1 ゲートが落ちるが、通る文書の書き方が
機械可読な形で存在しない」状態に置かれる。

## 要求

1. Level-1 ゲートを塞ぐ plan 文書と `product_overview.md` をテンプレート実体化する
   - `templates/product_overview_plan.template.md`
   - `templates/story_writer_plan.template.md`
   - `templates/story_mapping_plan.template.md`
   - `templates/unit_design_plan.template.md`
   - `templates/product_overview.template.md`
2. `phasegate scaffold-inception --kind <doc-kind>` を新設する
   - `--dry-run`（既定）/ `--apply` / `--force` / `--json` は `scaffold-design` と同契約
   - 既存ファイルは `--force` なしで保護（exit 2）
   - 書き込み先は `paths.inceptionDocs` / `paths.designDocs` に追従する
3. **ラウンドトリップテスト必須** — scaffold した文書がそのまま
   `check-phase-gate`（L2-001 が使う Level-1 ゲート）を通ること。
   plan 文書は `## N. QA（不明点・確認事項）` 見出しを必ず含み、
   planning mode `interactive` の evidence 判定を満たす。
4. SKILL.md の構造ブロックから正本をテンプレートへ移し、SKILL.md は
   テンプレート取得手段（`templates show` / `scaffold-inception`）を指す

## 非スコープ（今回は入れない doc-kind）

- `user_stories.md` / `user_story_mapping.md`
- `units/{unit}_unit.md` / `units/integration_contract.md`
- unit スコープの plan 文書（`{unit}/domain_model_plan.md` 等、Level-2 ゲート）

上記は Level-1 を塞いだ後の段階投入とする（issue #42 のスコープ膨張リスク注記に従う）。

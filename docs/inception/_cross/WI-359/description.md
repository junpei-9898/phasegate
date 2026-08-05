---
id: WI-359
type: fix
severity: medium
status: drafted
affects: [phase2-extensions]
source: WI-348〜358 の push 前検証で判明（e2e SC-P2-002 が暦の経過だけで赤化）
---

# WI-359: p2:check-freshness の `--dry-run` を仕様どおり report-only にする

<!-- @work-item-id WI-359 -->

## 背景

`CheckFreshnessHandler` は `--dry-run` を引数パースして `dryRun` に格納し、UseCase へ渡すものの、
`exitCode` の決定には一切使っていなかった（`CheckDocFreshnessUseCase` 側も `dryRun` を参照しない）。
結果として `--dry-run` は完全な no-op で、error 閾値（既定 90 日）を超えた設計文書が 1 件でもあると
診断のみの実行でも exit 1 になっていた。

このため e2e シナリオ SC-P2-002（`p2:check-freshness --dry-run が exit 0 で完了する`）が、
**ソースコードを一切変更しなくても暦が進むだけで赤化する**状態になっていた。
実際 2026-08-06 時点で `docs/product/construction/` 配下の 11 文書が 104 日経過し error 判定となり、
`npm run test` と CI が赤になっていた。

仕様側の記述はいずれも report-only を意味しており、実装だけが乖離していた:

- `docs/inception/phase2-extensions/HF2-01/scenario_test_design.md`
  SC-P2-002「`--dry-run` オプションが受け付けられる」→ 期待結果 **exit 0**
- `skills/doc-health-checker/SKILL.md`「`--dry-run` = 副作用なしで診断のみ」

## 修正

`dryRun === true` のとき exitCode を 0 に固定する。診断結果の stdout は従来どおり出力するため、
鮮度の劣化そのものは引き続き可視化される。フラグ未指定時の `summary.error > 0 → exit 1` は不変。

## 防御が緩まないことの根拠

実運用の鮮度ゲートは **L4-004**（`validate --layer L4`）であり、
`RunL4ValidatorsUseCase` は `CheckDocFreshnessUseCase` を直接呼ぶため本 handler を経由しない。
`p2:check-freshness` は `docs/guide/cli-reference.md` および `docs/guide/layer-model.md` が
「L4-004 の compatibility entry point」と位置づける互換コマンドであり、
`--dry-run` は利用者が明示的に指定した場合のみ有効になる。
CI / husky から `p2:check-freshness --dry-run` をゲートとして呼んでいる箇所は存在しない。

## 文書鮮度の実体について（意図的に本 WI のスコープ外とする）

error 判定 11 件・warn 判定 50 件は実在する文書債務だが、WI-348〜358 の変更内容と
突き合わせた結果、これらの文書の**記述内容にコードとの乖離は見つからなかった**
（例: `config-foundation/unit_test_logic.md` の QuickModeConfig 記述は `allowedCategories=['a','b']` の
ような抽象プレースホルダで書かれており、WI-353 の防御プリセット実値変更の影響を受けない。
`harness-error/unit_test_logic.md` は WI-356 が変更した `defaultTemplatePath` に言及していない）。
すなわち今回の赤化は純粋に暦依存の劣化であり、内容更新を伴わない
タイムスタンプ更新でこれを解消するのは実質的な偽装にあたるため行わない。
文書債務そのものの返済は別 WI として計画する。

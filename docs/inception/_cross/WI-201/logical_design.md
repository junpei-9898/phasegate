# WI-201 Logical Design

## Scope

Close the retrofit bootstrap last-mile gap by adding a managed apply path for applicable config plans and by making hook recovery guidance aware of config-plan intents.

## Design

- Extend `config:plan` parser to accept `--apply` while keeping `--dry-run` and `--json`.
- Split config plan construction from config plan application:
  - build the existing plan and `configPatch` preview,
  - refuse apply when there are no operations or the patch is blocked,
  - write a timestamped backup under `.phasegate/backups/`,
  - write the `configPatch.after` object to `phasegate.config.json`,
  - return machine-readable apply evidence with `changed`, `backupPath`, and `appliedOperations`.
- Update retrofit/planning-mode command recommendations so agents see `config:plan --intent <intent> --apply --json` after review.
- Add config-specific guidance to the full-mode block output when the blocked path is `phasegate.config.json` and the dominant category is `config`.

## Non-goals

- Do not allow arbitrary agent `Edit` / `Write` calls to bypass full-mode rules.
- Do not invent a generic JSON Patch command outside the existing `config:plan` intent model.
- Do not apply intents whose patch applicability is `not-applicable` or `blocked`.

## Solution Mapping

各 Unit が担当する解決策を `description.md` の 4 crack と対応付けて整理する。Crack→Solution は 1:1 で、Unit 跨ぎの順序依存も少ない（harness-api の parser 拡張のみ最上流）。

| Crack | Unit | 解決策 | 主な変更点 |
|-------|------|--------|-----------|
| 1. `--apply` flag absent | harness-api | parser を拡張し `--apply` / `--dry-run` を排他フラグとして受理。`--apply` 未指定時は dry-run と等価。 | `KNOWN_CONFIG_PLAN_FLAGS` に `--apply` を追加し、`hasFlag(args, "--apply")` で apply モードを判定。`--apply` と `--dry-run` の同時指定は exit 2。 |
| 2. apply write path absent | config-foundation | dry-run と apply の plan 構築を共有し、apply 経路のみ side effect を持つ。書き込み前に `.phasegate/backups/phasegate.config.<ISO8601>.json` を生成し、`configPatch.after` を `phasegate.config.json` に書く。`configPatch.applicability !== "applicable"` の場合は structured refusal で exit 1。 | `applyConfigPlan(rootDir, plan)` を新設し、`changed` / `backupPath` / `appliedOperations` を含む `ConfigApplyResult` を返す。case 節は `apply` フラグに応じてこの結果を JSON / human にレンダリングする。 |
| 3. commands catalog gap | installation | applicable intent の `commands` 末尾に managed apply を追加。`diffExplanation` の「managed commands」が実体を伴うようにする。 | `retrofit-bootstrap` の `commands` に `phasegate config:plan --intent retrofit-bootstrap --apply --json` を追加。他 applicable intent (`l4-strict`, `quick-mode-strict`, `planning-mode-relax`) も同様に apply 行を追記。 |
| 4. hook guidance gap | agent-integration | full-mode block の `dominantCategory === "config"` かつ `blockedFilePath` が `phasegate.config.json` の場合は `/story-implementor` ではなく `config:plan --intent retrofit-bootstrap --dry-run` / `--apply` を案内。`PROTECTED_FILE_GUIDANCE` に `phasegate.config.json` エントリを追加。 | `buildFullModeRequiredBlockOutput` に config-specific 分岐を追加。`ErrorGuidanceQueryPort` 経由の override も `FULL_MODE_REQUIRED_CONFIG` のような新エラーコードで取得可能にしておく（runtime fallback はコード内分岐）。`nextAction` も dry-run / apply の 2 行に拡張。 |

## Rollout / Sequencing

1. **harness-api → config-foundation**: parser が `--apply` を受け取るようになっても apply 関数が無ければ既存挙動を壊さない。逆順では parser が flag を弾くため apply path を呼べない。
2. **installation**: catalog の文字列更新のみ。harness-api / config-foundation の実装後でないと案内するコマンドが存在しないため、上 2 ステップ完了後にリリース。
3. **agent-integration**: 上 3 つのいずれかが無くても block 自体は維持されるため、最後に独立して追加可能。回帰 IT は `it_test_design.md` の Hook Guidance Tests を満たすこと。

## Risks

- backup ファイルが累積する場合の clean-up は本 WI のスコープ外。`.gitignore` に既存の `.phasegate/` 配下 backup パターンが含まれているか確認すること。
- `configPatch.after` が `null` (`before === null` で `withNestedValue` が新規 root を作る) の場合の write が `JSON.stringify` で `"null"` にならないよう、apply 関数で型ガードする。
- `--apply` 経路の例外（permission error / disk full）で backup だけ残る race を避けるため、write は `fs.writeFile` を temp → rename で原子的に行う。

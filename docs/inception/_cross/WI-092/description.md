---
id: WI-092
type: fix
severity: normal
status: drafted
affects: [harness-api, validator-system, integrations]
github_issue: null
reporter: junpei-9898
related: [WI-091, WI-085]
---

# WI-092: createValidatorSystemModule() 残 5 site の DI 配線漏れ sweep (予防的)

> 起票日: 2026-05-08
> 起票経緯: WI-091 finding #1 follow-up (v0.128.0) で `main.ts:979` の DI 配線漏れを修正したが、`createValidatorSystemModule()` を呼ぶ他 5 site で同じパターンの漏れが残存していることを grep で確認。WI-085 retrospective (`feedback_dogfood_before_release.md`) で記録した同種の bug が再発する温床となるため予防的に sweep する。

## 背景・症状

WI-091 finding #1 の follow-up として `scripts/harness/main.ts:979` の `createValidatorSystemModule()` 呼び出しに `toValidatorSystemConfig(resolvedConfig)` を thread して L4 enabled gate を runtime で機能させた。同種の DI 配線漏れが残り 5 site にも存在する:

| ファイル | 行 | 用途 |
|---------|---|------|
| `scripts/harness/harness-api/infrastructure/adapters/validator-system-execution-adapter.ts` | 27 | `runL3Validators()` (harness-api 経由の L3 実行) |
| 同上 | 38 | `runAllValidators()` (harness-api 経由の全レイヤー実行) |
| 同上 | 51 | `runDriftDetection()` (`phasegate:detect-drift` で利用) |
| `scripts/harness/integrations/pre-commit.ts` | 306 | Husky pre-commit hook の lint 実行 |
| 同上 | 338 | Husky pre-commit hook の validate 実行 |

これらの site では現在、`createValidatorSystemModule()` が config 引数なしで呼ばれており、composition-root.ts の `DEFAULT_CONFIG` (preset='standard', L4.enabled=true) が使われる。user の `phasegate.config.json` (例: `layers.L4.enabled: false`) が runtime で反映されない。

## 現状での実害 (短期的には限定的)

- `phasegate:detect-drift` (line 51): drift detection service を直接呼ぶ経路で `RunL4ValidatorsUseCase` を経由しないため、finding #1 の gate が hit しない (= disabled の認識がされない) こと自体は問題にならない。但し `validate --layer L4` と挙動が乖離する可能性。
- `phasegate:check-ready` などの harness-api flow (line 27/38): L3 中心の実行で L4 関連機能を呼ばないため現在は実害なし。
- Husky pre-commit (line 306/338): L1/L2 中心の経路で L4 を呼ばない。

しかし将来 L4 関連機能や severity 集計 (WI-094 範囲) を追加するとこれらの経路でも `enabled` 判定が必要になり、その時に再発する。**予防的に sweep する**。

## 実装対象 (5 site の同種改修 + テスト)

### 1. `validator-system-execution-adapter.ts` (3 site)

各 site で同じパターン:
1. `loadResolvedConfigUseCase` を `import` (config-foundation 経由) もしくは constructor injection
2. 関数の冒頭で `await loadResolvedConfigUseCase.execute()` で resolvedConfig を取得
3. `createValidatorSystemModule(toValidatorSystemConfig(resolvedConfig))` で thread

`toValidatorSystemConfig` は `main.ts:447-466` 周辺で実装済 — 共通化のため `harness-api/application/...` か `config-foundation` の export 位置に移動するか、当面は per-call で resolveConfig + translator を呼ぶ形でも OK (DRY 化は別 cleanup commit で漸進可)。

### 2. `integrations/pre-commit.ts` (2 site)

同じパターン。pre-commit context では config 不在の場合がありうる (例: project 初期化前) ため、`resolvedConfig === undefined` 時は composition root の DEFAULT_CONFIG fallback で動作する確認が必要。

### 3. テスト追加

spawn ベースの結合テスト 1〜2 ケース (例: `phasegate:detect-drift` を `L4.enabled: false` 環境で実行 → drift detection service 自体は呼ばれるが `validate --layer L4` の挙動と整合する)。

## カテゴリ判定
- 種別: 既存コードの bugfix (DI 配線漏れの予防的修正、新ロジック追加なし)
- 新ドメインモデル / API 契約変更なし (`createValidatorSystemModule` の引数は既に optional)
- 単一 Unit 内に閉じる (harness-api / integrations のそれぞれ単独)
- type: fix、severity: normal (現状実害なし、予防的 sweep)

## 受け入れ基準
- [ ] `validator-system-execution-adapter.ts:27/38/51` の 3 site で `createValidatorSystemModule(toValidatorSystemConfig(resolvedConfig))` 形に修正
- [ ] `integrations/pre-commit.ts:306/338` の 2 site で同様に修正
- [ ] `toValidatorSystemConfig` translator が `main.ts` から共通利用可能な位置 (例: `config-foundation/application/...`) に export される、または per-call で再実装される
- [ ] dogfood: `phasegate:detect-drift` を `L4.enabled: false` 環境で実行 → `validate --layer L4` と整合した挙動を維持することを確認
- [ ] 全テストグリーン
- [ ] L1 / L2 (metadata, test-quality) 維持

## スコープ外
- `createValidatorSystemModule()` の引数 type を `object` から厳密化するリファクタリング (別 WI で漸進)
- 他の composition root (`createPhaseDependencyModelModule`, `createConfigFoundationModule` 等) の同種 audit (関連性は高いが別 WI)
- WI-091 finding #2 (severity 集計) / #4 (paths threading) / #5 advanced (pointers)

## 関連
- WI-091 description.md (finding #1 follow-up での `main.ts:979` 修正)
- v0.128.0 commit `adb7553` (`main.ts` での先行修正)
- `feedback_dogfood_before_release.md` (composition root DI 配線確認の規律)
- `scripts/harness/main.ts:447-466` (`toL1Config` / `toArchitectureInput` / `toValidatorSystemConfig` translator 群)

## 教訓フィードバック (memory 適用)
- `feedback_dogfood_before_release.md`: 既に WI-091 の教訓として記録済。本 WI で「予防的 sweep」を実行することで、同種の DI 漏れが蓄積する前に解消する。WI-094 (severity 集計) や WI-093 (paths threading) を着手する前に WI-092 を完了させると安全。

---
id: WI-096
type: fix
severity: trivial
status: tested
affects: [harness-api]
github_issue: null
reporter: junpei-9898
related: [WI-091, WI-092]
---

# WI-096: phasegate:status が `layers.L?.enabled` user override を表示に反映しない (preset 由来の enabledLayers のみ参照)

> 起票日: 2026-05-08
> 起票経緯: WI-092 / WI-093 v0.130.0 post-publish dogfood で発見。`project.preset: "strict"` + `layers.L4.enabled: false` override 環境で `validate --layer L4` は 0 validators / PASS (= override が runtime に反映) になる一方、`phasegate:status --json` は `data.layers[3].enabled: true` を返す。runtime と status 表示の乖離。

## 背景・症状

WI-091 finding #1 + WI-092 で `createValidatorSystemModule()` への config threading が完了し、`layers.L4.enabled: false` の user override は `validate --layer L4` で正しく runtime gate に反映されるようになった。

dogfood 検証 (`/private/tmp/phasegate-dogfood-wi092-093-verify`, `npx phasegate@0.130.0`) で次の挙動を確認:

```jsonc
// phasegate.config.json
{
  "project": { "preset": "strict" },
  "layers": { "L4": { "enabled": false } }
}
```

```bash
$ npx phasegate phasegate:status --json | jq '.data.presetInfo, .data.layers'
{
  "name": "strict",
  "enabledLayers": ["L1", "L2", "L3", "L4"]   # ← preset 由来の enabledLayers
}
[
  { "layerId": "L1", "enabled": true,  "lastResult": "unknown" },
  { "layerId": "L2", "enabled": true,  "lastResult": "unknown" },
  { "layerId": "L3", "enabled": true,  "lastResult": "unknown" },
  { "layerId": "L4", "enabled": true,  "lastResult": "unknown" }   # ← override 無視
]

$ npx phasegate validate --layer L4 --format human
=== バリデーション結果 ===
総合判定: PASS ✓
バリデータ: 0件 (合格:0 失敗:0 スキップ:0)   # ← override が runtime には反映されている
```

`phasegate:status` の表示と `validate --layer L4` の runtime 挙動が乖離している。L4 が事実上無効化されているのに status は「enabled」と申告する。

## 根本原因 (grep 確認済)

| ファイル | 行 | 内容 |
|---------|---|------|
| `scripts/harness/harness-api/infrastructure/adapters/harness-config-query-adapter.ts` | 46-51 | `getPresetInfo()` が `config.project.preset` から `PRESET_LAYERS[preset]` を引くだけで、`config.layers[].enabled` override を参照しない |
| `scripts/harness/harness-api/domain/services/status-derivation-service.ts` | 95 | `derive()` が `presetInfo.enabledLayers.includes(layerId)` のみで `enabled` を決定 (override の経路なし) |

note: 同 service の deprecated 旧 `derive()` (line 32-) は `config.layers[].enabled` を参照していたが、新版は `presetInfo` のみを参照している。WI-085 で status 経路を再設計した際に override 反映が落ちた可能性 (要 git blame 確認、本 WI 実装時)。

## 実装方針 (2 候補)

### 候補 A: adapter で override を畳み込む (推奨)
`HarnessConfigQueryAdapter.getPresetInfo()` で `config.layers[].enabled === false` の layer を `enabledLayers` から除外し、逆に preset で disabled の layer に `enabled: true` の override があれば追加する。`presetInfo.enabledLayers` を「effective enabled layers」のセマンティクスに揃える。

メリット: caller (`status-derivation-service.ts`) のロジック不変。
デメリット: `presetInfo.enabledLayers` の意味が「preset 由来」から「effective」に変わるため、他 caller / docs の意図次第で混乱の余地。

### 候補 B: derive() に config を thread して override を別経路で反映
`StatusDerivationService.derive()` の input に `layerOverrides: Record<LayerId, boolean | undefined>` を追加し、line 95 で `enabled = presetInfo.enabledLayers.includes(layerId) && layerOverrides[layerId] !== false || layerOverrides[layerId] === true` 風の合成。`presetInfo.enabledLayers` の意味は「preset 由来」のまま。

メリット: 意味論が分離されて分かりやすい。preset と override が UI 上区別可能。
デメリット: derive() の signature 変更で test/呼び出し箇所の更新が必要。

WI-091/WI-092 の流れ (config を caller 側で resolved して thread) と一貫させるなら **候補 B** が望ましい。最終判断は実装フェーズで行う。

## カテゴリ判定
- 種別: 既存コードの bugfix (status 表示の override 反映漏れ)
- API 契約変更: PresetInfo or derive() input の軽微な変更可能性 (内部 API のみ)
- 新ドメインモデル / レイヤー構造変更なし
- 単一 Unit (`harness-api`) 内に閉じる
- type: fix、severity: trivial (`validate --layer L?` の runtime 挙動は正しく override を honor しているので実害なし、表示のみの乖離)
- **quick-implementor 案件** (新ドメインモデルなし、API 契約は内部のみ、Unit 単一)

## 受け入れ基準
- [x] `phasegate:status` で `layers[N].enabled` が `config.layers[N].enabled` override を反映する
- [x] `presetInfo.enabledLayers` は status 表示用の effective enabled layers として実装
- [x] dogfood: unit test で `project.preset: "strict"` + `layers.L4.enabled: false` の L4 disabled を確認
- [x] dogfood: unit test で `project.preset: "minimal"` + `layers.L4.enabled: true` の L4 enabled を確認
- [x] 既存 status derivation test green、新規 unit test 追加 (override 反映 case)
- [x] L1 / L2 (metadata, test-quality) 維持
- [x] post-publish dogfood: `npx phasegate@0.133.0 phasegate:status --json` で `minimal + L4.enabled:true` と `strict + L4.enabled:false` の両方向override表示を確認

## publish / dogfood 結果

- publish: `phasegate@0.133.0` として npm publish 済み (2026-05-08)
- npm registry: `npm view phasegate@0.133.0 version dist.tarball` で `version = '0.133.0'` と tarball URL を確認
- dogfood fixture: `/private/tmp/phasegate-dogfood-0.133.0`
- `project.preset: "minimal"` + `layers.L4.enabled: true`
  - command: `npx phasegate@0.133.0 phasegate:status --json`
  - result: `data.layers[]` の L4 が `{"layerId":"L4","enabled":true,"lastResult":"unknown"}`、`presetInfo.enabledLayers` に `L4` が含まれる
- `project.preset: "strict"` + `layers.L4.enabled: false`
  - command: `npx phasegate@0.133.0 phasegate:status --json`
  - result: `data.layers[]` の L4 が `{"layerId":"L4","enabled":false}`、`presetInfo.enabledLayers` は `["L1","L2","L3"]`
- conclusion: status表示経路が runtime config の `layers.L?.enabled` override をpublished packageでも反映している。

## 実害評価 (なぜ severity: trivial か)
- runtime の `validate --layer L?` は WI-091/WI-092 の config threading により override を正しく honor → 実際の検査挙動は正しい
- 影響は `phasegate:status` / `phasegate:check-ready` の表示のみ
- ユーザーが「L4 を無効化したつもりが status 上 enabled に見える」混乱の温床にはなる (UX 不整合)
- 下流: status JSON を読んで挙動を分岐させる外部スクリプトがあれば実害化する可能性あり (現状 reporter なし)

## スコープ外
- `phasegate:status` の `lastResult` フィールドの semantics 整備 (別 issue)
- WI-094 (severity 集計) / WI-095 (pointers spec)
- preset と override の precedence 定義 ADR (別 doc 起票判断は実装時)

## 関連
- WI-091 description.md finding #1 (L4 enabled gate runtime 反映の先行修正)
- WI-092 description.md (validator-system module への config threading sweep)
- v0.130.0 dogfood verification (`/private/tmp/phasegate-dogfood-wi092-093-verify`)
- `scripts/harness/harness-api/infrastructure/adapters/harness-config-query-adapter.ts:46-51`
- `scripts/harness/harness-api/domain/services/status-derivation-service.ts:95`

## 教訓フィードバック (memory 適用)
- `feedback_dogfood_before_release.md`: status / display 経路は runtime 経路と独立に config 反映確認が必要。runtime の test (`validate --layer L4` が override を honor) だけでは status 表示の乖離を検知できない。今後 config 関連改修時は (1) runtime 挙動 (2) status / 表示の両方で dogfood する規律へ拡張する候補。

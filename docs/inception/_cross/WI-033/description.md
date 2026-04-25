---
id: WI-033
type: refactor
severity: normal
status: drafted
affects: [validator-system, phase2-extensions]
---

# WI-033: doc-freshness / pointer-validation を L4 validator に昇格

> 起票日: 2026-04-25
> 親 audit: WI-030

## 背景

`phase2-extensions` unit に以下 2 機能が CLI として実装されている:

- `p2:check-freshness` — design doc の最終更新日が threshold を超過していないかチェック
- `p2:validate-pointers` — design doc 内の相対パス pointer 参照の有効性検証

一方、`validator-system` の L4 validators には登録されておらず、`validate --layer L4 all` では実行されない。これにより:

1. layer-model.md docs では「L4 = scheduled」「drift / freshness / pointer」と書かれていたが、実際には L4 = drift / consistency / dead-code の 3 つだけで freshness / pointer は別経路だった（WI-029 で誤って追加した記述を WI-030 で削除予定）
2. `consistency-check.yml` workflow で全 L4 を走らせても freshness / pointer はチェックされない
3. user が `--layer L4` を期待値どおりに使えない

## 本 WI でやること

### Phase 1: validator-id 登録

1. `L4-004 doc-freshness` / `L4-005 pointer-validation` を `validator-id.ts` に追加
2. `phase2-extensions` の既存 use case を `validator-system` の `RunL4ValidatorsUseCase` から呼び出せるよう port 経由で接続

### Phase 2: composition root 配線

1. `validator-system/composition-root.ts` で L4-004/L4-005 の Validator definition を登録
2. preset (`minimal` / `standard` / `strict`) ごとの enabled 判定を追加
3. unit test と IT test で L4 全 5 validator が走ることを回帰

### Phase 3: docs と template 更新

1. layer-model.md の L4 表に L4-004 / L4-005 を追加
2. consistency-check.yml workflow が `--layer L4` を呼ぶ場合、自動的に新 validator も走る（WI-031 統一 template と連動）

## 受け入れ基準

- [ ] `npx phasegate list-errors --layer L4` に L4-004 / L4-005 が表示される
- [ ] `npx phasegate validate --layer L4` が freshness / pointer も実行する
- [ ] preset 設定で個別 enable/disable できる
- [ ] phase2-extensions の `p2:check-freshness` / `p2:validate-pointers` CLI は backwards-compatible に維持
- [ ] validator-system の unit/IT test 全 PASS

## スコープ外

- threshold 値の preset ごとのチューニング（既存値を踏襲）
- p2 系コマンドの完全な移管（CLI は当面双方残す）

## 関連

- `scripts/harness/phase2-extensions/application/usecases/check-doc-freshness-usecase.ts`
- `scripts/harness/phase2-extensions/application/usecases/validate-pointers-usecase.ts`
- `scripts/harness/validator-system/composition-root.ts`
- `scripts/harness/validator-system/domain/value-objects/validator-id.ts`

# TDD実装計画: WI-264 — reconcile orphan skill prune

<!-- @work-item-id WI-264 -->

## 1. スコープ

- 対象: `reconcile` がバンドル離脱スキル（orphan）を consumer 側で prune する（WI-256 defer の follow-up）。
- 影響する層: application（`run-reconcile.ts`）/ presentation（`reconcile-handler.ts` 型追従）/ IT テスト。domain は既存 `removeEntry` 再利用、infrastructure 無変更。
- 受け入れ基準: description.md の AC 参照。

## 2. 前提条件検証

- installation unit の上位設計: `docs/product/construction/installation/logical_design.md` / `domain_model.md` 存在済み（phase gate 通過条件を満たす）。
- 本 WI の設計文書: `docs/inception/_cross/WI-264/{description,logical_design,domain_model}.md` 作成済み。
- 判定: ✅ 実装準備完了（既存 unit の追加機能、新規テスト設計は既存 IT スイートへの追記で充足）。

## 3. TDD実装順序

### 1. ITテスト（RED → GREEN → REFACTOR）
`reconcile-handler.test.ts` に以下を追加（application usecase を composition-root 経由で結線した統合テスト。ドメイン層モックなし）:

| 対象 | テスト内容 |
|------|----------|
| shared install prune | manifest + disk に注入した orphan `skills/legacy-orphan` が apply で消え、manifest からも除去される |
| personal install prune | `.codex/skills/legacy-orphan` が prune され、user-owned skill は残る |
| user-owned 保護 | manifest 外 `skills/user-owned` は prune されない |
| .harness-version 保護 | prune 実行後も `skills/.harness-version` が残る |
| dry-run | prune plan item は出るがディスク・manifest 不変 |
| no-orphan no-op | 通常 reconcile は prune plan item 0 件 |
| idempotency | apply 2 回目は prune 0 件 |

**実行方式:** メインセッションで直接実行（`npx vitest run reconcile-handler`）。

### 2. Unit テスト
本 WI は既存 domain 値オブジェクトに新規不変条件を追加しないため、専用 unit テストは追加しない（orphan 判定は application 内の純粋ロジックで、IT で網羅する）。

## 4. 実装内容（レイヤー別）

- **application `run-reconcile.ts`**:
  - `ReconcileAction` に `"prune"` を追加。
  - outcome 型に optional `prune?: boolean` を追加。
  - `planOrphanSkills(input, manifest)` を追加（logical_design のロジック）。
  - `execute` の skill 計画後に呼び出し、outcome を push。
  - apply ループに prune 分岐を追加（`rm` + `nextManifest.removeEntry`）。
- **presentation `reconcile-handler.ts`**: `ReconcileAction` 拡張の型追従のみ（表示コードは既存の `item.action` で対応）。

## 5. 環境検証チェックリスト

- [x] `npx phasegate lint` が現状 green（ベースライン）。
- [x] `reconcile-handler.test.ts` の既存テストが green（ベースライン）。
- [ ] 実装後: 追加テスト含め green / lint 0 / L2 PASS。

## 6. QA（不明点・確認事項）

ユーザーは本 WI スコープを事前承認済み。設計上の未解決 [Question] なし。

## 7. 前提条件・リスク

- リスク: orphan 判定が広すぎるとユーザースキルを誤削除する → INV-P1（manifest-scoped）で緩和。テストで user-owned 保護を明示検証。
- リスク: `.harness-version` を skill 名として誤認 → INV-P2 で名前抽出時に除外。テストで保護を検証。

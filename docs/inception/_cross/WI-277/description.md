---
id: WI-277
type: chore
severity: high
status: drafted
affects: [regression-suite]
---

# WI-277: regression-suite の ❌ 格下げ 13 行への実テスト追加と誠実な ✅ 昇格

<!-- @work-item-id WI-277 -->

> 起票日: 2026-07-16
> 前提: WI-270 が regression-suite の `coverage_report.md` を「100% → 76.4%（⚠️）」に反ロンダリング訂正し、Infrastructure Adapter 7 種・統合フロー 4 種・H14-01-AC-6・H15-01-AC-5 の計 13 行を ❌ に格下げした（旧引用 `IT-REPO-*` / `IT-API-*` は 1 件も実在しない捏造 ID だった）。WI-275 が attestation 返済・marker 除去を完了しているため、新たな ✅ には「実在し pass するテスト」+ `<!-- @attestation <story-id> -->` が必須（L2-016 が形状、L3-007 が matrix 上での実在を fail-closed で検証）。

## スコープ

1. **❌ 13 行への実テスト追加**: Infrastructure Adapter 7 種と統合フロー 4 種の ❌ 行に対し、実 adapter を実 FS/実データで叩く統合テストを新規追加する。UseCase テストと違い、モックで済ませず実挙動を検証する。
2. **H14-01-AC-6 / H15-01-AC-5 の裏付け**: 前者は `VitestTestRunnerAdapter` の実行結果検証、後者は `MarkdownMigrationMappingRepositoryAdapter` の実 FS 保存検証で裏付ける。
3. **coverage_report の誠実な昇格**: 実在テストで裏付けられた行のみ ✅ + 実 ID + `<!-- @attestation <story-id> -->` に昇格。headline を分子分母明記で再計算。訂正履歴に WI-277 エントリを追加。
4. **ソースギャップの誠実な扱い**: 実ソースが設計仕様どおり通せない項目（`findAll()`/`findById()` が stub、`HarnessConfigQueryAdapter` の config 読取り未実装 等）は ❌ のまま残し、ギャップを具体記載する（テストを弱めない・ソース修正はスコープ外）。

## ID 採番方針（捏造範囲の非再利用）

WI-270 が「1 件も実在しない」と確定した捏造 prefix `IT-REPO-<Name>-NNN` / `IT-API-<Name>-NNN` は**再利用しない**。本 WI の新規テストには誠実性を明示する別 prefix を採番する:

- `IT-ADP-*` — Infrastructure Adapter の実 FS/実データ統合テスト（旧 `IT-REPO-*` の代替）
- `IT-FLOW-*` — cross-layer 統合フローの実配線テスト（旧 `IT-API-*` の代替）

これにより「昇格した ✅ の根拠は WI-270 が捏造と断じた ID とは別物の、新たに実在するテストである」ことが coverage_report・matrix 双方で一目瞭然になる。

## テスト方針

- 全て `scripts/harness/__tests__/integration/regression-suite/` 配下に配置。
- Adapter テストは実 adapter インスタンスを生成し、`mkdtemp` の実一時ディレクトリ・実ファイルを相手に検証する（FS I/O をモックしない）。
- ドメイン層のモックは禁止。ドメイン集約・VO は実体を組み立てて渡す。
- AAA パターン・日本語テストケース名を厳守。

## 検証

- regression-suite unit/integration スイート全 green。
- `phasegate:generate-matrix` 再生成後、L2 PASS / L3-007 PASS（L3-004/005 も維持）。
- `npx phasegate lint` 0 violations。

---
id: WI-129
type: issue
severity: normal
status: tested
affects: [validator-system, documentation]
source: internal
---

# WI-129: L2 test-quality validator must enforce framework-agnostic AAA semantics

> 起票日: 2026-05-09
> 起票経緯: README / layer-model review で、L2 `test-quality` が AAA pattern / `actual` variable / single-act-per-test / domain mock 禁止を保証するように記載されている一方、現状実装は TypeScript/Vitest 風の日本語テスト名と `const actual` の軽量チェックに留まっていることを確認した。

## 背景

README と guide は、L2 の `test-quality` を「AAA pattern を機械的に保証する validator」として説明している。Quick Mode でも L2 test-quality は維持されるため、この validator は PhaseGate のテスト規律の中核である。

ただし AAA は Vitest / Jest / pytest / Go testing など特定の runner に依存する記法ではなく、テストケースが「前提を組み立てる」「観測対象の動作を 1 つ実行する」「観測結果を検証する」という意味構造を持つかどうかのアーキテクチャ規約である。

現状の `BiomeAstTestQualityAnalyzerAdapter` は、主に `it()` / `test()` 名の日本語チェックと、`expect()` があるファイルに `const actual` が存在するかのファイル単位チェックを行う。これは useful な初期チェックだが、TypeScript/Vitest 系の構文に寄っており、README が約束している Arrange / Act / Assert の意味構造、Act の単一性、Assert 対象、domain layer test の mock 禁止までは保証できない。

これは新しい validator の追加ではなく、既存 `L2-003 test-quality` を README contract に合わせて実用品質へ引き上げる改善である。

## 本 WI でやること

1. L2-003 の検査 contract を `docs/principles/testing-rules.md` と README / guide の表現に合わせ、特定の test runner に依存しない semantic model として明文化する。
2. `TestCaseStructure` / `ArrangeStep` / `ActStep` / `AssertStep` のような runner-independent な中間表現を定義する。
3. TypeScript/Vitest など既存環境向けの parser は中間表現への adapter として実装し、将来 pytest / Go testing / JUnit などを追加できる port 境界を作る。
4. test case 単位で Arrange / Act / Assert の順序と存在を解析し、Act が原則 1 つであることを検出する。
5. `actual` という変数名そのものではなく、「Act の観測結果を名前付き値として保持し、Assert がその観測結果を検証する」構造を検査する。言語別 adapter はローカル規約として `actual` などの推奨名を追加検査してよい。
6. domain layer unit test で内部依存を mock していないことを、framework-specific mock API ではなく「制御不能な外部依存以外を置き換えていないか」という policy として表現する。
7. false positive を避けるため、parameterized tests / async tests / lifecycle E2E / setup helper の fixture を、少なくとも 2 種類以上の test style で追加する。

## 受け入れ基準

- [ ] `L2-003 test-quality` が runner-independent な test case semantic model を持つ。
- [ ] `L2-003 test-quality` が file 単位ではなく test case 単位で違反を報告する。
- [ ] AAA comment や特定 runner の関数名だけに依存せず、Arrange / Act / Assert の意味構造が崩れている test を検出できる。
- [ ] Act が複数ある unit test を検出できる。
- [ ] Assert が Act の観測結果ではなく内部実装都合の値を検証している smell を検出または警告できる。
- [ ] domain layer test で内部 module / domain object を mock する違反を、runner-specific API に閉じず policy として検出できる。
- [ ] E2E lifecycle test など、複数 Act が妥当なケースの例外 policy が docs と tests にある。
- [ ] Quick Mode でも L2-003 が維持される既存 contract と矛盾しない。

## 関連

- `README.md`: L2 `test-quality (AAA pattern)`
- `README.ja.md`: L2 `テスト品質 (AAA/日本語名)`
- `docs/guide/layer-model.md`: `test-quality` description
- `docs/guide/quick-vs-full-mode.md`: Quick Mode でも AAA test structure は non-negotiable
- `docs/principles/testing-rules.md`
- `scripts/harness/validator-system/infrastructure/adapters/biome-ast-test-quality-analyzer-adapter.ts`

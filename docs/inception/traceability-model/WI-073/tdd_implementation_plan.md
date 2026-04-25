# TDD実装計画: H03-02 (ISSUE-008 Phase B-2)

> **作成日**: 2026-04-19
> **対象ストーリー**: H03-02（@story-idメタデータ + 設計文書累積更新時の付与検証）
> **親 Issue**: ISSUE-008 Phase B-2 — ValidateMetadataCommandHandler 拡張
> **Unit**: traceability-model

## 1. スコープ

### 1.1 対象受け入れ基準
- **AC-1**: `product/construction/{unit}/` 配下のドキュメント更新時、更新箇所に `@story-id HXX-XX` が付与されていることをL2 metadataバリデータが検証する
- **AC-3**: 初回のUnit横断設計（Level 2）で作成された内容にはストーリー注釈不要であることをバリデータが許容する（`initial_creation: true` frontmatter）
- **AC-4**: `@story-id HXX-XX` は設計要素の直前に独立行として記載されることを検証する

AC-2 / AC-5 は既存 `MetadataValidator.validateDesignDocument` / `ValidateDesignStoryAnnotationsUseCase` で既に実装済みのためスコープ外（CLI 経由で呼び出せるようにするのが本 Phase の責務）。

### 1.2 影響する層
| 層 | 変更内容 |
|---|---|
| domain | 変更なし（既存 `MetadataValidator.validateDesignDocument` 使用） |
| application | 変更なし（既存 `ValidateDesignStoryAnnotationsUseCase` 使用） |
| presentation | `ValidateMetadataCommandHandler` に deps 追加 + 拡張子分岐ロジック追加 |
| composition | `composition-root.ts` に新 UseCase の wiring 追加 |

## 2. 前提条件検証

- `implementation-readiness-checker` 実行: **省略**（理由: 本タスクは新規機能ではなく既存 UseCase の wiring 完了作業。traceability-model Unit の全設計文書 logical_design.md / domain_model.md / unit_test_design.md / it_test_design.md / coverage_report.md は既に存在。既存テスト設計は UseCase 層までをカバーしており、CLI handler の拡張子分岐は未カバーだが、これは本 Phase で追加するテストで補完する）
- 判定結果: ✅ 実装準備完了（ただし test design の CLI handler 分岐ケース追記を Phase 2 内で行う）

## 3. TDD実装順序（テストピラミッド準拠）

### 3.1 Unit テスト（presentation 層）

`scripts/harness/__tests__/unit/traceability-model/validate-metadata-command-handler.test.ts` に以下ケースを追加する（既存 5 ケースは後方互換で維持）。

| # | ケース | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-VMC-06 | .md ファイルが与えられた場合、designUseCase に dispatch される | 両 useCase を mock、validImpl + validDesign を stub | handler.execute({filePaths: ['a.md']}) | designUseCase.execute が呼ばれ、implementationUseCase.execute は呼ばれない |
| UT-VMC-07 | .ts ファイルが与えられた場合、implementationUseCase に dispatch される | 両 useCase を mock | handler.execute({filePaths: ['a.ts']}) | implementationUseCase.execute が呼ばれ、designUseCase.execute は呼ばれない |
| UT-VMC-08 | .md と .ts が混在した場合、両方の UseCase が呼ばれ結果が merge される | 両 useCase を mock、それぞれ 1 件の valid を返す stub | handler.execute({filePaths: ['a.md', 'b.ts']}) | actual.results.length === 2、`a.md` と `b.ts` 両方が含まれる |
| UT-VMC-09 | designUseCase が FAIL 結果を返す場合、exitCode 1 | designUseCase が invalid 1 件を返す stub | handler.execute({filePaths: ['design.md']}) | exitCode === 1、text に `FAIL` と該当エラーメッセージ |
| UT-VMC-10 | designUseCase が例外をスローした場合、exitCode 2 | designUseCase.execute が rejected promise | handler.execute({filePaths: ['design.md']}) | exitCode === 2、text に `failed unexpectedly` |
| UT-VMC-11 | 未知拡張子（.txt 等）は implementationUseCase に fallback | implementationUseCase を mock | handler.execute({filePaths: ['foo.txt']}) | implementationUseCase.execute が呼ばれる（後方互換） |
| UT-VMC-12 | 入力順序が結果に保持される | .md → .ts → .md の順で渡す | handler.execute | actual.results[0].filePath === 'a.md' ... `[2].filePath === 'c.md'` |

### 3.2 IT テスト（composition-root 経由）

本 Phase では composition-root 統合テストは追加しない。理由: 既存の IT テスト設計（it_test_design.md）は Port-Adapter / Gateway 境界を検証対象としており、composition-root 自体の DI wiring は既存 IT テストカバレッジの対象外（pure wiring は Unit テストで十分）。

### 3.3 E2E テスト

本 Phase ではスキップ。理由: ISSUE-008 Phase B-3 で pre-commit 経由の end-to-end 経路を完成させる際に、CLI 実行の E2E テストを追加するほうが自然。

### 3.4 実装手順

1. **RED**: `validate-metadata-command-handler.test.ts` に UT-VMC-06〜12 を追加 → 失敗を確認
2. **GREEN**: `validate-metadata-command-handler.ts` の deps と execute() を拡張して全ケースを通す
   - `deps.validateDesignStoryAnnotationsUseCase` を追加
   - `execute()` 内で拡張子でファイルパスを分類 → 各 UseCase を呼び分け → 入力順序を保持してマージ
3. **REFACTOR**: 拡張子判定ロジックを private method に抽出（例: `private classify(filePaths): { design: [], implementation: [] }`）
4. **配線**: `composition-root.ts` に新 UseCase 生成と handler deps への注入を追加
5. **既存テスト全パス確認**: `pnpm test`

### 3.5 拡張子判定の仕様

| 拡張子 | 分岐先 | 理由 |
|---|---|---|
| `.md` | `validateDesignStoryAnnotationsUseCase` | 設計文書の `@story-id` インライン注釈検証 |
| `.ts` / `.tsx` / `.js` / `.mjs` / その他 | `validateImplementationMetadataUseCase` | 既存仕様（ソースファイルの `@unit` / `@layer` 検証）を後方互換で維持 |

> **Note**: `.md` 以外のテストファイル（`.test.ts` 等の `@story` タグ検証）は Phase C-2 で別途 `validateTestStoryMetadataUseCase` を wiring する。本 Phase では `.ts` は全て implementation として扱う（後方互換）。

## 4. 環境検証チェックリスト（事前実行結果）

- [x] `pnpm test` で既存テスト 3039 件が全パス（v0.49.0 時点）
- [x] `scripts/harness/traceability-model/application/usecases/validate-design-story-annotations-usecase.ts` が実装済み
- [x] `scripts/harness/traceability-model/domain/services/metadata-validator.ts` の `validateDesignDocument` が実装済み
- [x] `scripts/harness/traceability-model/infrastructure/gateways/markdown-design-document-gateway.ts` 経由で `readFrontmatterFlags` / `readStoryAnnotations` が提供されている

## 5. QA（不明点・確認事項）

### [Question] Q1: `.md` だが `docs/product/construction/` 配下ではないファイルへの扱い

ユーザーが誤って README.md や docs/inception/ の計画文書を `validate-metadata` に渡した場合、validateDesignDocument が呼ばれるが、初回作成（`initial_creation: true`）でなければ annotation 0 件でも PASS する（`MetadataValidator.validateDesignDocument` の仕様）。

これは現状維持でよいか？

**推奨案:** 現状維持（CLI 側でパスフィルタはしない）。理由:
1. 将来 pre-commit で `git diff --cached` 経由で渡される `.md` は必然的に docs 以下に限られる
2. CLI としては渡されたファイルを素直に検証するのが SRP
3. ユーザーが手動で README.md を渡しても `initial_creation` が false なら無害に PASS する

[Answer]
承認（2026-04-19 ユーザー確認済）。推奨案通り進める。

---

### [Question] Q2: 未知拡張子のフォールバック先

`.txt` / `.yml` 等、`.md` でも `.ts` でもない拡張子が与えられた場合、implementationUseCase に fallback するか、エラー化するか？

**推奨案:** implementationUseCase に fallback（後方互換維持）。理由:
1. 現状の handler は拡張子チェックしていないため、`.txt` でも implementationUseCase を呼んでいた（ただし `readSource` が失敗して exitCode 2 になる）
2. 挙動を変えるなら別 Phase で検討
3. `.md` だけ特別扱いするのが本 Phase のスコープ

[Answer]
承認（2026-04-19 ユーザー確認済）。推奨案通り進める。

---

### [Question] Q3: 結果 merge の順序保持

`filePaths: ['a.md', 'b.ts', 'c.md']` の順で渡した場合、`actual.results` も入力順 (`a.md`, `b.ts`, `c.md`) を保持すべきか、それともまとめて（`a.md, c.md, b.ts` のようにグループ化）返すか？

**推奨案:** 入力順を保持。理由: CLI 出力の可読性（ユーザーは渡した順に結果を読みたい）。実装方針: ファイルパスを拡張子で分類する際に元 index を記録し、両 UseCase 実行後に index で sort する（または Map で O(1) lookup する）。

[Answer]
承認（2026-04-19 ユーザー確認済）。推奨案通り進める。

## 6. 前提条件・リスク

### リスク
- **R1**: `ValidateDesignStoryAnnotationsUseCase` が `DesignDocumentReadApplicationError` を throw する挙動は、既存 `ValidateImplementationMetadataUseCase` の挙動と異なる可能性がある。handler の catch ブロックで両方の例外を同じ `exitCode: 2, text: 'failed unexpectedly'` に丸められるかを Phase 2 RED で確認。
- **R2**: テスト mock が両 UseCase の Pick<..., 'execute'> 型に合致するよう注意。既存テストの mock shape を流用する。
- **R3**: composition-root が内部 API（他 Unit から import されない）とはいえ、`validateMetadataCommandHandler` の DI shape 変更は他箇所で参照されていないか確認。現時点で `main.ts:558` のみ参照しており、main.ts は Module.validateMetadataCommandHandler を使うだけで deps は触らないため影響なし。

### 前提
- testing-rules.md の AAA パターン・日本語テスト名・kebab-case ファイル名・mock 禁止（ドメイン層）を遵守
- L1 全ルール（require-unit-comment / require-layer-comment 等）維持

## 7. 完了基準

- [ ] UT-VMC-06〜12 の 7 ケースが全て GREEN
- [ ] 既存 UT-VMC-01〜05 が全てパス（後方互換確認）
- [ ] `pnpm test` で全 3000 件超がパス
- [ ] `npx phasegate lint` で L1 違反 0 件
- [ ] `npx phasegate validate-metadata docs/product/construction/traceability-model/logical_design.md` が実行可能（手動確認）
- [ ] composition-root.ts に新 UseCase の wiring が追加されている

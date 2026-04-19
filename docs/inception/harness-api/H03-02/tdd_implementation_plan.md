# TDD実装計画: H03-02 Phase B-3（pre-commit に .md 設計文書検証を接続）

> **作成日**: 2026-04-19
> **対象ストーリー**: H03-02 AC-1（`product/construction/{unit}/` 配下の設計文書更新時に `@story-id` 付与を L2 metadata バリデータで検証）
> **親 Issue**: ISSUE-008 Phase B-3 — pre-commit 自動検証経路の完成
> **Unit**: harness-api（pre-commit エントリポイント）

---

## 1. スコープ

### 1.1 対象受け入れ基準
- **AC-1**: `product/construction/{unit}/` 配下のドキュメント更新時、更新箇所に `@story-id HXX-XX` が付与されていることを **pre-commit 経路で自動検証**する
  - Phase B-2（v0.50.0）で CLI `validate-metadata` からの検証は完成済み
  - 本 Phase B-3 は「CLI → pre-commit 自動起動」の配線を完結させる

### 1.2 スコープ外（Phase 分離）
- `.ts` ファイルの既存検証フロー変更（後方互換維持）
- `TraceabilityMetadataPolicyAdapter`（軽量 validator）の挙動変更
- `phasegate.config.json` の設定スキーマ拡張 → **ISSUE-012** で別途対応
- 他言語対応（`.py` / `.go` 等）→ **ISSUE-012** で別途対応
- テストファイル（`*.test.ts`）の `@story` タグ pre-commit 検証 → **Phase C-3** で別途対応

### 1.3 影響する層
| 層 | 変更内容 |
|---|---|
| domain | 変更なし |
| application | 変更なし（既存 `ValidateDesignStoryAnnotationsUseCase` を使用） |
| presentation | `pre-commit.ts` に `.md` 分岐 + `createTraceabilityModelModule` 呼び出し追加 |
| composition | 変更なし（既存 composition-root をそのまま利用） |

---

## 2. 前提条件検証

- `implementation-readiness-checker` 実行: **省略**（理由: Phase B-2 完了済みで `validateMetadataCommandHandler` が composition-root 経由で取得可能。本 Phase は既存ハンドラーを pre-commit エントリから呼ぶだけの配線作業）
- harness-api Unit の設計文書: `logical_design.md` / `domain_model.md` / `it_test_design.md` / `unit_test_design.md` / `coverage_report.md` は全て存在（Wave 2 で整備済み）
- 判定結果: ✅ 実装準備完了

---

## 3. TDD実装順序（テストピラミッド準拠）

### 3.1 Unit テスト（pre-commit ロジック抽出）

現状の `pre-commit.ts` は `main()` 関数が `getStagedFiles()` / `buildReport()` / I/O を一気に実行しているためテスタビリティが低い。本 Phase で以下を抽出する:

```typescript
export async function runPreCommit(
  stagedFiles: readonly string[],
  deps: PreCommitDeps,
): Promise<PreCommitResult>
```

この関数を単体テスト対象とし、テストファイル `scripts/harness/__tests__/unit/harness-api/pre-commit.test.ts`（新規）に以下ケースを追加する。

| # | ケース | Arrange | Act | Assert |
|---|---|---|---|---|
| UT-PC-01 | staged が空の場合、exit 0 | stagedFiles: [] | runPreCommit([], deps) | actual.exitCode === 0、stdout に "No staged files to check" |
| UT-PC-02 | staged が .ts のみの場合、L2 validator が呼ばれる | stagedFiles: ['a.ts']、deps.runL2ValidatorsUseCase を spy | runPreCommit(['a.ts'], deps) | runL2ValidatorsUseCase.execute が targetPaths=['a.ts'] で呼ばれる、validateMetadataCommandHandler は呼ばれない |
| UT-PC-03 | staged が .md のみの場合、validateMetadataCommandHandler が呼ばれる | stagedFiles: ['docs/product/construction/foo/logical_design.md']、deps.validateMetadataCommandHandler を spy | runPreCommit で同 path | validateMetadataCommandHandler.execute が filePaths=[その path] で呼ばれる、runL2ValidatorsUseCase は呼ばれない |
| UT-PC-04 | .ts と .md が混在、両方呼ばれて両セクション出力 | 両 deps stub、全 PASS | runPreCommit(['a.ts', 'b.md']) | actual.exitCode === 0、stdout に `TypeScript` セクションと `設計文書` セクションの両方が含まれる |
| UT-PC-05 | .ts 成功、.md 失敗 → exitCode 1 | runL2 は passed=true、validateMetadata は exitCode=1 を返す stub | runPreCommit 両 file | actual.exitCode === 1、stdout に "Commit blocked" |
| UT-PC-06 | .ts 失敗、.md 成功 → exitCode 1 | 逆パターン | runPreCommit | actual.exitCode === 1 |
| UT-PC-07 | .md validateMetadata が exitCode 2（例外）返却 → pre-commit も exitCode 2 | validateMetadata を exitCode=2 stub | runPreCommit | actual.exitCode === 2 |
| UT-PC-08 | .ts / .md 以外（.json / .yml 等）は除外される | stagedFiles: ['a.ts', 'b.json', 'c.md'] | runPreCommit | runL2 は ['a.ts']、validateMetadata は ['c.md']、'b.json' はどちらにも渡らない |

### 3.2 IT テスト（CLI end-to-end）

既存 `pre-commit-cli.integration.test.ts` に以下ケースを追加する（CLI 経由・子プロセス起動で検証）。

| # | ケース | Arrange | Act | Assert |
|---|---|---|---|---|
| IT-PC-09 | staged に .md のみある場合、CLI は起動して検証を実行する（"No staged TypeScript files" でスキップしない） | 一時 git 作業木で `.md` を staged | runCli(['pre-commit'], workDir) | stdout に "No staged TypeScript files" を含まない（回帰防止） |
| IT-PC-10 | staged に .md も .ts も無い場合は従来通り exit 0 + スキップメッセージ | 空の staged | runCli | actual.exitCode === 0 |

### 3.3 E2E テスト

本 Phase ではスキップ。理由: Phase B-2 で CLI 経路の end-to-end は動作確認済み。pre-commit 経路の実挙動は IT-PC-09 でカバー。

### 3.4 実装手順

1. **RED**: `scripts/harness/__tests__/unit/harness-api/pre-commit.test.ts` を新規作成し UT-PC-01〜08 を記述 → テスト失敗を確認（runPreCommit 関数未定義）
2. **GREEN 1**: `scripts/harness/integrations/pre-commit.ts` から `runPreCommit()` 関数を抽出・export し、UT-PC-01〜08 を通す
   - `PreCommitDeps` 型定義
   - `runPreCommit()` で .ts / .md 分離ロジック + セクション別レポート生成
   - `main()` は `runPreCommit()` を呼ぶ薄いラッパーに retrofit
3. **GREEN 2**: `main()` 内で `createTraceabilityModelModule(process.cwd())` を呼んで `validateMetadataCommandHandler` を取得し deps に渡す
4. **GREEN 3**: IT テスト（IT-PC-09, IT-PC-10）を追加 → 実 CLI 起動でパス確認
5. **REFACTOR**:
   - 「No staged TypeScript files」→ 「No staged files to check」にメッセージ改訂（.md も対象になるため）
   - セクション見出しの ANSI カラー統一
6. **既存テスト全パス確認**: `pnpm test`
7. **手動確認**: `.md` staged ファイルありの状態で `npx phasegate pre-commit` を実行して挙動確認

### 3.5 出力フォーマット仕様

```
[phasegate] Pre-commit check (3 .ts file(s), 2 .md file(s))

== TypeScript 実装 (3 file(s)) ==
[既存の HumanValidationResultFormatter 出力]

== 設計文書 (2 file(s)) ==
[ValidateMetadataCommandHandler の text 出力をそのまま埋め込み]

[phasegate] All checks passed.   OR   [phasegate] Commit blocked.
```

- セクション見出しは `\x1b[1m==\x1b[0m` の太字
- 片方のファイル種別のみの場合は該当セクションのみ表示（見出しも省略）

---

## 4. 環境検証チェックリスト（事前実行結果）

- [x] `pnpm test` で既存テスト全パス（v0.51.0 時点）
- [x] `scripts/harness/traceability-model/composition-root.ts` に `validateMetadataCommandHandler` が export 済み
- [x] `scripts/harness/integrations/pre-commit.ts` が現状 `.ts` 固定で動作する（回帰ベースライン）
- [x] `scripts/harness/__tests__/integration/harness-api/pre-commit-cli.integration.test.ts` が既存パターンとして存在

---

## 5. QA（不明点・確認事項）

### [Question] Q1: 結果マージの方針（案 A vs 案 B）

pre-commit.ts の既存出力（`HumanValidationResultFormatter` の `AggregatedValidationReport`）と `ValidateMetadataCommandHandler` の出力（`MetadataValidationOutput[]` の text 整形）は型が異なる。

- **案 A**: `.md` 結果を `ValidationResultContract[]` に変換して既存 `buildReport` に流し込み、単一レポートに統合
  - 利点: 見た目が完全に統一される
  - 欠点: 変換ロジック（`MetadataValidationOutput` → `ValidationResultContract`）が必要。validatorId の命名 / errors[].code / suggestion 欠落の扱いなど設計判断が発生
- **案 B**: `.md` 結果を別セクションで表示し、exitCode のみ max 統合
  - 利点: 実装が簡単・既存フォーマットへの影響ゼロ。変換ロジック不要
  - 欠点: 出力が 2 セクションに分かれる（ただし見出しで明確に区切られるので実害は少ない）

**推奨案:** **案 B**。理由:
1. 変換ロジックは実質的に情報損失を伴う（`MetadataValidationOutput` の warnings フィールドは `ValidationResultContract` に存在しない）
2. セクション分離は「設計文書」と「実装コード」の品質軸の違いを可視化する効果があり、UX 上むしろ望ましい
3. ISSUE-012 で拡張子が増えた場合、セクション数も自然に増やせる構造になる

[Answer]
承認（2026-04-19 ユーザー確認済）。推奨案通り進める。

---

### [Question] Q2: `createTraceabilityModelModule` の `rootDir` 引数

`createTraceabilityModelModule(rootDir)` は Infrastructure gateways（`FileSystemMetadataReader` 等）に渡される。pre-commit.ts で呼ぶ際に何を渡すべきか？

- **案 A**: `process.cwd()` を渡す（git フック実行時はリポジトリルートが cwd）
- **案 B**: git リポジトリルートを明示的に取得（`git rev-parse --show-toplevel`）

**推奨案:** **案 A**（`process.cwd()`）。理由:
1. 既存 `main.ts` でも `process.cwd()` ベースで composition-root を呼んでいる（一貫性）
2. `.husky/pre-commit` は git repo root から起動されるのが標準
3. 案 B を要する環境（subshell 経由・symlink 等）は稀で、必要になってから対応すればよい

[Answer]
承認（2026-04-19 ユーザー確認済）。推奨案通り進める。

---

### [Question] Q3: `.md` staged 0 件 + `.ts` staged 0 件の表示メッセージ

現状は `"No staged TypeScript files. Skipping."` と表示している。`.md` も対象に加わったため、このメッセージは誤解を招く。

- **案 A**: `"No staged files to check. Skipping."` に変更
- **案 B**: `"No staged TypeScript or Markdown files. Skipping."` に変更
- **案 C**: 現状維持（"TypeScript" のみ言及）

**推奨案:** **案 A**。理由:
1. 将来 ISSUE-012 で他言語が増えた際、メッセージを毎回書き換えるのは冗長
2. 「to check」で pre-commit の対象ファイルを抽象化できる
3. 詳細が欲しいユーザーは `phasegate validate-metadata --help` 等で個別に確認可能

[Answer]
承認（2026-04-19 ユーザー確認済）。推奨案通り進める。

---

## 6. 前提条件・リスク

### リスク
- **R1**: `createTraceabilityModelModule(process.cwd())` の初期化コストが高いと pre-commit が重くなる。現状の実装を読む限り Infrastructure gateways は遅延読み込み型なので実害は無いはずだが、IT テストで実行時間を測定し、目標 2 秒以内を確認する
- **R2**: `MetadataValidator.validateDesignDocument` が StoryCatalog を参照するため、`user_stories.md` が見つからない環境（git clone 直後など）で失敗する可能性。ただし handler の catch で exitCode 2 に丸められるため commit がブロックされるだけで安全側に倒れる
- **R3**: 既存 IT テスト 2 ケースが `main()` 改修で動作不能にならないか要確認。`getStagedFiles()` や `"No staged..."` メッセージ変更が既存テストの assertion に影響する可能性

### 前提
- testing-rules.md の AAA パターン・日本語テスト名・kebab-case ファイル名遵守
- L1 全ルール（`@unit harness-api` / `@layer presentation`）維持
- test file は `@story H03-02` タグ付与

---

## 7. 完了基準

- [ ] UT-PC-01〜08 の 8 ケースが全て GREEN
- [ ] IT-PC-09, IT-PC-10 の 2 ケースが全て GREEN
- [ ] 既存 IT テスト（"Cannot find module" 回帰防止 / staged 空で exit 0）が全てパス（後方互換確認）
- [ ] `pnpm test` で全 3050+ 件がパス
- [ ] `npx phasegate lint` で L1 違反 0 件
- [ ] 手動確認: `.md` を staged にした状態で `npx phasegate pre-commit` が期待通り動く
- [ ] `package.json` の version が v0.52.0 に bump されている

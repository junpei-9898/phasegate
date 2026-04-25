# TDD実装計画: H12-01 (ISSUE-007 Wave 1 / Phase A-1 Baseline 機構)

## 1. スコープ

### 対象ストーリー
ISSUE-007 Phase A-1 の受け入れ基準のうち、下記 3 項目を実装する:

- [ ] `npx phasegate baseline` コマンドが実装され、`.phasegate/baseline.json` に sha1 付きファイルリストを保存できる
- [ ] `phasegate.config.json` に `baseline` セクションが追加され、スキーマバリデートされる
- [ ] `npx phasegate baseline --dry-run` / `--force` / `--paths` で制御できる

**Wave 2 以降に繰り延べ** :
- pre-tool-use hook で baseline 内ファイルの編集で phase-gate をスキップする（Wave 2 / Phase A-2）
- HarnessError に `suggestedSkill` / `scaffoldCommand` / `templatePath` を追加（Wave 3 / Phase B）
- `phasegate scaffold-design` CLI（Wave 4 / Phase C-1）
- `docs/guide/retrofit-adoption.md`（Wave 5 / Phase C-2）

### 影響する層
- **Domain（ci-governance）**: `BaselineSnapshot` VO, `BaselineEntry` VO, `FileScannerPort`, `BaselineRepositoryPort`
- **Application（ci-governance）**: `CreateBaselineUseCase`
- **Infrastructure（ci-governance）**: `GlobFileScannerAdapter`, `BaselineJsonRepositoryAdapter`
- **Presentation（ci-governance）**: `CreateBaselineHandler`（`{ output, exitCode }` 形式）
- **Infrastructure（config-foundation）**: `harness-config-v2.schema.json` 拡張

### 配置判断

baseline の CLI / UseCase / 永続化は **ci-governance Unit に配置する**（既存の `ci:migrate-agents-md`, `ci:check-repetition` と同じ governance ツールの仲間として整理）。

- Wave 2 で pre-tool-use hook が baseline を参照するときは、agent-integration → ci-governance の port 依存（`BaselineQueryPort`）を追加する。Wave 1 ではまだ読み出し側を作らないので単純に ci-governance 内で完結。
- baseline の判定ロジック（path マッチ + sha1 検証）は Wave 2 で `BaselineMatcher` ドメインサービスとして追加する。

## 2. 前提条件検証

- `implementation-readiness-checker` 相当の事前チェック:
  - `docs/product/construction/ci-governance/logical_design.md` ✅ 存在
  - `docs/product/construction/ci-governance/domain_model.md` ✅ 存在
  - `docs/product/environment_contract.md` は project 全体で存在（確認済み）
- ストーリー固有論理設計 (`docs/inception/ci-governance/H12-01/logical_design.md`) は **ISSUE-006 Story B 方式に倣い、issue driven の軽量拡張として tdd_implementation_plan.md に集約**する
- テスト設計: 本 plan の「3. TDD 実装順序」セクションで一元管理（ISSUE-006 Story B 方式）

## 3. TDD 実装順序

### Step 1 — Unit テスト RED → GREEN → REFACTOR

配置: `scripts/harness/__tests__/unit/ci-governance/`

| # | テスト ID | 対象 | テストケース |
|---|----------|------|-------------|
| U-1 | UT-CG-BE-001 | `BaselineEntry` VO | `path` と `sha1` を保持する / `sha1` が 40 hex でない場合エラー / `path` が空文字の場合エラー |
| U-2 | UT-CG-BS-001 | `BaselineSnapshot` VO | 複数エントリを保持する / 空リストでも生成できる / 同一 `path` が複数ある場合エラー / `createdAt` が ISO 8601 |
| U-3 | UT-CG-BS-002 | `BaselineSnapshot.contains(path)` | 含まれるパスを true / 含まれないパスを false（Wave 2 向けの前置き、Wave 1 でも実装しておく） |
| U-4 | UT-CG-GS-001 | `GlobFileScannerAdapter` | デフォルト includes=`scripts/**/*.ts` のスキャンが `scripts/harness/main.ts` を含む / `node_modules/**` `dist/**` `**/__tests__/**` を除外する / カスタム includes を指定できる |

### Step 2 — IT テスト RED → GREEN → REFACTOR

配置: `scripts/harness/__tests__/integration/ci-governance/`

| # | テスト ID | 対象 | テストケース |
|---|----------|------|-------------|
| IT-1 | IT-CG-CB-001 | `CreateBaselineUseCase` | 指定 `paths` に対し scanner → sha1 計算 → repository.save の流れが動き、保存された snapshot の entry 数が scanner の返却数と一致する |
| IT-2 | IT-CG-CB-002 | `CreateBaselineUseCase` | `--dry-run` 相当フラグ時は `repository.save` が呼ばれない |
| IT-3 | IT-CG-CB-003 | `CreateBaselineUseCase` | 既存 baseline 有 + `overwrite=false` でエラー / `overwrite=true` で上書き |
| IT-4 | IT-CG-BR-001 | `BaselineJsonRepositoryAdapter` | `.phasegate/baseline.json` にスナップショットを JSON で保存 / 再ロードで同一 entry が取得できる / 保存先親ディレクトリが無ければ自動作成 |
| IT-5 | IT-CG-BR-002 | `BaselineJsonRepositoryAdapter` | 不正 JSON をロードしたら `HarnessError`（ `CONFIG_PARSE_ERROR` 相当） を投げる |
| IT-6 | IT-CG-CH-001 | `CreateBaselineHandler` | 正常系で `exitCode=0` / `output` に保存先パス + エントリ数が出る |
| IT-7 | IT-CG-CH-002 | `CreateBaselineHandler` | dry-run で `exitCode=0` / `output` に「dry run」明示 |
| IT-8 | IT-CG-CH-003 | `CreateBaselineHandler` | overwrite 競合で `exitCode=2` / `output` に `--force` 誘導 |

### Step 3 — Schema 拡張テスト

配置: `scripts/harness/__tests__/integration/config-foundation/`（既存テストファイルに追記）

| # | テスト ID | 対象 | テストケース |
|---|----------|------|-------------|
| IT-9 | IT-CF-BL-001 | config schema | `baseline` プロパティ未指定でも valid（optional） / `baseline.enabled=true` + `baseline.path=.phasegate/baseline.json` で valid / `baseline.enabled` が非 boolean で invalid |

### Step 4 — CLI ルーター結線（main.ts）

- main.ts `case 'baseline':` を追加
  - `--dry-run` / `--force` / `--paths <glob,glob,...>` フラグ解釈
  - `buildCiGovernance(rootDir).createBaselineHandler.handle(...)` を呼ぶ
- help テキスト更新
- **動作確認**（手動）: `npx tsx scripts/harness/main.ts baseline --dry-run` でエラーなく dry-run 出力が出ること

### 実装順序の理由
Unit (domain VO) → IT (UseCase / Adapter) → Presentation (Handler) → CLI wiring の順は Clean Architecture の依存方向に沿う。schema は最後に追加しても良いが、Handler IT で `baseline.json` の path を config 経由で取得するので、schema 拡張はそれ以前に済ませる（Step 3 のタイミング）。

## 4. 環境検証チェックリスト（事前実行結果）

- [x] 既存テスト (`pnpm test`) が通る状態を確認（前 commit 直後）
- [x] `scripts/harness/ci-governance/` の既存構造（handler 3 種、UseCase 8 種）を把握
- [x] `main.ts` の CLI ルーター パターン（`case '<name>':` で handler 呼び出し）を把握
- [x] `phasegate.config.json` と schema の `additionalProperties: false` の厳格度を把握

## 5. QA（不明点・確認事項）

### [Question] Q1: baseline の保存先 Unit（ci-governance / phase-dependency-model）

issue description では「関連コード: `scripts/harness/phase-dependency-model/`（gate 判定ロジック）」と記載があるが、Wave 1 は **CLI による snapshot 生成のみ**。gate 判定ロジックは Wave 2 で追加する。

Wave 1 の CLI 責務は `ci:migrate-agents-md` / `ci:check-repetition` と同じ「governance ツール」の系列。

**推奨案:**
- Wave 1: ci-governance に `CreateBaselineUseCase` / `BaselineRepositoryAdapter` / `CreateBaselineHandler` を配置
- Wave 2: `phase-dependency-model` 側に `BaselineMatcher` domain service を追加し、agent-integration が port 経由で参照

[Answer]
（人間が回答を記入）

---

### [Question] Q2: baseline 対象ファイルのデフォルト glob

issue には「現時点の全ソースファイルのリスト」とだけあり、具体的な include / exclude は未定義。

**推奨案:** デフォルト includes:
- `scripts/**/*.ts`
- `src/**/*.{ts,tsx,js,jsx}`
- `docs/product/construction/**/*.md`
- `docs/inception/**/*.md`

デフォルト excludes:
- `node_modules/**`
- `dist/**`, `build/**`, `.next/**`, `coverage/**`
- `**/__tests__/**`, `**/*.test.ts`, `**/*.spec.ts`（テストは phase-gate 対象外）

CLI `--paths` フラグでカスタム glob を指定可能。config 側 `baseline.include` / `baseline.exclude` は **Wave 1 では未実装**（Wave 2 以降で必要になれば追加）。

[Answer]
（人間が回答を記入）

---

### [Question] Q3: ハッシュアルゴリズムと sha1 の扱い

issue には sha1 明記だが、セキュリティ的には sha256 が推奨。本用途は content integrity のみで衝突攻撃耐性は不要なので sha1 でも実用上問題ない。

**推奨案:** sha1 で実装するが、`BaselineEntry` には将来的な sha256 移行を想定して `algorithm: 'sha1'` フィールドを保持する（保存 JSON にも明示）。

```json
{
  "createdAt": "2026-04-21T12:34:56.000Z",
  "algorithm": "sha1",
  "files": [
    { "path": "scripts/harness/main.ts", "sha1": "abc123..." }
  ]
}
```

[Answer]
（人間が回答を記入）

---

### [Question] Q4: 既存 baseline.json がある場合の挙動

既に `.phasegate/baseline.json` がある状態で再度 `phasegate baseline` を実行したら?

**推奨案:**
- デフォルト: **上書き拒否**（exit 2 + `--force` 誘導メッセージ） — baseline は grandfather ラインなので安易な上書きは危険
- `--force`: 上書き保存
- `--dry-run`: 生成内容を stdout に出すのみ、ファイル書き込みなし

[Answer]
（人間が回答を記入）

---

## 6. 前提条件・リスク

### リスク
- **R1**: glob スキャン時の大量ファイル走査で実行時間がかかる可能性 → ストリーム処理 or 並列化は Wave 1 では YAGNI、順次処理で十分
- **R2**: sha1 計算はバイナリファイルでも動くが、対象拡張子を絞っているので実質テキストのみ
- **R3**: `.phasegate/` ディレクトリが `.gitignore` に含まれていない場合、baseline.json がコミットされる可能性 → **これは意図通り**（チーム共有したい資産）。ただしドキュメントで明示する必要あり → Wave 5 で記載

### 前提
- `picomatch` は既に依存済み（glob 判定に使える）
- `HarnessError` のレジストリに新規エラーコード `BASELINE_OVERWRITE_BLOCKED` / `BASELINE_PARSE_ERROR` を追加する必要あり → `harness-error/infrastructure/registries/` に既存パターンあり

### スキル選択
story-implementor の範囲に該当（新 UseCase / domain VO / adapter 追加あり、quick-implementor のスコープ外）。

---

**承認後、Phase 2 実装を Step 1 から開始します。**

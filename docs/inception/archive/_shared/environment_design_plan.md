# 環境設計計画書（Environment Design Plan）

> **作成日**: 2026-03-11
> **対応Unit**: config-foundation, adr-documentation, biome-toolchain
> **Wave**: 1（基盤構築）
> **ステータス**: Phase 1 計画（人間承認待ち）

---

## Executive Summary

Phasegate v1 の Wave 1 基盤3Unit（config-foundation, adr-documentation, biome-toolchain）の環境要件を横断分析し、**統合技術スタック、ディレクトリ構造、CI/CDパイプライン、マイグレーション計画** を設計する。

**重要決定事項**: 3Unitの論理設計が指定するディレクトリ構造に不整合がある（§5 QA参照）。Phase 2（環境契約書作成）の前に人間による判断が必要。

---

## 1. スコープ（対象コンポーネント一覧）

### 1.1 対象Unit

| Unit | 論理設計指定パス | ファイル数(概算) | 主要技術 |
|------|----------------|-----------------|---------|
| **config-foundation** | `scripts/harness/config-foundation/` | 19 | ajv, Node.js built-in |
| **adr-documentation** | `src/units/adr-documentation/` | 36 | gray-matter |
| **biome-toolchain** | `packages/biome-toolchain/` | 39 (+ Rust/WASM) | Biome, GritQL, Rust |

### 1.2 関連設定ファイル

| ファイル | 配置先 | 役割 |
|---------|-------|------|
| `phasegate.config.json` | プロジェクトルート | Single Source of Truth（K13） |
| `biome.json` | 論理設計: `packages/biome-toolchain/` | Biome統合設定 |
| `tsconfig.json` | プロジェクトルート | TypeScript統一設定 |
| `docs/ADR/` | プロジェクトルート | ADRドキュメント（初期10件） |

---

## 2. 技術スタック

### 2.1 現行 → v1 依存変更

**追加（dependencies）**:

| ライブラリ | バージョン | 用途 | Unit |
|-----------|----------|------|------|
| `ajv` | ^10.0.0 | JSONスキーマバリデーション | config-foundation |
| `gray-matter` | ^4.0.3 | YAMLフロントマターパーサー | adr-documentation |
| `@biomejs/biome` | ^1.9.0 | Biomeリンター/フォーマッター | biome-toolchain |
| `fast-glob` | ^3.3.0 | ファイル列挙 | biome-toolchain |

**追加（devDependencies）**:

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| `@types/gray-matter` | latest | gray-matter型定義 |

**削除（ESLint完全移行）**:

| ライブラリ | 理由 |
|-----------|------|
| `eslint` | Biomeに完全移行 |
| `@typescript-eslint/parser` | Biome native |
| `@typescript-eslint/rule-tester` | Biome native |
| `@typescript-eslint/utils` | Biome native |

### 2.2 Rust/WASM 環境要件

biome-toolchain の `no-layer-violation` / `enforce-folder-structure` ルールは Rust Plugin API (WASM) で実装する。

| 要件 | バージョン |
|------|----------|
| Rust Toolchain | 1.70.0+ |
| wasm32-unknown-unknown target | rustup target add |
| Cargo | 1.70.0+ |

### 2.3 TypeScript設定

現行 `tsconfig.json` を継承。v1で変更が必要な場合:

| 項目 | 現行 | v1要件 | 変更要否 |
|------|------|--------|---------|
| target | ES2022 | ES2022 | 不要 |
| module | Node16 | Node16 | 不要 |
| strict | true | true | 不要 |
| includes | `scripts/harness/**/*.ts` | **要拡張**（Q1/Q2依存） | 要決定 |

---

## 3. ディレクトリ構造

### 3.1 論理設計が指定する構造（そのまま記載）

```
phasegate/
├── scripts/harness/                    ← v0既存 + config-foundation
│   ├── config-foundation/              ← 論理設計指定（v0既存パターン準拠）
│   │   ├── domain/
│   │   │   ├── harness-config.ts       (Aggregate Root)
│   │   │   ├── values/                 (15 Value Objects)
│   │   │   ├── services/               (2 Domain Services)
│   │   │   ├── port/                   (4 Port Interfaces)
│   │   │   └── error/
│   │   ├── usecase/                    (5 UseCases)
│   │   ├── infrastructure/             (4 Adapters)
│   │   ├── schema/
│   │   │   └── harness-config-v2.schema.json
│   │   └── index.ts
│   ├── core/                           ← v0既存
│   ├── cli/                            ← v0既存 + enable/disable リファクタ
│   ├── validators/                     ← v0既存
│   ├── eslint-rules/                   ← v0既存（削除対象）
│   └── __tests__/
│
├── src/units/                          ← ⚠ 新規トップレベルdir
│   └── adr-documentation/              ← 論理設計指定
│       ├── domain/                     (14ファイル)
│       ├── usecase/                    (9 UseCases)
│       ├── controller/                 (6ファイル)
│       ├── infrastructure/             (3ファイル)
│       ├── seed/                       (initial-adrs.ts)
│       └── __tests__/
│
├── packages/                           ← ⚠ 新規トップレベルdir
│   └── biome-toolchain/                ← 論理設計指定
│       ├── biome-plugins/
│       │   ├── gritql/                 (2 GritQLルール)
│       │   ├── rust/
│       │   │   ├── Cargo.toml
│       │   │   ├── src/               (Rust Plugin実装)
│       │   │   └── tests/
│       │   └── dist/                   (WASMバイナリ出力)
│       ├── src/
│       │   ├── domain/                 (27ファイル)
│       │   ├── usecase/                (5 UseCases)
│       │   ├── controller/             (3ファイル)
│       │   └── infrastructure/         (3ファイル)
│       ├── tests/
│       ├── biome.json
│       ├── package.json                ← ⚠ 独自package.json
│       └── tsconfig.json               ← ⚠ 独自tsconfig.json
│
├── docs/
│   └── ADR/                            (初期10件 + template.md)
├── phasegate.config.json                 (v1→v2拡張)
├── package.json                        (ルート)
└── tsconfig.json                       (ルート)
```

### 3.2 構造上の懸念点

| # | 懸念 | 詳細 |
|----|------|------|
| S-1 | **3つの異なるソース配置パターン** | `scripts/harness/`（config-foundation）、`src/units/`（adr）、`packages/`（biome）が混在 |
| S-2 | **packages/ はモノレポ前提** | biome-toolchain論理設計は独自package.json/tsconfig.jsonを持つ。pnpm workspacesが必要 |
| S-3 | **tsconfig includesの分断** | 現行tsconfigは `scripts/harness/**/*.ts` のみ。`src/`と`packages/`は対象外 |
| S-4 | **テスト構造の不統一** | config-foundationは`__tests__/`が`scripts/harness/__tests__/`に集約、他2つはUnit内`__tests__/` |
| S-5 | **package-lock.json残存** | pnpm使用だが`package-lock.json`が存在（npm残骸の可能性） |

→ これらは **§5 QA** で判断を仰ぐ。

---

## 4. ESLint → Biome マイグレーション台帳

### 4.1 カスタムルール移植マッピング

| ESLintルール | 移植先 | 技術 | 複雑度 |
|-------------|-------|------|--------|
| `require-unit-comment` | GritQLパターン | GritQL | 低 |
| `require-layer-comment` | GritQLパターン | GritQL | 低 |
| `no-layer-violation` | Rust WASM Plugin | Rust + Biome Plugin API | 高 |
| `enforce-folder-structure` | Rust WASM Plugin | Rust + Biome Plugin API | 高 |

### 4.2 マイグレーションステップ

| # | 作業 | 対象ファイル |
|---|------|------------|
| 1 | GritQLルール定義作成 | `biome-plugins/gritql/*.grit` |
| 2 | Rust WASM Plugin実装 | `biome-plugins/rust/src/*.rs` |
| 3 | Biome統合設定作成 | `biome.json` |
| 4 | パリティテスト実装・実行 | `tests/parity/` |
| 5 | ESLint設定・依存削除 | `package.json`, `eslint.config.js`, etc. |
| 6 | CI/CDパイプライン更新 | `.github/workflows/` |
| 7 | 全ソースファイルに `// @unit`, `// @layer` コメント付与 | `scripts/harness/**/*.ts` (+ Q1/Q2依存) |

### 4.3 ロールバック計画

- ESLintルールソースを `scripts/harness/eslint-rules/` に保持（Archive）
- パリティテスト100%合格を削除の前提条件とする

---

## 5. QA（要決定事項）

> **Phase 2（環境契約書作成）に進む前に、以下の判断が必要です。**

### Q1: ソースコード配置パターンの統一

**現状**: 3Unitの論理設計が3つの異なるパスパターンを指定している。

| Unit | 論理設計指定パス | パターン |
|------|----------------|---------|
| config-foundation | `scripts/harness/config-foundation/` | v0既存パターン |
| adr-documentation | `src/units/adr-documentation/` | 新パターン |
| biome-toolchain | `packages/biome-toolchain/` | モノレポパターン |

**選択肢**:

| 案 | 内容 | メリット | デメリット |
|----|------|---------|-----------|
| **A案**: 論理設計そのまま | 3パターン混在を許容 | 論理設計変更不要 | 一貫性欠如、tsconfig分断、新規参入者の混乱 |
| **B案**: `scripts/harness/` に統一 | 全Unitを `scripts/harness/{unit-name}/` に配置 | v0との一貫性、tsconfig単一 | adr/biome論理設計の修正が必要 |
| **C案**: ハイブリッド | biome-toolchainのRust/WASMのみ `packages/` に分離、TypeScript部分は `scripts/harness/` | Rust独立ビルドの合理性を維持しつつTS一貫性確保 | 中程度の論理設計修正 |

**推奨**: **C案**（ハイブリッド）
- Rust/WASMは独立ビルドチェーン（Cargo）を持つため `packages/biome-plugins/` に分離する合理性がある
- TypeScriptコード（adr-documentation, biome-toolchainのTS部分）は既存パターン `scripts/harness/` に統一

[Answer]
C案で進めてください。

### Q2: パッケージマネージャの統一

**現状**: `package-lock.json`（npm）と pnpm 利用が混在。integration_contract.md は pnpm を明記。

**選択肢**:

| 案 | 内容 |
|----|------|
| **A案**: pnpm統一 | `package-lock.json` 削除、`pnpm-lock.yaml` のみ使用 |
| **B案**: npm維持 | integration_contract.mdの記載をnpmに修正 |

**推奨**: **A案**（pnpm統一）— integration_contract.md準拠

[Answer]
A案で進めて

### Q3: biome-toolchainのモノレポ構成

**Q1でA案またはC案を選択した場合のみ回答必要。**

biome-toolchainの論理設計は `packages/biome-toolchain/package.json` を指定しており、pnpm workspaces構成が必要になる。

**選択肢**:

| 案 | 内容 |
|----|------|
| **A案**: pnpm workspaces導入 | ルートに `pnpm-workspace.yaml` を追加 |
| **B案**: workspaces不使用 | biome-toolchainの独自package.jsonを廃止、ルートpackage.jsonに統合 |

**推奨**: Q1でC案採用の場合は **B案**（ルート統合）。Rust/WASMビルドはnpmスクリプト経由で実行。

[Answer]
推奨で進めて

### Q4: Biomeバージョンピニング

**現状**: Biome Plugin API は比較的新しく、breaking changeのリスクがある。

**選択肢**:

| 案 | 内容 |
|----|------|
| **A案**: 厳密ピニング | `"@biomejs/biome": "1.9.4"` (exact) |
| **B案**: マイナー許容 | `"@biomejs/biome": "^1.9.0"` |

**推奨**: **A案**（厳密ピニング）— WASM Pluginとの互換性を保証

[Answer]
A案で進めて

### Q5: 初期ADR作成タイミング

**現状**: adr-documentation論理設計は `seedInitialAdrs()` UseCaseで初期10件を自動生成する設計。

**選択肢**:

| 案 | 内容 |
|----|------|
| **A案**: Unit実装時に自動生成 | adr-documentation Unit の story-implementor が実装 |
| **B案**: 環境セットアップ時に手動配置 | テンプレートから手動作成、seed機能は後から |

**推奨**: **A案** — ドメインモデルの `AdrId.create()` ファクトリによる自動採番を活用

[Answer]
推奨で進めて

---

## 6. 制約集（Non-Functional Requirements）

| # | 制約 | 根拠 | 検証方法 |
|----|------|------|---------|
| C-1 | Domain層は外部フレームワークに依存しない | ヘキサゴナルアーキテクチャ | `no-layer-violation` Biomeルール |
| C-2 | 全ソースファイル先頭に `// @unit`, `// @layer` コメント必須 | トレーサビリティ（K3） | `require-unit-comment`, `require-layer-comment` |
| C-3 | ADR番号は自動採番（手動指定不可） | 一意性保証 | `AdrId.create()` ファクトリ |
| C-4 | ESLint 完全廃止 | v1 MVH 完了条件 | CI `checkEslintRemoval()` |
| C-5 | WASM プラグイン再現ビルド | 決定論的ガバナンス | `Cargo.lock` チェックイン + CI再現テスト |
| C-6 | gray-matter はPort経由アクセス | 差し替え容易化 | `AdrFrontMatterParser` Interface |
| C-7 | Biome デーモン失敗時フォールバック | ロバストネス | `BiomeCliExecutor` エラーハンドリング |
| C-8 | PostToolUse Hook 応答時間 ≤ 500ms | DX | パフォーマンステスト |

---

## 7. CI/CD パイプライン

### 7.1 ワークフロー構成

```
gsdlc-ci-v1.yml
├── Job 1: build-biome-plugins
│   ├── Rust toolchain setup
│   ├── WASM build (cargo build --target wasm32-unknown-unknown --release)
│   └── WASMバイナリ存在検証
│
├── Job 2: lint-and-test (depends: Job 1)
│   ├── pnpm install
│   ├── tsc --noEmit
│   ├── biome check
│   └── vitest run (coverage 90%+)
│
├── Job 3: verify-eslint-removal
│   └── ESLint残存ファイル/依存/CIステップの検出
│
└── Job 4: verify-adr (depends: Job 2)
    ├── ADRファイル形式検証
    ├── ADR番号一意性検証
    └── YAMLフロントマター検証
```

### 7.2 既存CIとの関係

現行 `aidlc-gate.yml` は v0 ハーネスバリデーター用。v1では:
- `aidlc-gate.yml` を維持（後方互換）
- `gsdlc-ci-v1.yml` を新規追加（Wave 1 Unit検証）

---

## 8. リスク・軽減策

| # | リスク | 確率 | 影響 | 軽減策 |
|----|--------|------|------|--------|
| R-1 | Rust環境セットアップの開発者負荷 | 中 | 高 | セットアップスクリプト、CI自動ビルド、プリビルドWASM配布検討 |
| R-2 | WASMビルド再現性 | 低 | 高 | Cargo.lockチェックイン、CIでの再現テスト |
| R-3 | ESLint↔Biomeルール乖離 | 中 | 中 | パリティテスト自動化 |
| R-4 | Biome Plugin API breaking change | 中 | 高 | バージョン厳密ピニング（Q4） |
| R-5 | ディレクトリ構造の分断（Q1未解決時） | 高 | 中 | Phase 2前にQ1を必ず解決 |
| R-6 | package-lock.json/pnpm-lock.yaml競合 | 低 | 低 | Q2で統一決定 |

---

## 9. Go/No-Go Gate（Phase 2開始条件）

Phase 2（環境契約書作成）に進むための条件:

- [ ] **Q1〜Q5 全回答済み**
- [ ] 回答に基づく論理設計の修正方針合意（必要な場合）
- [ ] 本計画書の承認

---

## 10. Go/No-Go Gate（環境構築完了条件）

環境構築が完了したと判断するための8項目:

| # | 条件 | チェック方法 |
|----|------|-----------|
| 1 | 3 Unit Domain層実装完了 | `tsc --noEmit` 成功 |
| 2 | ESLint完全削除 | grep検索 + package.json確認 |
| 3 | Biome 4ルール統合設定完了 | `biome check` 実行 |
| 4 | WASMプラグインビルド再現性 | Cargo.lock + CI再現テスト |
| 5 | パリティテスト100%合格 | `pnpm test:parity` |
| 6 | ADR初期10件生成完了 | `docs/ADR/` 確認 |
| 7 | 全ソースファイル @unit/@layer コメント | Biome enforce-folder-structure |
| 8 | テストカバレッジ 90%+ | Vitest coverage report |

---

## 前提ドキュメント確認

| ドキュメント | パス | 確認 |
|------------|------|------|
| ドメインモデル (config-foundation) | `docs/product/construction/config_foundation/domain_model.md` | ✓ |
| 論理設計 (config-foundation) | `docs/product/construction/config_foundation/logical_design.md` | ✓ |
| ドメインモデル (adr-documentation) | `docs/product/construction/adr_documentation/domain_model.md` | ✓ |
| 論理設計 (adr-documentation) | `docs/product/construction/adr_documentation/logical_design.md` | ✓ |
| ドメインモデル (biome-toolchain) | `docs/product/construction/biome_toolchain/domain_model.md` | ✓ |
| 論理設計 (biome-toolchain) | `docs/product/construction/biome_toolchain/logical_design.md` | ✓ |
| 統合契約 | `docs/product/units/integration_contract.md` | ✓ |

---

**承認者**: \_\_\_\_\_\_\_\_\_\_\_\_
**承認日**: \_\_\_\_年\_\_\_月\_\_\_日
**Q1〜Q5回答**: \_\_\_\_\_\_\_\_\_\_\_\_

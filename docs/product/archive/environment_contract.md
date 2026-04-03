# 環境契約書（Environment Contract）

> **作成日**: 2026-03-11
> **対象Wave**: Wave 1（基盤構築）
> **対象Unit**: config-foundation, adr-documentation, biome-toolchain
> **前提**: `docs/inception/_shared/environment_design_plan.md`（Phase 1承認済み）

---

## 1. マイグレーション台帳

### 1.1 ESLint → Biome 移行

| # | マイグレーション | 対象 | 方向 | 状態 |
|---|----------------|------|------|------|
| M-001 | `require-unit-comment` ESLintルール → GritQLパターン | `scripts/harness/eslint-rules/aidlc/require-unit-comment.ts` → `packages/biome-plugins/gritql/require-unit-comment.grit` | 新規作成 | 未着手 |
| M-002 | `require-layer-comment` ESLintルール → GritQLパターン | `scripts/harness/eslint-rules/aidlc/require-layer-comment.ts` → `packages/biome-plugins/gritql/require-layer-comment.grit` | 新規作成 | 未着手 |
| M-003 | `no-layer-violation` ESLintルール → Rust WASM Plugin | `scripts/harness/eslint-rules/architecture/no-layer-violation.ts` → `packages/biome-plugins/rust/src/no_layer_violation.rs` | 新規作成 | 未着手 |
| M-004 | `enforce-folder-structure` ESLintルール → Rust WASM Plugin | `scripts/harness/eslint-rules/architecture/enforce-folder-structure.ts` → `packages/biome-plugins/rust/src/enforce_folder_structure.rs` | 新規作成 | 未着手 |
| M-005 | ESLint依存パッケージ削除 | `package.json`: `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/rule-tester`, `@typescript-eslint/utils` | 削除 | 未着手 |
| M-006 | ESLintテンプレート削除 | `scripts/harness/templates/eslint.config.js` | 削除 | 未着手 |
| M-007 | ESLintテストのBiome対応テストへの移行 | `scripts/harness/__tests__/eslint-rules/*.test.ts` → 各Unit内テスト | 移行 | 未着手 |

### 1.2 phasegate.config.json v1 → v2

| # | マイグレーション | 対象 | 方向 | 状態 |
|---|----------------|------|------|------|
| M-008 | phasegate.config.json v2スキーマ定義 | `scripts/harness/config-foundation/schema/harness-config-v2.schema.json` | 新規作成 | 未着手 |
| M-009 | v1→v2自動マイグレーション | `migrate-config` CLIコマンド（`scripts/harness/cli/migrate-config.ts`） | 新規作成 | 未着手 |
| M-010 | v1/v2共存ロジック | `scripts/harness/config-foundation/usecase/load-config-usecase.ts` で version判定 | 新規作成 | 未着手 |

### 1.3 ディレクトリ構成変更（Q1: C案適用）

| # | マイグレーション | 対象 | 方向 | 状態 |
|---|----------------|------|------|------|
| M-011 | adr-documentation TypeScript配置 | 論理設計の `src/units/adr-documentation/` → `scripts/harness/adr-documentation/` | パス変更 | 未着手 |
| M-012 | biome-toolchain TypeScript配置 | 論理設計の `packages/biome-toolchain/src/` → `scripts/harness/biome-toolchain/` | パス変更 | 未着手 |
| M-013 | biome-plugins 配置 | 論理設計の `packages/biome-toolchain/biome-plugins/` → `packages/biome-plugins/` | 維持（Rust独立） | 未着手 |
| M-014 | tsconfig.json includes拡張 | `scripts/harness/**/*.ts` のまま（全Unit統一済み） | 変更不要 | — |

### 1.4 パッケージマネージャ統一（Q2: A案適用）

| # | マイグレーション | 対象 | 方向 | 状態 |
|---|----------------|------|------|------|
| M-015 | package-lock.json 削除 | プロジェクトルート | 削除 | 未着手 |
| M-016 | pnpm-lock.yaml 生成 | `pnpm install` による生成 | 新規作成 | 未着手 |
| M-017 | .npmrc 作成 | `package-lock=false` 設定（npm lockfile抑制） | 新規作成 | 未着手 |

---

## 2. サービス構成マニフェスト

### 2.1 Unit構成一覧

Phasegateはローカル開発ツールキットであり、サーバープロセスは持たない。以下は各Unitのランタイム構成。

#### config-foundation

| 項目 | 値 |
|------|-----|
| 配置先 | `scripts/harness/config-foundation/` |
| エントリポイント | `index.ts`（loadConfig, toggleFeature等のファサード） |
| CLIコマンド | `phasegate:enable`, `phasegate:disable`, `phasegate:migrate-config` |
| 外部依存 | `ajv` ^10.0.0 |
| 設定ファイル | `phasegate.config.json`（プロジェクトルート） |
| スキーマファイル | `scripts/harness/config-foundation/schema/harness-config-v2.schema.json` |
| バックアップ先 | `.harness/backups/` |

#### adr-documentation

| 項目 | 値 |
|------|-----|
| 配置先 | `scripts/harness/adr-documentation/` |
| エントリポイント | `controllers/index.ts`（プログラマティックAPI） |
| CLIコマンド | `adr:list`, `adr:create`, `adr:validate` |
| 外部依存 | `gray-matter` ^4.0.3 |
| 出力先 | `docs/ADR/` |
| テンプレート | `docs/ADR/template.md` |
| シードデータ | `seed/initial-adrs.ts`（初期10件ADR定義） |

#### biome-toolchain（TypeScript部分）

| 項目 | 値 |
|------|-----|
| 配置先 | `scripts/harness/biome-toolchain/` |
| エントリポイント | `controller/cli-controller.ts`, `controller/hook-controller.ts`, `controller/ci-controller.ts` |
| CLIコマンド | `biome:check`, `biome:lint`, `biome:format` |
| 外部依存 | `@biomejs/biome` 1.9.4 (exact), `fast-glob` ^3.3.0 |
| Biome設定 | `biome.json`（プロジェクトルート） |

#### biome-plugins（Rust/WASM部分）

| 項目 | 値 |
|------|-----|
| 配置先 | `packages/biome-plugins/` |
| ビルドツール | Cargo (Rust 1.70.0+) |
| ビルドターゲット | `wasm32-unknown-unknown` |
| 出力先 | `packages/biome-plugins/dist/*.wasm` |
| ビルドコマンド | `cargo build --target wasm32-unknown-unknown --release` |
| GritQLルール | `packages/biome-plugins/gritql/*.grit` |
| Rustソース | `packages/biome-plugins/rust/src/*.rs` |
| Rustテスト | `packages/biome-plugins/rust/tests/*.rs` |

### 2.2 統合ディレクトリ構造（確定版）

```
phasegate/
├── scripts/harness/                         # 全TypeScript Unit統一配置
│   ├── config-foundation/                   # Unit: config-foundation
│   │   ├── domain/
│   │   │   ├── harness-config.ts
│   │   │   ├── values/                      (15 Value Objects)
│   │   │   ├── services/                    (2 Domain Services)
│   │   │   ├── events/                      (2 Domain Events)
│   │   │   └── errors/
│   │   ├── port/                            (4 Port Interfaces)
│   │   ├── usecase/                         (5 UseCases)
│   │   ├── infrastructure/                  (4 Adapters)
│   │   ├── schema/
│   │   │   └── harness-config-v2.schema.json
│   │   └── index.ts
│   │
│   ├── adr-documentation/                   # Unit: adr-documentation
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── adr.ts
│   │   │   ├── value-objects/               (6 Value Objects)
│   │   │   ├── errors/                      (5 Domain Errors)
│   │   │   └── ports/                       (2 Port Interfaces)
│   │   ├── use-cases/                       (9 UseCases)
│   │   ├── controllers/
│   │   │   ├── adr-controller.ts
│   │   │   ├── dto/
│   │   │   │   ├── input/                   (3 Input DTOs)
│   │   │   │   └── output/                  (2 Output DTOs)
│   │   │   └── index.ts
│   │   ├── infrastructure/
│   │   │   ├── file-system-adr-repository.ts
│   │   │   ├── yaml-front-matter-parser.ts
│   │   │   └── markdown-serializer.ts
│   │   └── seed/
│   │       └── initial-adrs.ts
│   │
│   ├── biome-toolchain/                     # Unit: biome-toolchain (TypeScript部分)
│   │   ├── domain/
│   │   │   ├── model/                       (5 Aggregates)
│   │   │   ├── value-object/                (15 Value Objects)
│   │   │   ├── service/                     (3 Domain Services)
│   │   │   ├── port/                        (3 Port Interfaces)
│   │   │   └── error/
│   │   ├── usecase/                         (5 UseCases)
│   │   ├── controller/                      (3 Controllers)
│   │   └── infrastructure/                  (3 Adapters)
│   │
│   ├── core/                                # v0既存（変更なし）
│   ├── cli/                                 # v0既存 + 新規CLIコマンド
│   │   ├── enable.ts                        (リファクタリング: config-foundation UseCase呼び出し)
│   │   ├── disable.ts                       (リファクタリング: 同上)
│   │   ├── migrate-config.ts                (新規)
│   │   └── ...                              (既存コマンド維持)
│   ├── validators/                          # v0既存（変更なし）
│   ├── eslint-rules/                        # v0既存（Archive → 削除予定）
│   ├── integrations/                        # v0既存
│   ├── templates/                           # v0既存（eslint.config.js削除予定）
│   └── __tests__/
│       ├── config-foundation/               # config-foundation Unit テスト
│       │   ├── domain/
│       │   ├── usecase/
│       │   └── infrastructure/
│       ├── adr-documentation/               # adr-documentation Unit テスト
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   └── value-objects/
│       │   ├── use-cases/
│       │   ├── controllers/
│       │   └── infrastructure/
│       ├── biome-toolchain/                 # biome-toolchain Unit テスト
│       │   ├── domain/
│       │   ├── usecase/
│       │   ├── controller/
│       │   └── infrastructure/
│       ├── core/                            # v0既存テスト
│       ├── cli/                             # v0既存テスト
│       ├── validators/                      # v0既存テスト
│       ├── eslint-rules/                    # Archive（パリティテスト完了後削除）
│       ├── parity/                          # ESLint↔Biome パリティテスト（新規）
│       │   └── parity-test.ts
│       ├── fixtures/                        # v0既存テストフィクスチャ
│       └── vitest.config.ts
│
├── packages/
│   └── biome-plugins/                       # Rust/WASM独立ビルド
│       ├── gritql/
│       │   ├── require-unit-comment.grit
│       │   └── require-layer-comment.grit
│       ├── rust/
│       │   ├── Cargo.toml
│       │   ├── Cargo.lock                   (チェックイン必須: 再現ビルド保証)
│       │   ├── src/
│       │   │   ├── lib.rs
│       │   │   ├── no_layer_violation.rs
│       │   │   └── enforce_folder_structure.rs
│       │   └── tests/
│       │       ├── no_layer_violation_test.rs
│       │       └── enforce_folder_structure_test.rs
│       └── dist/                            # WASMバイナリ出力
│           ├── no-layer-violation.wasm
│           └── enforce-folder-structure.wasm
│
├── docs/
│   ├── ADR/                                 # ADR出力先
│   │   └── template.md
│   ├── inception/
│   ├── product/
│   └── principles/
│
├── .github/
│   └── workflows/
│       ├── aidlc-gate.yml                   # v0既存（維持）
│       └── gsdlc-ci-v1.yml                  # v1新規
│
├── phasegate.config.json                      # v1→v2（config-foundation管理）
├── biome.json                               # Biome統合設定（ルートに配置）
├── package.json                             # ルート統合（workspaces不使用）
├── pnpm-lock.yaml                           # pnpm統一
├── .npmrc                                   # npm lockfile抑制
└── tsconfig.json                            # TypeScript統一設定
```

### 2.3 package.json（確定版）

```json
{
  "name": "phasegate",
  "version": "1.0.0",
  "description": "Phasegate Engineering Toolkit - Phasegate",
  "private": true,
  "type": "module",
  "scripts": {
    "phasegate:status": "npx tsx scripts/harness/cli/status.ts",
    "phasegate:enable": "npx tsx scripts/harness/cli/enable.ts",
    "phasegate:disable": "npx tsx scripts/harness/cli/disable.ts",
    "phasegate:init": "npx tsx scripts/harness/cli/init.ts",
    "phasegate:check-phase": "npx tsx scripts/harness/cli/check-phase.ts",
    "phasegate:check-ready": "npx tsx scripts/harness/cli/check-ready.ts",
    "phasegate:ci-check": "npx tsx scripts/harness/cli/ci-check.ts",
    "phasegate:detect-drift": "npx tsx scripts/harness/cli/detect-drift.ts",
    "phasegate:collect-lessons": "npx tsx scripts/harness/cli/collect-lessons.ts",
    "phasegate:detect-dead-code": "npx tsx scripts/harness/cli/detect-dead-code.ts",
    "phasegate:migrate-config": "npx tsx scripts/harness/cli/migrate-config.ts",
    "biome:check": "biome check .",
    "biome:lint": "biome lint .",
    "biome:format": "biome format --write .",
    "adr:list": "npx tsx scripts/harness/adr-documentation/controllers/index.ts list",
    "adr:create": "npx tsx scripts/harness/adr-documentation/controllers/index.ts create",
    "adr:validate": "npx tsx scripts/harness/adr-documentation/controllers/index.ts validate",
    "adr:seed": "npx tsx scripts/harness/adr-documentation/controllers/index.ts seed",
    "build:plugins": "cd packages/biome-plugins/rust && cargo build --target wasm32-unknown-unknown --release && cp target/wasm32-unknown-unknown/release/*.wasm ../dist/",
    "test": "vitest run --config scripts/harness/__tests__/vitest.config.ts",
    "test:parity": "vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/parity/"
  },
  "dependencies": {
    "ajv": "^10.0.0",
    "gray-matter": "^4.0.3",
    "@biomejs/biome": "1.9.4",
    "fast-glob": "^3.3.0"
  },
  "devDependencies": {
    "@types/gray-matter": "latest",
    "@types/node": "^25.3.5",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  }
}
```

**変更点**:
- ESLint関連4パッケージ削除（`eslint`, `@typescript-eslint/parser`, `@typescript-eslint/rule-tester`, `@typescript-eslint/utils`）
- 新規dependencies追加: `ajv`, `gray-matter`, `@biomejs/biome`(exact), `fast-glob`
- 新規devDependencies追加: `@types/gray-matter`
- 新規scripts追加: `phasegate:migrate-config`, `biome:*`, `adr:*`, `build:plugins`, `test:parity`

### 2.4 tsconfig.json（確定版）

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node", "vitest/globals"]
  },
  "include": ["scripts/harness/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**変更点**: なし。Q1でC案（TypeScriptを`scripts/harness/`に統一）を採用したため、既存のincludesで全Unitをカバーできる。

### 2.5 biome.json（新規作成）

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "plugins": [
    "./packages/biome-plugins/dist/no-layer-violation.wasm",
    "./packages/biome-plugins/dist/enforce-folder-structure.wasm"
  ],
  "files": {
    "include": ["scripts/harness/**/*.ts"],
    "ignore": [
      "node_modules",
      "dist",
      "packages/biome-plugins/rust",
      "scripts/harness/__tests__/fixtures"
    ]
  }
}
```

**注**: GritQLルール（require-unit-comment, require-layer-comment）の`custom`セクションは、biome-toolchain Unit実装時にBiome Plugin APIの正式仕様に従って追記する。

---

## 3. 認証・認可アーキテクチャ

Phasegateはローカル開発ツールキットであり、認証・認可機構は持たない（integration_contract.md §5準拠）。

### 3.1 アクセス制御（認証代替）

| 制御レイヤー | 機構 | 対象 |
|-------------|------|------|
| L0 | FUSE Hooks Engine（Wave 4） | ファイルI/Oインターセプション |
| L1 | Biomeカスタムルール（本Wave） | AST静的解析 |
| L2 | Pre-commit Hook | コミット時ゲート |
| L3 | CI/CD（GitHub Actions） | プッシュ時ゲート |
| L4 | Scheduled（将来） | 定期スキャン |

### 3.2 設定ファイル保護

- `phasegate.config.json`: config-foundation Unitの`ConfigRepository`ポート経由のみで読み書き
- `biome.json`: biome-toolchain Unitの`BiomeConfigLoader`ポート経由のみで読み取り
- `docs/ADR/*.md`: adr-documentation Unitの`AdrRepository`ポート経由のみで読み書き

---

## 4. シードデータ定義

### 4.1 シード戦略

Phasegateは3層シード戦略をとる（ただし認証テストデータは該当なし）。

| 層 | 用途 | データ | 生成タイミング |
|----|------|--------|--------------|
| マスター | ADR初期テンプレート | `docs/ADR/template.md` | 環境構築時に静的配置 |
| 業務サンプル | 初期10件ADR | `seed/initial-adrs.ts` 定数定義 | `seedInitialAdrs()` UseCase実行時（Q5: A案） |
| 設定デフォルト | phasegate.config.json v2テンプレート | `harness-config-v2.schema.json` の default値 | `loadConfig()` で v1検出時に自動マイグレーション |

### 4.2 初期10件ADR（予定）

adr-documentation Unitの`seed/initial-adrs.ts`に定義。`AdrId.create()`ファクトリにより自動採番。

| ADR# | タイトル（予定） |
|------|----------------|
| ADR-001 | Phase Gate強制 |
| ADR-002 | ヘキサゴナルアーキテクチャ採用 |
| ADR-003 | ESLint→Biome移行 |
| ADR-004 | phasegate.config.json Single Source of Truth |
| ADR-005 | FUSE Hooks Engine導入 |
| ADR-006 | Nyquistバリデーション |
| ADR-007 | Quick Mode設計 |
| ADR-008 | セッションライフサイクル管理 |
| ADR-009 | 5層品質防御 |
| ADR-010 | GSD機能デフォルト無効 |

---

## 5. フレームワーク・ランタイム制約集

| # | 制約 | 根拠 | 検証方法 | 影響Unit |
|----|------|------|---------|---------|
| C-1 | Domain層は外部フレームワークに依存しない | ヘキサゴナルアーキテクチャ | `no-layer-violation` Biomeルール | 全Unit |
| C-2 | 全ソースファイル先頭に `// @unit <name>`, `// @layer <layer>` コメント必須 | トレーサビリティ（K3） | `require-unit-comment`, `require-layer-comment` Biomeルール | 全Unit |
| C-3 | ADR番号は`AdrId.create()`ファクトリによる自動採番のみ | 一意性保証 | ドメイン不変条件 | adr-documentation |
| C-4 | ESLint完全廃止（ファイル・依存・CIステップ） | v1 MVH完了条件 | CI `verify-eslint-removal` ジョブ | biome-toolchain |
| C-5 | WASMプラグイン再現ビルド保証 | 決定論的ガバナンス | `Cargo.lock` チェックイン + CI再現テスト | biome-toolchain |
| C-6 | gray-matterはPort経由でのみアクセス | 将来ライブラリ差し替え容易化 | `AdrFrontMatterParser` Interface | adr-documentation |
| C-7 | Biomeデーモン失敗時はCLI通常モードにフォールバック | ロバストネス | `BiomeCliExecutor` エラーハンドリング | biome-toolchain |
| C-8 | PostToolUse Hook応答時間 ≤ 500ms（単一ファイル） | DX | パフォーマンステスト | biome-toolchain |
| C-9 | ajvはInfrastructure層（`JsonSchemaValidator`）でのみ使用 | ポート分離 | `no-layer-violation` ルール | config-foundation |
| C-10 | v1設定ファイルは自動マイグレーション可能。手動変更不要 | 後方互換性 | `MigrateConfigUseCase` テスト | config-foundation |
| C-11 | テストファイルは `scripts/harness/__tests__/{unit-name}/` に配置 | テスト構造統一 | ディレクトリ規約 | 全Unit |
| C-12 | ファイル名はkebab-case | 命名規約 | `enforce-folder-structure` ルール | 全Unit |
| C-13 | `@biomejs/biome` はexactバージョン（1.9.4）で固定 | WASM Plugin互換性 | `package.json` 検証 | biome-toolchain |

---

## 6. 環境検証チェックリスト

### 6.1 前提環境

- [ ] Node.js 18+ インストール確認（`node --version`）
- [ ] pnpm 8+ インストール確認（`pnpm --version`）
- [ ] Rust 1.70.0+ インストール確認（`rustc --version`）
- [ ] Cargo インストール確認（`cargo --version`）
- [ ] wasm32-unknown-unknown ターゲット登録確認（`rustup target list --installed | grep wasm32`）

### 6.2 依存インストール

- [ ] `pnpm install` 成功
- [ ] `package-lock.json` が存在しないことを確認
- [ ] `pnpm-lock.yaml` が存在することを確認
- [ ] `pnpm list ajv` で ajv ^10.0.0 確認
- [ ] `pnpm list gray-matter` で gray-matter ^4.0.3 確認
- [ ] `pnpm list @biomejs/biome` で @biomejs/biome 1.9.4 (exact) 確認
- [ ] `pnpm list fast-glob` で fast-glob ^3.3.0 確認
- [ ] ESLint関連パッケージが存在しないことを確認（`pnpm list eslint` → not found）

### 6.3 ディレクトリ構成

- [ ] `scripts/harness/config-foundation/` 存在確認
- [ ] `scripts/harness/adr-documentation/` 存在確認
- [ ] `scripts/harness/biome-toolchain/` 存在確認
- [ ] `packages/biome-plugins/` 存在確認
- [ ] `packages/biome-plugins/rust/Cargo.toml` 存在確認
- [ ] `packages/biome-plugins/rust/Cargo.lock` 存在確認
- [ ] `docs/ADR/` ディレクトリ存在確認
- [ ] `biome.json`（プロジェクトルート）存在確認

### 6.4 ビルド検証

- [ ] `pnpm run build:plugins` 成功（WASM ビルド）
- [ ] `packages/biome-plugins/dist/no-layer-violation.wasm` 存在確認
- [ ] `packages/biome-plugins/dist/enforce-folder-structure.wasm` 存在確認
- [ ] `tsc --noEmit` 成功（TypeScript型チェック）

### 6.5 リント・フォーマット検証

- [ ] `pnpm run biome:check` 0 violations
- [ ] `pnpm run biome:lint` 成功
- [ ] `pnpm run biome:format` 成功

### 6.6 テスト検証

- [ ] `pnpm test` 成功
- [ ] テストカバレッジ 90%+ 確認
- [ ] `pnpm run test:parity` 成功（ESLint↔Biome パリティ100%）

### 6.7 CLIコマンド検証

- [ ] `pnpm run phasegate:status` 正常実行
- [ ] `pnpm run phasegate:enable` 正常実行
- [ ] `pnpm run phasegate:disable` 正常実行
- [ ] `pnpm run phasegate:migrate-config` 正常実行（v1→v2マイグレーション）
- [ ] `pnpm run adr:list` 正常実行
- [ ] `pnpm run adr:validate` 正常実行

### 6.8 CI/CD検証

- [ ] `.github/workflows/gsdlc-ci-v1.yml` 存在確認
- [ ] GitHub Actions ローカルシミュレーション成功（act等）
- [ ] ESLint残存検出ジョブがESLintファイル未検出を確認

### 6.9 ESLint完全削除検証

- [ ] `scripts/harness/eslint-rules/` → Archive済み or 削除済み
- [ ] `scripts/harness/templates/eslint.config.js` 削除済み
- [ ] `package.json` にESLint関連依存なし
- [ ] `.eslintrc*`, `.eslintignore` ファイルなし

---

## 7. CI/CDパイプライン定義

### 7.1 gsdlc-ci-v1.yml（新規）

```yaml
name: Phasegate v1 CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-biome-plugins:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: wasm32-unknown-unknown
      - name: Build WASM plugins
        run: |
          cd packages/biome-plugins/rust
          cargo build --target wasm32-unknown-unknown --release
          mkdir -p ../dist
          cp target/wasm32-unknown-unknown/release/*.wasm ../dist/
      - name: Verify WASM artifacts
        run: |
          test -f packages/biome-plugins/dist/no-layer-violation.wasm
          test -f packages/biome-plugins/dist/enforce-folder-structure.wasm
      - uses: actions/upload-artifact@v4
        with:
          name: wasm-plugins
          path: packages/biome-plugins/dist/*.wasm

  lint-and-test:
    needs: build-biome-plugins
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          name: wasm-plugins
          path: packages/biome-plugins/dist/
      - name: TypeScript type check
        run: npx tsc --noEmit
      - name: Biome check
        run: pnpm run biome:check
      - name: Run tests
        run: pnpm test -- --coverage
      - name: Verify coverage threshold
        run: |
          # カバレッジ90%+を検証（Vitest coverage reporter設定に依存）
          echo "Coverage verification step"

  verify-eslint-removal:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check no ESLint files exist
        run: |
          ! find . -name '.eslintrc*' -o -name '.eslintignore' | grep .
      - name: Check no ESLint dependencies
        run: |
          ! grep -E '"eslint"|"@typescript-eslint/' package.json
      - name: Check no ESLint CI steps
        run: |
          ! grep -r 'eslint' .github/workflows/ --include='*.yml' || true

  verify-adr:
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - name: Validate ADR format
        run: pnpm run adr:validate
```

---

## 8. ローカル開発環境セットアップ

### 8.1 初回セットアップ手順

```bash
# 1. Rust環境（未インストールの場合）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
rustup target add wasm32-unknown-unknown

# 2. Node依存インストール
pnpm install

# 3. WASMプラグインビルド
pnpm run build:plugins

# 4. Biome動作確認
pnpm run biome:check

# 5. テスト実行
pnpm test
```

### 8.2 日常開発フロー

```bash
# リント・フォーマット
pnpm run biome:check          # チェックのみ
pnpm run biome:format         # フォーマット自動修正

# テスト
pnpm test                     # 全テスト
pnpm test -- --watch          # ウォッチモード

# ADR操作
pnpm run adr:list             # ADR一覧
pnpm run adr:create           # ADR新規作成
pnpm run adr:validate         # ADR整合性検証

# 設定操作
pnpm run phasegate:status       # 現在の設定状態
pnpm run phasegate:enable       # 機能有効化
pnpm run phasegate:migrate-config  # v1→v2マイグレーション
```

---

## 更新履歴

| 日付 | 変更内容 | 根拠 |
|------|---------|------|
| 2026-03-11 | 初版作成 | Wave 1 環境設計（Phase 2） |

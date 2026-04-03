# biome-toolchain環境要件分析レポート

> **作成日**: 2026-03-11
> **対応ストーリー**: US-036, US-037, US-038, US-039
> **前提ドキュメント**: `domain_model.md`, `logical_design.md`

---

## エグゼクティブサマリー

biome-toolchain Unitは**ハイブリッド実行系統**で構成される：

- **実行系統A（外側）**: Biomeプラグイン層（GritQL + Rust/WASM）
  - 物理配置: `packages/biome-toolchain/biome-plugins/`
  - ビルド: Cargo（Rust）→ WASMバイナリ
  - 実行: Biome CLIが直接ロード

- **実行系統B（内側）**: TypeScriptアプリケーション層（ヘキサゴナル）
  - 物理配置: `packages/biome-toolchain/src/`
  - 層構成: Controller → UseCase → Domain → Infrastructure
  - 実行: Node.js TypeScript runtime

- **統合点**: Biome CLIのJSON診断出力

環境構築に必要な要件は**3段階**に分類される：

1. **Node.jsエコシステム**（npm/pnpm + TypeScript）
2. **Rustツールチェーン**（Cargo + WASMターゲット）
3. **CI/デーモンモード**（GitHub Actions + Biome daemon）

---

## 1. 必要な外部ライブラリ

### 1.1 v0状態（現在・ESLintベース）

```json
{
  "devDependencies": {
    "@typescript-eslint/parser": "^8.56.1",
    "@typescript-eslint/rule-tester": "^8.56.1",
    "@typescript-eslint/utils": "^8.56.1",
    "eslint": "^10.0.3"
  }
}
```

### 1.2 Biomeへの移行後（目標状態）

**依存構成**:

| ライブラリ | カテゴリ | インストール位置 | 説明 |
|-----------|---------|:----------:|------|
| `@biomejs/biome` | runtime | root/node_modules | Biome CLI実行可能化 |
| `fast-glob` | runtime | pkg/node_modules | ファイル列挙（glob） |
| `typescript` | devDep | root/node_modules | 型チェック・トランスパイル |
| `vitest` | devDep | root/node_modules | テストランナー |
| `tsx` | devDep | root/node_modules | TypeScript直接実行 |

**変更**:
- ESLint関連4パッケージを**削除**（US-036～039実装後）
- `biome.json` で設定一元化

### 1.3 ESLint段階的除去計画

| フェーズ | 対象 | アクション | タイミング |
|---------|------|:--------:|---------|
| **1** | .eslintrc.* ファイル | 削除 | US-036完了時 |
| **1** | eslint npm scripts | 削除 | US-036完了時 |
| **2** | package.json eslint依存 | 削除 | 全ルール移植確認後 |
| **2** | pnpm lock update | 実行 | 同上 |
| **3** | CIゲート | INV-12を実装 | US-039実装時 |

**INV-12（CIGateConfiguration）実装内容**:
```typescript
checkEslintRemoval(projectFiles): RuleViolation[] {
  // 以下をチェック：
  // 1. .eslintrc.* ファイル存在チェック
  // 2. package.json の eslint* 依存チェック
  // 3. import 'eslint' 含むファイル検出
  // → 発見時は HarnessCompatibleError("ESLINT_REMNANT") 返却
}
```

---

## 2. Rust/WASMビルド環境

### 2.1 物理ディレクトリ構成

```
packages/biome-toolchain/
└── biome-plugins/
    ├── gritql/
    │   ├── require-unit-comment.grit      # 参照ファイル
    │   ├── require-layer-comment.grit     # 参照ファイル
    │   └── README.md
    │
    ├── rust/                              # 本体
    │   ├── Cargo.toml
    │   ├── Cargo.lock
    │   ├── src/
    │   │   ├── lib.rs
    │   │   ├── no_layer_violation.rs
    │   │   ├── enforce_folder_structure.rs
    │   │   ├── common/
    │   │   │   ├── layer_parser.rs       # @layer コメント解析
    │   │   │   └── import_resolver.rs    # import パス解決
    │   │   └── visitor.rs
    │   │
    │   ├── tests/
    │   │   ├── no_layer_violation_test.rs
    │   │   └── enforce_folder_structure_test.rs
    │   │
    │   └── wasm/
    │       └── Makefile
    │
    ├── dist/                              # ビルド出力
    │   ├── no-layer-violation.wasm
    │   └── enforce-folder-structure.wasm
    │
    └── README.md
```

### 2.2 環境要件

| 要件 | バージョン | 確認コマンド | 必須/推奨 |
|------|:-------:|:--------:|---------|
| **Rust** | 1.70+ | `rustc --version` | 必須 |
| **Cargo** | 同上 | `cargo --version` | 必須 |
| **wasm32-unknown-unknown** | — | `rustup target list` | 必須 |
| **Node.js** | 18+（22 LTS推奨） | `node --version` | 必須 |
| **pnpm** | 8+ | `pnpm --version` | 必須 |

### 2.3 インストール手順

**Rustup + WASMターゲット**:

```bash
# 1. Rustup インストール（初回のみ）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. シェル再ロード
source $HOME/.cargo/env

# 3. WASMターゲット追加
rustup target add wasm32-unknown-unknown

# 4. 確認
rustup toolchain list
rustc --version
cargo build --target wasm32-unknown-unknown --version
```

### 2.4 ビルドスクリプト

**packages/biome-toolchain/package.json**:

```json
{
  "scripts": {
    "build:plugins": "cd biome-plugins && cargo build --target wasm32-unknown-unknown --release && cp target/wasm32-unknown-unknown/release/*.wasm dist/",
    "build:plugins:dev": "cd biome-plugins && cargo build --target wasm32-unknown-unknown && cp target/wasm32-unknown-unknown/debug/*.wasm dist/",
    "clean:plugins": "cd biome-plugins && cargo clean && rm -rf dist/*.wasm",
    "test:plugins": "cd biome-plugins && cargo test"
  }
}
```

**実行フロー**:

```bash
# リリースビルド
pnpm run build:plugins
# → target/wasm32-unknown-unknown/release/*.wasm → dist/ へコピー

# 開発ビルド（デバッグ情報付き）
pnpm run build:plugins:dev
# → target/wasm32-unknown-unknown/debug/*.wasm → dist/ へコピー

# ネイティブテスト（Rust）
pnpm run test:plugins
# → cargo test 実行
```

### 2.5 Cargo.toml 設定（重要ポイント）

```toml
[package]
name = "biome-plugins"
version = "0.1.0"
edition = "2021"

[dependencies]
biome_console = { version = "0.5", features = ["wasm"] }
biome_js_api = "0.5"
biome_rowan = "0.5"

[lib]
crate-type = ["cdylib"]                    # 動的ライブラリ（WASM）

[profile.release]
opt-level = "z"                            # サイズ最適化
lto = true                                 # リンク時最適化
codegen-units = 1                          # コード生成ユニット
strip = true                               # デバッグ情報削除
```

---

## 3. モノレポ構成

### 3.1 ディレクトリ階層

```
root (phasegate)
│
├── package.json                          # ルート共通依存
├── pnpm-workspace.yaml                   # モノレポ設定
├── node_modules/
│   ├── @biomejs/biome/
│   ├── typescript/
│   ├── vitest/
│   └── ...
│
├── packages/
│   └── biome-toolchain/
│       ├── package.json                  # Unit固有依存
│       ├── tsconfig.json
│       ├── src/                          # 実行系統B（TS app）
│       │   ├── domain/
│       │   ├── usecase/
│       │   ├── controller/
│       │   └── infrastructure/
│       │
│       ├── biome-plugins/                # 実行系統A（Biome plugin）
│       │   ├── rust/
│       │   ├── gritql/
│       │   └── dist/
│       │
│       ├── tests/
│       │   ├── domain/
│       │   ├── usecase/
│       │   ├── controller/
│       │   ├── infrastructure/
│       │   ├── plugins/
│       │   └── parity/
│       │
│       ├── biome.json
│       └── vitest.config.ts
│
├── scripts/harness/                      # 既存フレームワーク
│   ├── core/                             # ※変更なし
│   ├── cli/
│   └── __tests__/
│
└── docs/
    ├── product/
    │   └── construction/
    │       └── biome_toolchain/
    │           ├── domain_model.md
    │           ├── logical_design.md
    │           └── environment-requirements.md ← このファイル
    │
    └── principles/
        └── architecture-philosophy.md
```

### 3.2 既存scripts/harness/ との関係

**保持する要件**:

- `scripts/harness/core/` → **変更なし**（基盤ファイルシステム API）
- `metadata-parser.ts` → **再利用**（@unit/@layer コメント解析で活用）
- `config-loader.ts` → **参考**（phasegate.config.json + biome.json のローダ構造）

**置き換える要件**:

| 既存スクリプト | 置き換え先 | 理由 |
|:----------:|:--------:|------|
| ESLint実行 | Biome CLI実行 | 統一されたツールチェーン |
| pre-commit hook | Post-ToolUse Hook | Claude Code統合 |
| ESLint カスタムルール | Biomeプラグイン（GritQL + Rust） | ネイティブパフォーマンス |

---

## 4. biome.json 統合設計

### 4.1 ファイル配置

```
packages/biome-toolchain/biome.json
```

### 4.2 スキーマ構成（Unit設計に基づく）

```json
{
  "$schema": "https://biomejs.dev/schemas/latest/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": false,
      "custom": {
        "requireUnitComment": {
          "level": "error",
          "source": "/* GritQLパターン（biome.jsonが正、.gritは参照用） */",
          "globals": []
        },
        "requireLayerComment": {
          "level": "error",
          "source": "/* GritQLパターン */",
          "globals": []
        }
      },
      "plugin": {
        "noLayerViolation": {
          "level": "error",
          "options": {
            "allowedDependencies": {
              "domain": [],
              "port": ["domain"],
              "usecase": ["domain", "port"],
              "controller": ["usecase", "domain", "port"],
              "infrastructure": ["domain", "port"]
            }
          }
        },
        "enforceFolderStructure": {
          "level": "error",
          "options": {
            "rules": [
              {
                "pattern": "src/domain/**",
                "expectedDirs": ["model", "value-object", "service", "port", "error"]
              },
              {
                "pattern": "src/usecase/**",
                "expectedPattern": "*-usecase.ts"
              },
              {
                "pattern": "src/controller/**",
                "expectedPattern": "*-controller.ts"
              },
              {
                "pattern": "src/infrastructure/**",
                "expectedPattern": "adapter implementation"
              },
              {
                "pattern": "tests/**",
                "expectedDirs": ["domain", "usecase", "controller", "infrastructure"]
              }
            ]
          }
        }
      }
    },
    "include": ["src/**/*.ts", "src/**/*.tsx"],
    "exclude": ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**", "**/node_modules/**", "**/dist/**"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentSize": 2,
    "lineWidth": 100
  },
  "plugins": [
    "./biome-plugins/dist/no-layer-violation.wasm",
    "./biome-plugins/dist/enforce-folder-structure.wasm"
  ],
  "harness": {
    "antiPatterns": {
      "anyTypeAbuse": {
        "enabled": true,
        "threshold": 5,
        "implementationType": "BiomeRule"
      },
      "commentFlood": {
        "enabled": true,
        "threshold": 0.4,
        "implementationType": "BiomeRule"
      },
      "codeDuplication": {
        "enabled": true,
        "threshold": 0.8,
        "implementationType": "ExternalScript"
      },
      "ghostFile": {
        "enabled": true,
        "threshold": 1,
        "implementationType": "ExternalScript"
      }
    },
    "ciGate": {
      "enabled": true,
      "maxErrors": 0,
      "maxWarnings": 10,
      "requireEslintRemoval": true
    }
  }
}
```

### 4.3 GritQLパターン管理方針

**正式定義**: `biome.json` の `custom[].source` フィールド（本体）

**参照ファイル**: `biome-plugins/gritql/*.grit`（ドキュメント用・人間可読）

| ファイル | 形態 | 更新権 | 説明 |
|---------|------|:-----:|------|
| biome.json source | JSON | 開発者 | 正式版（Biome CLI読み込み） |
| *.grit | テキスト | 開発者 | 参照用（IDE対応・人間可読） |

---

## 5. GritQLパターンファイル構成

### 5.1 ディレクトリ構造

```
packages/biome-toolchain/biome-plugins/gritql/
├── require-unit-comment.grit          # パターン定義
├── require-layer-comment.grit         # パターン定義
├── README.md                          # 使用方法解説
└── test-fixtures/
    ├── require-unit-comment/
    │   ├── valid/
    │   │   └── valid-with-unit.ts
    │   └── invalid/
    │       ├── missing-unit.ts
    │       └── invalid-format.ts
    │
    └── require-layer-comment/
        ├── valid/
        │   └── valid-with-layer.ts
        └── invalid/
            ├── missing-layer.ts
            └── invalid-layer-value.ts
```

### 5.2 パターン定義の責務分離

| 担当 | ファイル | 更新頻度 |
|:--:|:-------:|:--------:|
| 開発者 | biome.json source | 低（仕様変更時） |
| 開発者 | *.grit（参照） | 同上 |
| テスト | test-fixtures/ | 中（テスト追加時） |

---

## 6. CIパイプライン設計

### 6.1 GitHub Actions ワークフロー（aidlc-gate.yml）

```yaml
name: AIDLC Gate (biome-toolchain)
on: [push, pull_request]

jobs:
  biome-lint-gate:
    runs-on: ubuntu-latest
    steps:
      # 1. Node.js セットアップ
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      # 2. Rust + WASMターゲット セットアップ
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: wasm32-unknown-unknown

      # 3. 依存インストール
      - run: pnpm install

      # 4. Biomeプラグイン ビルド
      - run: pnpm run build:plugins
        working-directory: packages/biome-toolchain
        env:
          CARGO_PROFILE_RELEASE_LTO: true

      # 5. Biome lint gate 実行
      - name: Run Biome lint gate
        run: node dist/ci-controller.js --output annotations
        working-directory: packages/biome-toolchain

      # 6. リポート アップロード
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: biome-lint-report
          path: packages/biome-toolchain/lint-report.json
```

### 6.2 ステップ詳細

| ステップ | コマンド | タイムアウト | 成功条件 |
|---------|--------|:----------:|---------|
| Rust toolchain | dtolnay/rust-toolchain@stable | — | 環境セットアップ完了 |
| Build plugins | `pnpm run build:plugins` | 300秒 | 終了コード0 |
| Biome lint gate | `node dist/ci-controller.js` | 600秒 | エラー0件、警告≦10件 |
| Upload artifact | GitHub Actions | — | 常時実行（通知用） |

### 6.3 合格条件（CIゲート）

以下を全て満たす場合のみCI通過（終了コード0）：

1. WASMプラグインビルド成功（終了コード0）
2. Biomeリント + フォーマットで error 0件
3. アンチパターン検出で error 0件
4. ESLint関連ファイル・依存が完全に除去されていること
5. 警告は最大10件以下

---

## 7. デーモンモード（ローカル開発向け）

### 7.1 目的

Hook実行を500ms以内に完結させるため、Biome CLIデーモンプロセスを常駐させる。

### 7.2 ライフサイクル

**初回セットアップ**:

```bash
# Biome デーモン起動
biome start

# または pnpm スクリプト経由
pnpm biome start
```

**Hook実行時**:

```bash
# デーモン接続は自動（フラグ不要）
biome check --changed --apply --reporter=json
# → 常駐デーモンに接続して高速実行
```

**状態確認**:

```bash
biome status
# Biome daemon is running on socket: /tmp/biome.socket
```

**停止**:

```bash
biome stop
```

### 7.3 CI環境での取扱い

**デーモンモード非使用**（ワンショット実行）:

```bash
# CI内では各ステップで独立したプロセス起動
npx @biomejs/biome check --reporter=json
```

---

## 8. テストフィクスチャ構成

### 8.1 ディレクトリレイアウト

```
packages/biome-toolchain/tests/
├── domain/                         # Domain層ユニットテスト
│   ├── biome-rule.test.ts
│   ├── lint-execution.test.ts
│   ├── anti-pattern-detector.test.ts
│   ├── hook-configuration.test.ts
│   └── ci-gate-configuration.test.ts
│
├── usecase/                        # UseCase層ユニットテスト
│   ├── execute-lint-usecase.test.ts
│   ├── execute-post-tool-use-hook-usecase.test.ts
│   ├── evaluate-ci-gate-usecase.test.ts
│   └── detect-anti-patterns-usecase.test.ts
│
├── controller/                     # Controller層ユニットテスト
│   ├── cli-controller.test.ts
│   ├── hook-controller.test.ts
│   └── ci-controller.test.ts
│
├── infrastructure/                 # Infrastructure層統合テスト
│   ├── biome-cli-executor.test.ts
│   ├── file-system-reader.test.ts
│   └── json-biome-config-loader.test.ts
│
├── plugins/                        # Biomeプラグイン層テスト
│   ├── gritql/
│   │   ├── require-unit-comment.test.ts
│   │   └── require-layer-comment.test.ts
│   └── rust/
│       ├── no-layer-violation.test.ts
│       └── enforce-folder-structure.test.ts
│
├── parity/                         # v0 ESLint パリティテスト
│   ├── fixtures/
│   │   ├── require-unit-comment/
│   │   ├── require-layer-comment/
│   │   ├── no-layer-violation/
│   │   └── enforce-folder-structure/
│   └── parity.test.ts
│
└── fixtures/                       # テストデータ共通
```

### 8.2 テストランナー設定

**vitest.config.ts**:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
```

**実行コマンド**:

```bash
# 全テスト
pnpm test

# ウォッチモード
pnpm test:watch

# Rust ネイティブテスト
pnpm run test:plugins

# パリティテストのみ
pnpm test parity
```

---

## 9. 環境要件チェックリスト

### 9.1 ローカル開発環境セットアップ

- [ ] **Node.js**
  - コマンド: `node --version`
  - 要件: v18以上（v22 LTS推奨）

- [ ] **pnpm**
  - コマンド: `pnpm --version`
  - 要件: v8以上

- [ ] **Rust toolchain**
  - コマンド: `rustc --version`
  - 要件: 1.70以上

- [ ] **WASMターゲット**
  - コマンド: `rustup target list | grep wasm32-unknown-unknown`
  - 要件: 表示されること

- [ ] **TypeScript**
  - コマンド: `npx tsc --version`
  - 要件: 5.0以上

### 9.2 ビルド検証

- [ ] ルート依存インストール成功
  - `pnpm install` → 終了コード0

- [ ] Biomeプラグイン ビルド成功
  - `pnpm run build:plugins` → dist/*.wasm 生成

- [ ] Biome CLI 動作確認
  - `npx biome check --help` → ヘルプ表示

- [ ] テスト実行成功
  - `pnpm test` → すべてのテストパス

### 9.3 設定ファイル検証

- [ ] biome.json 構文チェック
  - `npx biome check biome.json` → 終了コード0

- [ ] カスタムルール 確認
  - `npx biome explain requireUnitComment` → ルール説明表示

- [ ] WASMプラグイン 読み込み確認
  - `npx biome check --verbose 2>&1 | grep WASM` → プラグインロード表示

### 9.4 既存スクリプト互換性確認

- [ ] scripts/harness/ 動作確認
  - `pnpm phasegate:status` → 正常出力

- [ ] 依存関係 確認
  - `pnpm list` → eslint* パッケージ表示（削除前のみ）

---

## 10. 外部依存の完全マップ

### 10.1 実行時依存

| 依存対象 | 形態 | タイミング | バージョン |
|---------|------|:--------:|:----------:|
| Biome CLI | 外部プロセス | リント実行時 | ^1.0 推奨 |
| Node.js fs/path | 言語機能 | 実行時 | 18+ |
| fast-glob | npm依存 | ファイル列挙時 | ^3.x |
| TypeScript | ランタイム依存 | トランスパイル時 | ^5.0 |

### 10.2 開発時依存

| 依存対象 | 形態 | 用途 | バージョン |
|---------|------|------|:-------:|
| Vitest | npm依存 | テスト実行 | ^3.0.0 |
| @types/node | npm依存 | 型定義 | ^25.3.5 |
| tsx | npm依存 | TS直接実行 | ^4.0.0 |
| Rust | システムツール | WASM開発 | 1.70+ |

### 10.3 CI環境での提供物

**GitHub Actions ubuntu-latest 標準**:
- Git
- curl, wget

**セットアップが必要**:

```yaml
- uses: actions/setup-node@v4           # Node.js
- uses: dtolnay/rust-toolchain@stable   # Rust + targets
```

---

## 11. 実装上の注意点

### 11.1 ハイブリッド実行系統の境界管理

**実行系統A（Biomeプラグイン）** ↔ **実行系統B（TSアプリ）**の境界：

```
実行系統A（外側）
  ↓ JSON診断出力
実行系統B（内側）
  ↑ biome.json設定入力
```

- **直接コード依存は一切なし**
- 通信媒体: Biome CLIの JSON Reporter 形式のみ
- 設定媒体: biome.json のみ

### 11.2 層依存方向の厳密性

Domain層（ドメインルール）がBiomeプラグイン設定を参照しない：

- domain-model.md で定義された集約・値オブジェクト → 外部非依存
- biome.json の設定値は Infrastructure 層（アダプター）が解析・提供

### 11.3 ESLint除去のタイミング

**段階的除去必須** - 以下の順序を守る：

1. Biomeルール実装 + パリティテスト合格確認
2. .eslintrc.* ファイル削除
3. package.json 依存削除 + pnpm install
4. CIゲート強化（ESLint残存チェック追加）

**逆順での実行は CI 断裂につながる**

---

## 12. 参照ドキュメント統合

| ドキュメント | 参照タイミング | 用途 |
|------------|:----------:|------|
| domain_model.md | 実装前 | 集約・値オブジェクト設計確認 |
| logical_design.md | 実装前 | ポート・UseCase・Controller設計確認 |
| folder_management_rules.md | biome.json設定時 | enforce-folder-structure ルール定義 |
| architecture-philosophy.md | biome.json設定時 | no-layer-violation ルール定義 |
| testing-rules.md | テスト設計時 | テスト粒度・ケース設計 |

---

## 13. 結論

biome-toolchain Unitの環境構築は以下3層で段階的に進められる：

### Phase 1: Node.jsエコシステム（1-2時間）
- Node.js + pnpm セットアップ
- npm 依存インストール（@biomejs/biome等）
- package.json スクリプト確認

### Phase 2: Rust/WASMビルド環境（2-4時間）
- Rustup + WASMターゲット インストール
- Cargo.toml 設定確認
- `pnpm run build:plugins` でWASM成功確認

### Phase 3: CI/デーモンモード（1-2時間）
- GitHub Actions workflow 設定
- デーモンモード確認
- パリティテスト実行

**全体所要時間**: 4-8時間程度（初回セットアップ）

すべての要件が満たされれば、v0 ESLintからの**段階的・安全な移行**が実現可能である。

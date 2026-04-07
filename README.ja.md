# Phasegate

**Phasegate -- AI-Agnostic Quality Defense Toolkit**

AIエージェント（Claude Code, Codex, Cursor, Copilot 等）が生成するコードと設計の構造的整合性を機械的に保証する品質防御ツールキットです。

---

## 目次

- [何ができるのか](#何ができるのか)
- [クイックスタート](#クイックスタート)
- [5層防御モデル](#5層防御モデル)
- [設定 (phasegate.config.json)](#設定-phasegateconfigjson)
- [CLIコマンド](#cliコマンド)
- [AIDLC スキル](#aidlc-スキル)
- [メタデータ規約](#メタデータ規約)
- [Claude Code Hooks](#claude-code-hooks)
- [カスタムフェーズゲート](#カスタムフェーズゲート)
- [CI/CD テンプレート](#cicd-テンプレート)
- [導入後のプロジェクト構造](#導入後のプロジェクト構造)

---

## 何ができるのか

Phasegate は **「設計なしの実装を物理的に拒否する」** ツールです。

| カテゴリ | 内容 |
|---|---|
| **フェーズゲート** | 設計文書が存在しないとソースコードの書き込みをブロック。カスタムゲートも定義可能 |
| **5層バリデーション** | L1(AST) → L2(Pre-commit) → L3(CI) → L4(週次) の段階的品質チェック |
| **28 AIDLC スキル** | 要求定義 → 設計 → テスト設計 → TDD実装の全フェーズをスキルとして提供 |
| **Claude Code Hooks** | Write/Edit 時に自動でゲートチェック・Biome lint を実行 |
| **Quick Mode** | バグ修正・ドキュメント修正など軽微な変更ではゲートを緩和して高速実行 |

---

## クイックスタート

### 前提条件

Node.js >= 18, npm >= 9, TypeScript 5.x

### 1. インストール

```bash
npm install --save-dev phasegate
```

### 2. プロジェクト初期化

```bash
npx phasegate init --name <プロジェクト名> --preset standard
```

`.claude/skills/` に28スキルを展開し、`phasegate.config.json` を生成します。

`--preset` で初期構成を選択できます: `minimal`（プロトタイプ）/ `standard`（推奨）/ `strict`（本番）

### 3. 設計原則ドキュメントをコピー

```bash
cp node_modules/phasegate/docs/folder_management_rules.md docs/
mkdir -p docs/principles
cp node_modules/phasegate/docs/principles/*.md docs/principles/
```

### 4. AIDLC を開始

```bash
claude  # プロジェクトルートで起動
```

セッション内で `/product-architect` を実行して設計を開始します。

### アップデート

```bash
npm update phasegate          # パッケージ更新
npx phasegate update-skills   # スキルを最新版に同期
```

---

## 5層防御モデル

| レイヤー | タイミング | チェック内容 | 実行コマンド |
|---|---|---|---|
| **L0** | Agent Hook | hook 設定検証・完了ゲートチェック | `npx phasegate validate --layer L0` |
| **L1** | エディタ保存時 | import グラフ・レイヤー違反・`@unit`/`@layer` メタデータ・AI アンチパターン | `npx phasegate lint` |
| **L2** | コミット前 | フェーズゲート・メタデータ完全性・テスト品質 | `npx phasegate validate --layer L2` |
| **L3** | CI/CD | セキュリティ・パフォーマンス・カバレッジ・要件トレーサビリティ (※) | `npx phasegate validate --layer L3` |
| **L4** | 週次（CI cron） | 設計-コード乖離検出・文書間整合性・デッドコード検出 | `npx phasegate validate --layer L4` |

エラーは統一された `HarnessError` フォーマットで報告され、ADR 参照と修正コード例が含まれるため AI エージェントが自己修正できます。

`--format` オプションで出力形式を切り替えられます:

| フォーマット | 用途 | 出力形式 |
|---|---|---|
| `human` | ローカル開発 | コンソール向け（絵文字・色付き） |
| `agent` | AI エージェント連携 | キー値テキスト（`OVERALL: PASS`, `VALIDATOR: L2-001`） |
| `ci` | CI/CD パイプライン | 構造化 JSON（GitHub Actions 等で解析可能） |

### L2 テスト品質ルール

L2 のテスト品質バリデータ（L2-003）は以下をチェックします:

| ルール | コード | 内容 |
|---|---|---|
| **日本語テスト名** | L2-003 | `it()` / `test()` のテスト名が日本語であること |
| **`actual` 変数** | L2-003 | `expect()` の対象を `const actual` に代入していること |
| **CLI E2E テスト存在** | L2-013 | CLI コマンドに対応する E2E テストが存在すること |

```typescript
// PASS
it('ユーザーが存在する場合、結果を返すこと', async () => {
  // Arrange
  const userId = "test_user";

  // Act
  const actual = await sut.findByUserId(userId);

  // Assert
  expect(actual).toEqual(expectedResult);
});

// FAIL — 英語テスト名 + actual 変数なし
it('should return user', async () => {
  const result = await sut.findByUserId(userId);
  expect(result).toEqual(expectedResult);
});
```

### L3 Nyquist Validation（要件カバレッジ）※ 未完成

> **注意**: バリデーションロジックは実装済みですが、マトリクスファイルの自動生成パイプラインが未完成のため、現時点では手動セットアップが必要です。

通常のコードカバレッジ（L3 coverage）は「コードの何%が実行されたか」を測りますが、Nyquist は**「要件（受け入れ基準）の何%がテストされているか」**を測ります。

**利用するには**: `.harness/requirement-test-matrix.json` を手動で作成し、受け入れ基準とテストの対応を定義します:

```json
{
  "version": "1.0.0",
  "stories": [
    {
      "storyId": "H07-01",
      "storyMappings": [
        {
          "acId": "AC-1",
          "testReferences": [
            {
              "filePath": "src/__tests__/unit/feature.test.ts",
              "testType": "unit",
              "testName": "特定のシナリオをテストする"
            }
          ]
        },
        {
          "acId": "AC-2",
          "testReferences": []
        }
      ]
    }
  ]
}
```

上記の例では AC-2 に `testReferences` がないため、L3 バリデータが「AC-2 はテストされていない」とエラーを報告します。`testType` は `unit` / `it` / `scenario` のいずれかです。マトリクスファイルが存在しない場合、Nyquist チェックはスキップされます。

### L4 週次実行

L4 は CI の cron スケジュールで週次実行します。`consistency-check` テンプレートを使います:

```bash
# テンプレートを生成して配置
npx phasegate ci:generate-template --type consistency-check --render > .github/workflows/consistency-check.yml
```

デフォルトは毎週月曜 09:00 UTC に実行。乖離やデッドコードが検出されると GitHub Issue が自動作成されます。手動で実行する場合は `npx phasegate validate --layer L4` を使います。

---

## 設定 (phasegate.config.json)

プロジェクトルートに配置する品質設定の Single Source of Truth です。

```jsonc
{
  "project": { "name": "my-project", "preset": "standard" },
  "layers": {
    "L0": { "enabled": false },
    "L1": { "enabled": true, "rules": {} },
    "L2": { "enabled": true },
    "L3": { "enabled": true },
    "L4": { "enabled": false }
  },
  "quickMode": {
    "allowedCategories": ["bugfix", "docs", "test", "config"],
    "maintainedLayers": ["L1", "L2"],
    "relaxedGates": ["phase-gate", "2-phase-execution"]
  },
  "phaseDependencies": {
    "preset": "standard",
    "storyReflection": { "enabled": true }
  },
  "protectedFiles": {
    "exclude": ["package.json"]
  }
}
```

### project.preset -- レイヤー厳密度

| プリセット | 有効レイヤー | カバレッジ | 用途 |
|---|---|---|---|
| **minimal** | L1, L2 | -- | プロトタイプ・学習 |
| **standard** | L1-L3 | 90% | 通常開発（デフォルト） |
| **strict** | L1-L4 | 95% | 本番・エンタープライズ |

### layers.L1.rules -- AST ルール設定

L1 の各ルールを `"error"` / `"warning"` / `"off"` で個別に制御できます。省略したルールはデフォルト `"error"` で適用されます。

```jsonc
{
  "layers": {
    "L1": {
      "enabled": true,
      "rules": {
        "no-any-abuse": "warning",
        "no-comment-flood": "off"
      }
    }
  }
}
```

| ルール | コード | チェック内容 |
|---|---|---|
| `require-unit-comment` | L1-001 | `@unit` アノテーションの存在 |
| `require-layer-comment` | L1-002 | `@layer` アノテーションの存在 |
| `no-layer-violation` | L1-003 | import グラフ解析・レイヤー依存方向違反の検出 |
| `enforce-folder-structure` | L1-004 | フォルダ構造と宣言レイヤーの一致 |
| `no-any-abuse` | L1-005 | `any` 型の濫用検出 |
| `no-code-duplication` | L1-006 | コード重複の検出 |
| `no-ghost-file` | L1-007 | 未参照ファイルの検出 |
| `no-comment-flood` | L1-008 | 過剰コメントの検出 |
| `it-test-mock-detection` | L1-017 | テストでの不適切なモック使用を検出 |
| `stub-comment-detection` | L1-018 | スタブコメント（TODO/FIXME/HACK 等）の検出 |

### phaseDependencies.preset -- フェーズゲート構成

`project.preset` とは独立して設定します。

| プリセット | ゲート | storyReflection | 用途 |
|---|---|---|---|
| **full** | 全 AIDLC ゲート | `logical_design` + `domain_model` required | AIDLC フルセレモニー |
| **standard** | コアゲート | `logical_design` required | 通常開発 |
| **minimal** | なし | 無効 | プロトタイプ |
| **custom** | `gates[]` で定義 | `storyReflection.mappings` で定義 | 完全カスタマイズ（`override: true` 必須） |

### storyReflection -- US 単位の設計反映ゲート

`storyReflection` は **「inception の設計成果が product docs に反映されるまで実装をブロックする」** 仕組みです。

#### 動作の仕組み

`src/{unit}/` への書き込み時に、以下の検査が自動で走ります:

1. `docs/inception/{unit}/` 配下のディレクトリを走査し、US-XXX / ISSUE-XXX を自動検出
2. 検出した各 US について、inception 側のファイルが存在するかチェック
3. 存在する場合、対応する product 側のファイルに `@story-id` アノテーションが含まれるかチェック
4. **含まれていなければ書き込みをブロック**

```
docs/inception/my-unit/US-001/logical_design.md  ← 存在する
docs/product/construction/my-unit/logical_design.md  ← @story-id US-001 がない
→ src/my-unit/ への書き込みがブロックされる
```

#### `@story-id` アノテーションの書き方

product docs に設計成果を反映する際、反映元の US/ISSUE を `@story-id` で記録します:

```markdown
<!-- docs/product/construction/my-unit/logical_design.md -->

## ポート定義

<!-- @story-id US-001 -->
### UserRepository Port
- findById(id: UserId): Promise<User>

<!-- @story-id US-001, US-002 -->
### OrderRepository Port
- findByUserId(id: UserId): Promise<Order[]>
```

カンマ区切りで複数の US を1つのアノテーションに記載できます。

#### standard プリセットのデフォルトマッピング

| inception 側（検出対象） | product 側（反映先） | 必須 |
|---|---|---|
| `docs/inception/{unit}/{storyId}/logical_design.md` | `docs/product/construction/{unit}/logical_design.md` | **Yes**（ブロック） |
| `docs/inception/{unit}/{storyId}/domain_model.md` | `docs/product/construction/{unit}/domain_model.md` | No（警告のみ） |

カスタムマッピングも定義できます:

```jsonc
{
  "phaseDependencies": {
    "preset": "standard",
    "storyReflection": {
      "enabled": true,
      "mappings": [
        {
          "inception": "docs/inception/{unit}/{storyId}/logical_design.md",
          "product": "docs/product/construction/{unit}/logical_design.md",
          "required": true
        },
        {
          "inception": "docs/inception/{unit}/{storyId}/domain_model.md",
          "product": "docs/product/construction/{unit}/domain_model.md",
          "required": true
        }
      ]
    }
  }
}
```

#### 制限事項

- **特定の US だけゲートを通すことはできません** — inception に存在する全 US の反映が必要です
- `/story-implementor --story US-001` の `--story` 引数はゲートに接続されていません。検出はファイルシステムの走査のみで行われます

### quickMode -- 軽微な変更の緩和

Quick Mode は以下の方法で発動します:

- **CLI**: `npx phasegate ci-check --quick`
- **スキル**: `/quick-implementor` を使用すると自動で Quick Mode が適用されます

`bugfix`, `docs`, `test`, `config` カテゴリの変更では、Phase Gate と 2-Phase Execution を緩和し L1/L2 のみ維持します。

**Quick Mode が拒否される条件**（フルチェックが強制されます）:
- `domain/` 配下に新規ファイルを追加した場合
- `*port.ts` や `*adapter.ts`（API 契約）を変更した場合
- 新機能追加・新ドメインモデル追加に該当する変更

### protectedFiles -- AI 書き込み保護

以下のファイルはデフォルトで AI による直接編集から保護されます:

| 保護ファイル | 理由 |
|---|---|
| `package.json` | 依存関係・バージョン管理 |
| `package-lock.json` | ロックファイル |
| `tsconfig.json` | TypeScript 設定 |
| `biome.json` / `.biome.json` | リンター設定 |

`protectedFiles.exclude` に指定すると、そのファイルの保護が解除され AI が直接編集できるようになります。保護されたファイルを編集しようとすると、PreToolUse Hook が適切なスキル（`/quick-implementor` 等）の使用をガイドします。

---

## CLIコマンド

```bash
npx phasegate <command> [options]
```

### セットアップ

| コマンド | 説明 |
|---|---|
| `init --name <name>` | スキル展開 + phasegate.config.json 生成 |
| `update-skills` | スキルを最新版に再デプロイ |
| `list-features` | 利用可能な機能一覧（下表参照） |
| `enable-feature <name>` / `disable-feature <name>` | 機能の有効化/無効化 |

利用可能な Feature flags:

| Feature | 説明 | デフォルト |
|---|---|---|
| `agentLessonCollection` | AI エージェントの学習ログを収集 | off (`strict` で on) |
| `cascadeUpdate` | 下位フェーズの変更を上位設計に自動反映 | off |
| `bundleSizeLimit` | バンドルサイズ制限チェック (KB) | off (`strict` で 500KB) |
| `deadCodeGC` | デッドコード検出・削除 | off (`strict` で on) |

> **注意**: Feature flags は config への保存・読み出しは動作しますが、フラグに応じたランタイム動作は未実装です（将来バージョンで対応予定）。

### 品質チェック

| コマンド | 説明 | 主なオプション |
|---|---|---|
| `lint` | L1 Biome AST チェック | `--target <path>` `--json` |
| `validate` | 指定レイヤーのバリデータ実行 | `--layer L1\|L2\|L3\|L4\|all` `--unit <name>` `--format human\|agent\|ci` |
| `ci-check` | CI フルチェック (L2-L4) | `--quick` `--dry-run` `--fail-on-reject` |
| `check-phase-gate` | フェーズゲートチェック | `--level 1\|2\|3` |
| `validate-metadata <files>` | メタデータ検証 | |

### phasegate コマンド

`phasegate:` プレフィックス付きのコマンドは JSON 出力に対応し、スクリプトからの利用に適しています。

| コマンド | 説明 |
|---|---|
| `phasegate:status` | 全体の健全性サマリ |
| `phasegate:check-ready` | 全 story の Phase Gate 通過状態 |
| `phasegate:check-phase --unit <id>` | 指定 Unit の現在フェーズ |
| `phasegate:ci-check` | 全 L3 バリデータ実行 |
| `phasegate:detect-drift` | 設計-コード乖離レポート |
| `phasegate:lint --target <path>` | lint 実行 |
| `phasegate:complete-check` | L2-L4 全チェック |
| `phasegate:impact-analysis <storyId>` | ストーリー影響範囲分析 |

### その他

| コマンド | 説明 |
|---|---|
| `list-adrs` | ADR 一覧（`--status` でフィルタ可能） |
| `validate-adr` | ADR 検証（`--all` または `<adrRef>`） |
| `list-errors` | エラー定義一覧（`--layer L0-L4`） |
| `ci:generate-template` | CI/CD テンプレート生成（`--type <type>`） |

> 開発者向けコマンド（回帰テスト、Hooks Engine、Phase 2 拡張、スキル品質）は [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md) を参照してください。

---

## AIDLC スキル

AIDLC (AI-Driven Development Life Cycle) は設計 → テスト設計 → TDD 実装の順序を強制するプロセスです。各レベルの成果物が次のレベルの前提条件になります。

### 使い方

Claude Code セッション内でスラッシュコマンドとして実行します:

```
/product-architect          ← Level 1 の最初のスキル
/story-implementor          ← Level 3 の実装スキル
/quick-implementor          ← バグ修正など軽微な変更
```

各スキルは前のレベルの成果物を入力として参照します。前提条件が未完了の場合、フェーズゲートがブロックします。

### Level 1: 要求定義（成果物: `docs/inception/_shared/`）

| スキル | 目的 |
|---|---|
| `/product-architect` | プロダクト全体像（ドメイン・アーキテクチャ・制約）を定義 |
| `/story-writer` | Who/What/Why 形式のユーザーストーリーと受け入れ基準を作成 |
| `/story-mapper` | MVP スコープ整理・優先順位定義 |
| `/unit-designer` | ストーリーを独立構築可能な Unit にグルーピング |

### Level 2: Unit 設計（成果物: `docs/inception/{unit}/`）

Level 1 の `/unit-designer` 完了が前提条件。

| スキル | 目的 |
|---|---|
| `/domain-designer` | DDD ドメインモデル設計（集約・Entity・VO・イベント） |
| `/logical-designer` | Hexagonal Architecture 設計（Port & Adapter） |
| `/mock-designer` | UI モックアップ設計 |
| `/environment-designer` | ローカル開発環境・インフラ設計 |
| `/unit-test-designer` | ユニットテストケース設計 |
| `/it-test-designer` | 統合テストケース設計 |
| `/unit-test-logic-designer` | UT Vitest 実装ロジック設計 |
| `/it-test-logic-designer` | IT Vitest 実装ロジック設計 |

### Level 3: ストーリー実装（成果物: `docs/inception/{unit}/{US-XXX}/`）

Level 2 の `domain_model.md` + `logical_design.md` の存在が前提条件。

| スキル | 目的 |
|---|---|
| `/logical-designer` | US 固有の論理設計 |
| `/uiux-designer` | 最終 UI/UX 定義 |
| `/scenario-test-designer` | E2E シナリオテストケース設計 |
| `/scenario-test-logic-designer` | Playwright E2E 実装ロジック設計 |
| `/implementation-readiness-checker` | 実装開始前の準備状況検証 |
| `/story-implementor` | TDD 実装 (Red -> Green -> Refactor) |
| `/quick-implementor` | 軽微変更の高速実装（バグ修正・ドキュメント等） |

### Verification スキル（任意のタイミングで使用）

| スキル | 目的 |
|---|---|
| `/consistency-checker` | 設計文書間の整合性チェック |
| `/cascade-updater` | 下位フェーズの発見を上位設計にフィードバック ※未完成 |
| `/codex-delegator` | Codex CLI にタスクを委任し品質管理 |
| `/codebase-mapper` | `@unit`/`@layer` アノテーションから構造マップ生成 |
| `/doc-freshness-checker` | 設計文書の鮮度チェック |
| `/pointer-validator` | 設計文書内のファイルパス参照を検証 |
| `/engineering-perspective` | Beck/Fowler/Martin/Evans の視点で設計レビュー |
| `/test-coverage-checker` | カバレッジ検証・Nyquist Validation |
| `/implementation-planner` | 実装計画の立案 |
| `/skill-creator` | スキルの作成・更新 |

---

## メタデータ規約

全ソースファイルの先頭に `@unit` / `@layer` コメントを記載します。テストファイルには `@story` も追加します。

```typescript
// @unit config-foundation
// @layer domain
// @story US-001          ← テストファイルのみ

export class ConfigSchema { ... }
```

| タグ | 値の決め方 | 例 |
|---|---|---|
| `@unit` | `/unit-designer` スキルが定義した Unit 名を使用。手動の場合はドメインの論理グループ名 | `config-foundation`, `validator-system` |
| `@layer` | ファイルの役割に応じて4値から選択 | `domain` / `application` / `infrastructure` / `presentation` |
| `@story` | テストが検証するユーザーストーリーの ID | `US-001`, `US-003` |

これにより L1 検証（`require-unit-comment`, `require-layer-comment`）・トレーサビリティ・drift-detection が機能します。タグが欠けているファイルは L1 でエラーになります（`layers.L1.rules` で緩和可能）。

---

## Claude Code Hooks

`.claude/settings.json` に以下を設定すると、ファイル書き込み時に自動でゲートチェックと lint が実行されます。

```jsonc
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|Bash",
        "hooks": [{
          "type": "command",
          "command": "npx tsx scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts"
        }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "npx tsx scripts/harness/agent-integration/presentation/post-tool-use-hook.ts"
        }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "npx tsx scripts/harness/agent-integration/presentation/stop-hook.ts"
        }]
      }
    ]
  }
}
```

| Hook | タイミング | 動作 |
|---|---|---|
| **PreToolUse** | Write/Edit/Bash 実行前 | フェーズゲート違反・保護ファイルへの書き込み・Bash 経由の書き込み(`sed -i`, `tee` 等)をブロック |
| **PostToolUse** | Write/Edit 実行後 | Biome AST ルールを自動実行、違反を即時フィードバック |
| **Stop** | セッション終了前 | L2-L4 全チェックを実行、全グリーンでないと終了を保留 |

ブロック時は違反理由・不足している設計文書・次に実行すべきスキルを含むエラーメッセージが返されます。

> **オプション**: `.claude/scripts/` 配下にシェルスクリプトフック（deny-check, format, analyze-errors 等）を追加配置できます。詳細は [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md#オプション-シェルスクリプトフック) を参照してください。

---

## カスタムフェーズゲート

デフォルトでは AIDLC フェーズ依存モデルが適用されますが、`gates[]` 配列で独自のゲートを定義できます。

### ゲート定義

| フィールド | 型 | 説明 |
|---|---|---|
| `name` | string | ゲートの一意識別子 |
| `level` | 1 \| 2 \| 3 | フェーズレベル（上位は下位の通過が前提） |
| `blocks` | string[] | 保護するファイルの glob パターン |
| `requires` | string[] | 書き込み前に存在が必要なファイル |
| `dependsOn` | string[] | 事前に通過が必要な他のゲート名 |
| `description` | string | ゲートの説明 |

ゲートは DAG（有向非巡回グラフ）を形成します。循環依存は設定読み込み時に拒否されます。

### 例 1: API スキーマファーストゲート

AIDLC を使わないプロジェクトで「OpenAPI スキーマなしに API 実装を書けない」を強制する例:

```jsonc
{
  "phaseDependencies": {
    "preset": "custom",
    "override": true,
    "gates": [
      {
        "name": "schema-first",
        "level": 3,
        "blocks": ["src/api/**/*.ts"],
        "requires": ["docs/api/openapi.yaml"],
        "description": "API実装にはOpenAPIスキーマが必要"
      }
    ]
  }
}
```

### 例 2: AIDLC フローを明示的に定義

[docs/folder_management_rules.md](docs/folder_management_rules.md) の **inception → product → source** フローを段階的にゲートする例:

```jsonc
{
  "phaseDependencies": {
    "preset": "custom",
    "override": true,
    "gates": [
      // Phase 1: プロダクト概要がないとストーリー定義に進めない
      {
        "name": "product-overview",
        "level": 1,
        "blocks": [
          "docs/product/user_stories.md",
          "docs/product/user_story_mapping.md"
        ],
        "requires": ["docs/product/product_overview.md"],
        "description": "プロダクト概要がないとストーリー定義に進めない"
      },
      // Phase 1→2: Unit定義がないとUnit設計に進めない
      {
        "name": "unit-definition",
        "level": 1,
        "blocks": ["docs/product/construction/*/domain_model.md"],
        "requires": ["docs/product/units/integration_contract.md"],
        "dependsOn": ["product-overview"],
        "description": "Unit定義・統合契約がないとUnit設計に進めない"
      },
      // Phase 2: ドメインモデルがないと論理設計に進めない
      {
        "name": "domain-model",
        "level": 2,
        "blocks": ["docs/product/construction/*/logical_design.md"],
        "requires": ["docs/product/construction/{unit}/domain_model.md"],
        "dependsOn": ["unit-definition"],
        "description": "ドメインモデルがないと論理設計に進めない"
      },
      // Phase 2→3: 論理設計がないと実装コードに進めない
      {
        "name": "implementation-gate",
        "level": 3,
        "blocks": ["src/**/*.ts"],
        "requires": [
          "docs/product/construction/{unit}/domain_model.md",
          "docs/product/construction/{unit}/logical_design.md"
        ],
        "dependsOn": ["domain-model"],
        "description": "確定版の設計文書がないと実装に進めない"
      }
    ],
    "storyReflection": {
      "enabled": true,
      "mappings": [
        {
          "inception": "docs/inception/{unit}/{storyId}/logical_design.md",
          "product": "docs/product/construction/{unit}/logical_design.md",
          "required": true
        }
      ]
    }
  }
}
```

この設定では以下の順序が強制されます:

```
product_overview.md
  → user_stories.md / user_story_mapping.md
    → integration_contract.md
      → domain_model.md
        → logical_design.md
          → src/**/*.ts（+ storyReflection で US 単位の反映も必須）
```

> **ヒント**: `standard` や `full` プリセットはこのフローの大部分をゼロコンフィグで適用します。カスタムゲートは、段階をより細かく制御したい場合や AIDLC 以外のワークフローに使います。

---

## CI/CD テンプレート

```bash
npx phasegate ci:generate-template --type aidlc-gate          # PR検証ワークフロー
npx phasegate ci:generate-template --type pre-commit           # Pre-commitフック
npx phasegate ci:generate-template --type consistency-check    # 週次整合性チェック
```

`--render` オプションでファイルに直接出力できます:

```bash
npx phasegate ci:generate-template --type aidlc-gate --render > .github/workflows/aidlc-gate.yml
```

> **既知の問題**: `--preset` オプションでデフォルトプリセットが見つからないエラーが発生する場合があります。`--preset` を省略して実行してください。

---

## 導入後のプロジェクト構造

```
your-project/
├── phasegate.config.json         # 品質設定（Single Source of Truth）
├── docs/
│   ├── folder_management_rules.md
│   ├── principles/               # アーキテクチャ哲学・テスト規約
│   ├── product/                  # 確定版設計文書
│   │   ├── <product>_overview.md
│   │   ├── units/{unit}.md
│   │   └── construction/{unit}/
│   │       ├── domain_model.md
│   │       └── logical_design.md
│   ├── inception/                # AIDLC が生成する設計計画文書
│   │   ├── _shared/             # Level 1（プロダクト全体）
│   │   └── {unit}/{US-XXX}/     # Level 2/3（Unit・ストーリー単位）
│   └── ADR/
├── src/                          # 実装コード（@unit/@layer 必須）
└── .claude/
    ├── settings.json             # Hooks 設定
    └── skills/                   # npx phasegate init で展開
```

### 推奨 .gitignore

```
node_modules/
.claude/skills/    # npx phasegate init で再生成可能
dist/
reports/
```

---

## 開発者向けドキュメント

phasegate 自体の開発（内部アーキテクチャ、回帰テスト、リリース手順等）については [DEVELOPMENT.ja.md](DEVELOPMENT.ja.md) を参照してください。

---

*Last updated: 2026-04-07 -- v0.33.0*

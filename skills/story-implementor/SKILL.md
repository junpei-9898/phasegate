---
name: story-implementor
description: 論理設計+環境設計に基づくTDD実装。環境検証と教訓フィードバック付き（AIDLC Step 2.3-2.7）
model: codex
languages: [typescript]
---

# Story Implementor

ストーリー固有の論理設計と環境設計に基づき、TDDで実装を行うスキル。AIDLCプロセスのStep 2.3〜2.7に対応。

## 前提条件チェック

### 必須インプット（存在しなければ`[Question]`で提供を要求）
- **ストーリー固有論理設計** — 実装対象の詳細設計
- **環境設計** — `docs/product/environment_contract.md`（環境検証チェックリストを含む）

### 任意インプット（あれば参照）
- **アーキテクチャルール** — 実装パターン、層の依存方向
- **テスト規約** — テストケースの書き方、構造
- **横断論理設計** — Unit全体のコンポーネント構成
- **シナリオテスト設計** — E2Eテストの設計文書
- **UIUX設計** — フロントエンド実装の設計文書

---

## ⚠️ 上位レイヤー存在チェック

**このスキルは AIDLC Step 2.3〜2.7「TDDで実装〜テスト完了」に対応します。実行前に上位設計の存在を確認してください。**

### 依存する上位設計文書

| ファイル | 必須 | チェック方法 |
|---------|------|------------|
| `docs/product/construction/{unit}/logical_design.md` | ✅ 必須 | 論理設計の存在を確認 |
| `docs/inception/{unit}/{story_id}/logical_design.md` | ✅ 必須 | ストーリー固有論理設計の存在を確認 |
| `docs/product/environment_contract.md` | ✅ 必須 | 環境設計の存在を確認 |
| `docs/inception/{unit}/{story_id}/scenario_test_design.md` | 📋 推奨 | シナリオテスト設計の存在を確認 |
| `docs/product/construction/{unit}/uiux_design.md` | 📋 推奨 | UIUX設計の存在を確認（フロントエンドがある場合） |

### テスト設計・ロジック設計の事前チェック

**TDD実装の前に、テスト設計が完了していることを確認してください。テスト設計が不足している場合、テスト漏れのリスクがあります。**

| ファイル | 必須 | チェック方法 |
|---------|------|------------|
| `docs/product/construction/{unit}/unit_test_design.md` | ✅ 必須 | ユニットテストケース設計 |
| `docs/product/construction/{unit}/it_test_design.md` | ✅ 必須 | ITテストケース設計 |
| `docs/inception/{unit}/{story_id}/scenario_test_design.md` | ✅ 必須 | シナリオテストケース設計 |
| `docs/product/construction/{unit}/coverage_report.md` | ✅ 必須 | カバレッジ検証済み（90%以上推奨） |
| `docs/product/construction/{unit}/unit_test_logic.md` | 📋 推奨 | ユニットテストロジック設計 |
| `docs/product/construction/{unit}/it_test_logic.md` | 📋 推奨 | ITテストロジック設計 |
| `docs/inception/{unit}/{story_id}/scenario_test_logic.md` | 📋 推奨 | シナリオテストロジック設計 |

### テスト設計が不足している場合のアクション

テスト設計文書が不足している場合、**TDD実装を開始せず**、以下を行う：

1. **状況報告** — ユーザーに不足しているテスト設計を明示
2. **選択肢提示** — 以下の選択肢を提示
   - テスト設計を先に実行する（推奨フロー）
   - テスト設計をスキップして進める（非推奨、テスト漏れリスクあり）
3. **ユーザー指示待ち** — 独自判断で実装を開始しない

**推奨フロー:**
```
1. unit-test-designer → it-test-designer → scenario-test-designer
2. test-coverage-checker（カバレッジ検証）
3. unit-test-logic-designer → it-test-logic-designer → scenario-test-logic-designer
4. story-implementor（本スキル）
```

### 上位設計が存在しない場合のアクション

上位設計文書が存在しない場合、**実装を開始せず**、以下を行う：

1. **状況報告** — ユーザーに不足している設計文書を明示
2. **選択肢提示** — 以下の選択肢を提示
   - 上位設計（logical-designer, scenario-test-designer, uiux-designer）を先に実行する
   - 上位設計をスキップして進める（非推奨）
3. **ユーザー指示待ち** — 独自判断で実装を開始しない

**報告テンプレート:**
```markdown
## ⚠️ 上位レイヤー設計が見つかりません

以下の設計文書が存在しないため、TDD実装を開始できません：

**必須:**
- `docs/inception/{unit}/{story_id}/logical_design.md` ❌ 未作成
- `docs/product/environment_contract.md` ❌ 未作成

**推奨（存在すればより安全に実装可能）:**
- `docs/inception/{unit}/{story_id}/scenario_test_design.md` ⚠️ 未作成
- `docs/inception/{unit}/{story_id}/uiux_design.md` ⚠️ 未作成

### 推奨アクション
1. `logical-designer` でストーリー固有論理設計を作成
2. `scenario-test-designer` でシナリオテスト設計を作成
3. `uiux-designer` でUIUX設計を作成（フロントエンドがある場合）

### 選択肢
1. **上位設計を先に実行する**（推奨）
2. **必須設計のみで進める**（推奨設計はスキップ）
3. **このまま進める**（上位設計なしで進める場合、整合性リスクあり）

どちらを選択しますか？
```

---

## ⚠️ 生成ファイルへのメタデータ付与（必須）

**新規ソースファイルを作成する際、ファイル先頭に必ず `@unit` / `@layer` メタデータを記述する。これは L1 Biome ルール (`L1-001: require-unit-comment`, `L1-002: require-layer-comment`) の要件であり、欠落した状態での生成は許容されない。**

### TypeScript / JavaScript ファイル

```typescript
// @unit <対象Unit名 — logical_design.md の Unit ID を使用>
// @layer <domain | application | infrastructure | presentation>

// 以下、実装コード
```

### `@unit` の決定方法

- `docs/product/construction/{unit}/logical_design.md` の Unit ID をそのまま引用する
- ストーリー固有実装の場合は、該当ストーリーが属する Unit の ID を使用
- **複数 Unit にまたがる場合は story-implementor のスコープ違反** — `implementation-readiness-checker` に差し戻し、Unit 分割を検討する

### `@layer` の決定方法

生成ファイルの配置パスから機械的に決定する:

| 配置パス | `@layer` の値 |
|---------|-------------|
| `**/domain/**` | `domain` |
| `**/application/**` | `application` |
| `**/infrastructure/**` | `infrastructure` |
| `**/presentation/**` | `presentation` |

Clean Architecture の 4 層構成に従わないプロジェクトは、プロジェクト側で層名を定義した上で phasegate のルール設定に同期させること。

### テストファイルの場合

テストファイル（`**/__tests__/**`, `*.test.ts`, `*.spec.ts`）には `@unit` / `@layer` に加えて **`@story` タグを付与する**:

```typescript
// @unit <被テストコードと同じ Unit ID>
// @layer <被テストコードと同じ layer>
// @story <HXX-XX 形式のストーリーID>
```

- `@story` は `docs/inception/{unit}/{story_id}/` の `story_id` を使用
- 複数ストーリーをカバーするテストは `// @story H09-01, H09-02` のように列挙
- US↔テストの逆引きが機械的に可能になることが目的（test-coverage-checker / nyquist が集計に使用）

### 検証

実装完了後、以下で L1 違反が無いことを確認する:

```bash
npx phasegate lint
```

`L1-001` / `L1-002` で違反が検出された場合、本スキル終了前に必ず解決すること。スキルを抜けた後で付け直すのはアンチパターン（直後の L1 有効化時に全違反がまとめて噴出する）。

---

## ⚠️ 2フェーズ実行ルール

**このスキルは必ず2フェーズに分けて実行する。Phase 1で実装計画を作成し、人間の承認を得てからPhase 2でTDD実装を行う。Phase 1とPhase 2を同時に実行してはならない。**

---

## Phase 1: 計画（plan）

### 目的
TDD実装の順序・スコープ・不明点を整理し、人間の承認を得る。

### ⚠️ Step 0: 前提条件の検証（implementation-readiness-checker に委譲）

**計画作成の前に `implementation-readiness-checker` スキルを実行済みであることを確認する。**

- 未実行の場合: ユーザーに `implementation-readiness-checker` の実行を促す
- 実行済みで全条件クリアの場合: Step 1 以降に進む
- 実行済みだが不足がある場合: 不足スキルの実行を促す

> **注意**: このスキル内で独自にファイル存在チェックを行わない。前提条件検証は `implementation-readiness-checker` に一本化する。

---

### 出力ファイル
`docs/inception/{unit}/{story_id}/tdd_implementation_plan.md`

### 計画ファイルの構成

```markdown
# TDD実装計画: {ストーリーID}

## 1. スコープ
- 対象ストーリーと受け入れ基準
- 影響する層（DB / Domain / UseCase / Controller / BFF / Frontend）

## 2. 前提条件検証
- `implementation-readiness-checker` 実行日時: YYYY-MM-DD HH:MM
- 判定結果: ✅ 実装準備完了 / ⚠️ 推奨ファイル欠落あり

## 3. TDD実装順序（テストピラミッド準拠）

### 1. Unitテスト (RED → GREEN → REFACTOR)
| 対象 | テスト内容 | 実装内容 |
|------|----------|---------|
| Entity/ValueObject | 不変条件・ビジネスルール | ドメインモデル |
| Policy | 検証ロジック | ポリシー実装 |

**実行方式:** codex-delegator経由、またはメインセッションで直接実行

### 2. ITテスト (RED → GREEN → REFACTOR)
| 対象 | テスト内容 | 実装内容 |
|------|----------|---------|
| Repository | CRUD・トランザクション | DB永続化 |
| UseCase | ビジネスロジック統合 | ユースケース |
| Controller | 認証・認可・バリデーション | APIエンドポイント |

**実行方式:** codex-delegator経由、またはメインセッションで直接実行

### 3. E2E/シナリオテスト (RED → GREEN → REFACTOR)
| 対象 | テスト内容 | 実装内容 |
|------|----------|---------|
| 画面フロー | 業務シナリオ | フロントエンド |

**実行方式:** codex-delegator経由、またはメインセッションで直接実行

## 4. 環境検証チェックリスト（事前実行結果）
- [ ] 全マイグレーション適用済み
- [ ] 全サービス起動
- ...

## 5. QA（不明点・確認事項）

### [Question] Q1: {質問タイトル}
{質問の詳細と背景}
**推奨案:** {AIの推奨案}

[Answer]
（人間が回答を記入）

## 6. 前提条件・リスク
- ...
```

### Phase 1 完了条件
- 計画ファイルを出力した
- 環境検証チェックリストを事前実行した
- 不明点がある場合は`[Question]`セクションに記載した
- **人間にボールを渡した**
- **実装コードはまだ書いていない**

---

## Phase 2: 実行（execution）

### 開始条件
- 人間がPhase 1の計画を承認した
- QAセクションの全[Question]に[Answer]が記入されている（QAがある場合）
- Quick Mode の許可カテゴリ外（domain/application/infrastructure/presentation/config）を変更する場合、実装前に hook-visible Full Mode session を開始している

### Full Mode session

Quick Mode の許可カテゴリ外を変更する Phase 2 では、手作業で `quickMode.allowedCategories` を広げない。以下の CLI で対象 Unit / WI に限定した一時 session を作成し、実装完了時に終了する。

```bash
phasegate session begin --mode full --unit <unit> --work-item <WI-XXX> --reason "story-implementor Phase 2" --duration 1h
```

実装完了または中断時:

```bash
phasegate session end --work-item <WI-XXX>
```

PreToolUse hook は `.phasegate/session.json` の TTL・unit・カテゴリを検証する。スキル名だけでは hook 通過の根拠にならない。

### ワークフロー

1. **Unitテスト TDDサイクル** — ドメインモデルの RED→GREEN→REFACTOR
   - Entity, ValueObject, ドメインサービスのテスト
   - `unit_test_logic.md` を参照してテストを実装
   - **実行方式:** codex-delegator経由、またはメインセッションで直接実行

2. **ITテスト TDDサイクル** — アプリケーション層の RED→GREEN→REFACTOR
   - UseCase, Repository, Controllerのテスト
   - `it_test_logic.md` を参照してテストを実装
   - **実行方式:** codex-delegator経由、またはメインセッションで直接実行

3. **E2E/シナリオテスト TDDサイクル** — フロントエンドの RED→GREEN→REFACTOR
   - 画面操作を含むシナリオテスト
   - `scenario_test_logic.md` を参照してテストを実装
   - **実行方式:** codex-delegator経由、またはメインセッションで直接実行

4. **環境検証（実装完了後）** — 環境検証チェックリストを再実行

5. **教訓フィードバック** — フレームワーク制約・設定漏れ等を発見した場合、`cascade-updater`起動を提案

### TDD実行順序の重要性

```
Unit → IT → E2E の順序を守ることで:
- 下位層のテストが上位層の安定性を保証
- エラーの原因特定が容易
- テストピラミッドの原則に準拠
```

### 出力

| 種別 | 配置先 |
|------|--------|
| コード | プロジェクト内 |
| レポート | 会話内（環境検証結果 + 教訓フィードバック） |

---

## 注意事項

- **ファイル配置は `docs/folder_management_rules.md` に従うこと**
- 設計文書を確認せずに実装を開始しない
- 既存コードを読まずに変更しない
- 担当Unit以外のコードを変更しない
- フレームワーク制約を発見した場合は必ず教訓フィードバックに記録する

# スキル分離計画書

- **作成日**: 2026-04-03
- **ステータス**: 計画中
- **関連**: configurable_phase_gate_plan.md、OSS公開戦略

---

## 1. 課題

現在 28 スキルが全て `skills/` に同梱されているが、phasegate の核心機能（品質防御）に直接関係するスキルは一部のみ。

**問題:**
1. **パッケージが重い**: ユーザーが使わないスキルまで強制インストールされる
2. **誤解を生む**: 「28スキル全部使わないといけないのか」という印象を与え、採用障壁になる
3. **責務の混在**: 品質防御ツールキット（Core）と開発ワークフローテンプレート（AIDLC）が未分離
4. **フェーズゲートとの密結合**: ハードコードされたフェーズノードがスキル名を直接参照しており、スキルを使わないチームではゲートが機能しない

---

## 2. 現状分析: 28スキルの分類

### Core スキル（8個）— 品質防御に直接貢献

| スキル | 役割 | 関連レイヤー |
|--------|------|-------------|
| consistency-checker | 設計文書間の整合性検証 | L4 |
| cascade-updater | 下位フェーズの発見を上位設計に伝搬 | L4 |
| pointer-validator | 設計文書内のファイル参照検証 | L4 |
| doc-freshness-checker | 設計文書の鮮度検出 | L4 |
| implementation-readiness-checker | 実装前提条件のゲートキーパー | L2 |
| test-coverage-checker | テストカバレッジ検証 | L3 |
| codebase-mapper | @unit/@layer 構造マップ生成 | L4 |
| engineering-perspective | 多視点コードレビュー | L3 |

### AIDLC ワークフロースキル（18個）— 開発ライフサイクルのテンプレート

**Foundation (4):**
product-architect, story-writer, story-mapper, unit-designer

**Design (5):**
domain-designer, logical-designer, mock-designer, uiux-designer, environment-designer

**Test Engineering (7):**
unit-test-designer, it-test-designer, scenario-test-designer,
unit-test-logic-designer, it-test-logic-designer, scenario-test-logic-designer,
(test-coverage-checker は Core に分類)

**Implementation (2):**
story-implementor, quick-implementor, implementation-planner

### ユーティリティスキル（2個）

| スキル | 役割 |
|--------|------|
| skill-creator | スキルの作成・パッケージング |
| codex-delegator | Codex CLI へのタスク委譲 |

---

## 3. 提案: 3層スキルアーキテクチャ

```
phasegate (npm package)
├── Core スキル (8)        ← 常に同梱
├── AIDLC テンプレート     ← オプショナル（init 時に選択）
└── ユーティリティ          ← オプショナル
```

### 方針

| 層 | 配布方法 | インストール |
|----|---------|-------------|
| **Core** | phasegate 本体に同梱 | `npm install phasegate` で自動 |
| **AIDLC テンプレート** | phasegate 本体に同梱するが init 時に選択 | `npx phasegate init --skills all` で全展開、`--skills core` で Core のみ |
| **ユーティリティ** | AIDLC テンプレートと同じ | 同上 |

**別パッケージ（`phasegate-skills`）に分離する案は v1.0 では見送る。** 理由:
- パッケージ管理の複雑さが増す
- ユーザーの依存管理が煩雑になる
- 同一パッケージ内で `init --skills` オプションにより十分に制御可能

---

## 4. init コマンドの拡張

### 現状

```bash
npx phasegate init --name my-project
# → 28スキル全てを .claude/skills/ に展開
```

### 提案

```bash
# Core スキルのみ（最小構成）
npx phasegate init --name my-project --skills core

# Core + AIDLC テンプレート（フルセット、現状と同等）
npx phasegate init --name my-project --skills all

# デフォルト（--skills 省略時）
npx phasegate init --name my-project
# → 対話プロンプトで選択、または --skills all と同等
```

### --skills オプション

| 値 | 展開されるスキル |
|----|-----------------|
| `core` | 8 Core スキルのみ |
| `all` | 全 28 スキル |
| 将来的に: カンマ区切りで個別指定 | `--skills core,story-implementor,quick-implementor` |

---

## 5. フェーズゲートとの連携

スキル分離は `configurable_phase_gate_plan.md` と密接に関連する。

### 現状の問題

フェーズノードがスキル名をキーにしている:
```typescript
createNode(2, 'domain-designer', [
  { name: 'domain-model', path: 'docs/product/construction/{unit}/domain_model.md', required: true }
]);
```

→ `domain-designer` スキルを展開していないチームでは、このフェーズノードが意味をなさない。

### 解決策

1. **プリセットとスキルセットの対応** — `minimal` プリセットは Core スキルのみで完結するゲート条件を持つ
2. **カスタムゲートではスキル名に依存しない** — `gates[].requires` はファイルパスのみで判定し、どのスキルで作成したかは問わない

| プリセット | 必要スキル | ゲート条件 |
|-----------|-----------|-----------|
| `minimal` | Core のみ | logical_design.md の存在 |
| `standard` | Core + 一部 AIDLC | logical_design + domain_model |
| `full` | 全スキル | 現状と同等（全ドキュメント） |
| `custom` | 任意 | ユーザー定義 |

---

## 6. パッケージ構造の変更

### 現状

```
skills/
├── cascade-updater/SKILL.md
├── codebase-mapper/SKILL.md
├── ...（28スキル全てフラット）
└── README.md
```

### 提案

```
skills/
├── core/
│   ├── cascade-updater/SKILL.md
│   ├── codebase-mapper/SKILL.md
│   ├── consistency-checker/SKILL.md
│   ├── doc-freshness-checker/SKILL.md
│   ├── engineering-perspective/SKILL.md
│   ├── implementation-readiness-checker/SKILL.md
│   ├── pointer-validator/SKILL.md
│   └── test-coverage-checker/SKILL.md
├── aidlc/
│   ├── product-architect/SKILL.md
│   ├── story-writer/SKILL.md
│   ├── ...（18スキル）
│   └── quick-implementor/SKILL.md
└── utility/
    ├── skill-creator/SKILL.md
    └── codex-delegator/SKILL.md
```

**影響範囲:**
- `skill-deployer.ts` のスキル列挙ロジック
- `skills list` コマンドの出力（カテゴリ表示対応）
- `package.json` の `files` フィールド（変更不要: `skills/**` で全カバー）

---

## 7. マイルストーン

| Phase | 目標バージョン | スコープ |
|-------|-------------|---------|
| 1 | v1.0.0 | skills ディレクトリを core/aidlc/utility に再構成 |
| 2 | v1.0.0 | `init --skills core\|all` オプション追加 |
| 3 | v1.0.0 | `skills list` にカテゴリ表示追加 |
| 4 | v1.1.0 | カスタムゲートとスキルセットの完全分離 |

---

## 8. 未決事項

- [ ] `implementation-readiness-checker` は Core か AIDLC か — 現在は AIDLC スキル（story-implementor）の前提条件チェッカーだが、汎用的なゲートキーパーとしても機能する
- [ ] `quick-implementor` / `story-implementor` は Core か AIDLC か — ゲート強制の実行者だが、ワークフロー定義でもある
- [ ] 既存ユーザー（phasegate 自身）の移行パス — skills/ のディレクトリ構造変更に伴う `update-skills` の動作
- [ ] AIDLC スキルを完全に使わないチーム向けの README / Quick Start の書き分け

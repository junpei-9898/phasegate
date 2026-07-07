# レビュー次元詳細

レビューは2段階で実行する。Tier 1（機械的チェック）でBLOCKが出たらTier 2に進まず即REJECT。

---

## Tier割り当て概要

| Tier | 実行主体 | 目的 | 入力 |
|------|---------|------|------|
| Tier 1 | Claude Code（grep/スクリプト） | 機械的に判定できる項目を高速処理 | `git diff`, ファイル一覧 |
| Tier 2 | Sonnet（Agent tool経由） | 設計文書との意味的な突合 | diff + Tier 1結果 + 設計文書抜粋 |

---

## Tier 1: 機械的チェック（全タスクタイプ共通）

grep・diff・テスト実行で自動検証する。判断不要。

| ID | 次元 | 検証方法 | 重大度 |
|----|------|---------|--------|
| C1 | スコープ遵守 | `git diff --name-only` と指示ファイルリストの差分比較 | BLOCK |
| C2 | 既存破壊なし | プロジェクトのテストコマンド（`npm test` 等、pnpm/yarn は例）実行（既存テスト全パス確認） | BLOCK |
| C3 | 命名一貫性 | grep: 日本語テスト名、`actual`変数、target/context/describe/it構造 | BLOCK |

### Tier 1: タスクタイプ別追加

#### implementation / test 共通

| ID | 次元 | 検証方法 | 重大度 |
|----|------|---------|--------|
| IM3 | レイヤー違反なし | grep: domain層ファイルからinfrastructure層へのimport検出 | BLOCK |
| IM4 | 型安全性 | grep: 正当理由なき `any` / `as` の使用検出 | WARN |

#### test

| ID | 次元 | 検証方法 | 重大度 |
|----|------|---------|--------|
| TE1 | ケースID突合 | 設計文書のケースIDリスト vs テストファイル内のID（機械的マッチング） | BLOCK |
| TE4 | モック方針 | grep: domain層エンティティに対するmock/spy使用の検出 | BLOCK |

#### design-plan / design-doc

| ID | 次元 | 検証方法 | 重大度 |
|----|------|---------|--------|
| DP3 | 配置ルール準拠 | `git diff --name-only` と folder_management_rules.md のパス照合 | BLOCK |

### Tier 1 判定

```
BLOCK が1つでもFAIL → REJECT（Tier 2スキップ）→ Step Cへ
全PASS or WARNのみ  → Tier 2へ進む
```

---

## Tier 2: Sonnetによる設計突合チェック

### 入力（これだけ渡す）

1. `git diff HEAD~1` の出力（変更差分のみ）
2. Tier 1の結果サマリ（PASS/WARN一覧）
3. 設計文書の**該当箇所の抜粋**（全文ではなく、対象ストーリー/Unitの該当セクション）

### design-plan（inception文書）

| ID | 次元 | 検証内容 | PASS条件 | 重大度 |
|----|------|---------|----------|--------|
| DP1 | 上位文書整合 | 上位レイヤー文書の用語・スコープと矛盾がないか | 上位文書に存在しない概念の未説明導入が0件 | BLOCK |
| DP2 | QAセクション | 推測で決定した箇所が`[Question]`として記載されているか | 暗黙の前提が0件 | WARN |

### design-doc（domain_model, logical_design, test_design等）

| ID | 次元 | 検証内容 | PASS条件 | 重大度 |
|----|------|---------|----------|--------|
| DD1 | 計画との整合 | 対応するinception計画の方針と矛盾がないか | 計画スコープからの逸脱が0件 | BLOCK |
| DD2 | アーキテクチャ原則 | ヘキサゴナル、DDD、レイヤー依存方向に違反がないか | domain→port→usecase→controllerの方向違反が0件 | BLOCK |
| DD3 | トレーサビリティ | 各設計要素がストーリーまたはUnit要件に紐づいているか | 紐づけ不明の要素が0件 | WARN |
| DD4 | YAGNI | 指示範囲外の設計要素が追加されていないか | 未要求の追加要素が0件 | BLOCK |

### implementation（コード実装）

| ID | 次元 | 検証内容 | PASS条件 | 重大度 |
|----|------|---------|----------|--------|
| C4 | 完了度 | 指示項目の欠落がないか | 未実装の指示項目が0件 | BLOCK |
| IM2 | テストケース網羅 | テスト設計のケースIDが全て実装されているか | 未実装ケースが0件 | BLOCK |
| IM-Y | YAGNI | 指示範囲外の「改善」「リファクタ」「将来への備え」がないか | 未要求の追加が0件 | BLOCK |
| IM5 | DRY | 既存コードとの重複がないか | 明確な重複が0件 | WARN |

### test（テストコード）

| ID | 次元 | 検証内容 | PASS条件 | 重大度 |
|----|------|---------|----------|--------|
| C4 | 完了度 | 指示項目の欠落がないか | 未実装の指示項目が0件 | BLOCK |
| TE2 | 期待値突合 | Assertionの期待値が設計文書の期待結果と一致するか | 不一致が0件 | BLOCK |
| TE3 | テスト独立性 | テスト間に実行順序依存がないか | 共有状態への書き込みが0件 | WARN |

### Tier 2 判定

```
BLOCK が1つでもFAIL → REJECT → Step Cへ
WARN のみ FAIL      → CONDITIONAL_PASS（WARNをまとめて修正）
全 PASS              → PASS（完了）
```

---

## Opusへのエスカレーション

通常のレビューフローではOpusを使用しない。以下の場合にのみ人間の判断でOpusに切り替える:

- 設計文書自体の妥当性を疑う必要がある場合
- アーキテクチャの根本的な判断が必要な場合
- Sonnetのレビュー結果に人間が違和感を覚えた場合

Opusへのエスカレーションは `kimunii-perspective` スキルを使用する。

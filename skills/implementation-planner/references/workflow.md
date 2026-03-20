# 実装計画ワークフロー

## フェーズ1: 要件理解

### Step 1.1: 入力の整理
ユーザー入力から以下を抽出:
- 実装対象（ストーリーID、機能名、タスク説明）
- 優先度・制約条件

### Step 1.2: ストーリー確認
ユーザーストーリーが指定されている場合:
```bash
# US-XXXの場合、以下のファイルを検索
grep -r "US-XXX" docs/product/units/
```

---

## フェーズ2: Unit特定

### Step 2.1: integration_contract.md確認
```
Read: docs/product/units/integration_contract.md
```
以下を把握:
- 関連しそうなUnit
- そのUnitの公開API
- 依存関係

### Step 2.2: 関連Unit仕様確認
```
Read: docs/product/units/{unit}_unit.md
```
各Unitファイルから:
- 担当ユーザーストーリー
- 機能要件
- 外部依存

### Step 2.3: Unit間依存の整理
Mermaid図を参照し、以下を特定:
- データの流れ
- イベント発行先
- 参照関係

---

## フェーズ3: ドメインモデル確認

### Step 3.1: プライマリコンテキスト確認
```
Read: docs/product/construction/{context}/domain_model.md
```
以下を把握:
- 集約とその責務
- エンティティ・値オブジェクト
- ドメインイベント
- 状態遷移

### Step 3.2: 関連コンテキスト確認
依存先のdomain_model.mdを確認:
- 共有カーネルの定義
- 参照するエンティティ

### Step 3.3: 設計パターン確認
```
Read: docs/product/construction/shared_kernel/domain_model.md
```
共通で使用する型・パターンを把握

---

## フェーズ4: 既存実装確認

### Step 4.1: ディレクトリ構造確認
```bash
ls -la functions/src/model/{context}/
ls -la functions/src/usecase/{context}/
ls -la functions/src/controller/{context}/
```

### Step 4.2: 関連コード検索
```bash
# 関連するクラス・関数を検索
grep -r "ClassName" functions/src/
grep -r "usecaseName" functions/src/
```

### Step 4.3: 既存パターン把握
同コンテキストの既存実装からパターンを学習:
- Model定義方法
- UseCase構造
- Controller実装
- Repository実装

---

## フェーズ5: 計画作成

### Step 5.1: API設計
integration_contract.mdを参照し:
- 新規APIか既存APIの拡張か判断
- エンドポイント設計
- リクエスト/レスポンス設計

### Step 5.2: レイヤー別実装内容決定
Clean Architectureに従い:
1. Model層: ドメインモデル実装
2. UseCase層: ビジネスロジック
3. Port層: インターフェース定義
4. Controller層: API実装
5. Repository層: データアクセス

### Step 5.3: 実装ステップ分解
依存関係を考慮して順序付け:
1. ドメインモデル（依存なし）
2. Port定義
3. UseCase実装
4. Repository実装
5. Controller実装
6. テスト

### Step 5.4: 影響範囲特定
- 既存コードの変更箇所
- DBマイグレーション要否
- フロントエンド変更要否

---

## フェーズ6: 出力と確認

### Step 6.1: 計画ファイル出力
`references/plan-template.md`の形式で出力

### Step 6.2: 質問整理
不明点を[Question][Answer]セクションにまとめ

### Step 6.3: ユーザー確認
計画をユーザーに提示し、フィードバックを収集

---

## 探索パターン

### パターン1: ストーリーID指定
```
1. grep "US-XXX" docs/product/units/*.md
2. 該当Unit特定
3. domain_model確認
4. 既存コード確認
```

### パターン2: 機能名指定
```
1. integration_contract.mdのAPI定義検索
2. 関連Unit特定
3. 以降同様
```

### パターン3: 技術タスク指定
```
1. constructionディレクトリから関連コンテキスト特定
2. Unit仕様確認
3. 既存コード確認
```

# ドキュメント構造リファレンス

## Units ドキュメント (`docs/product/units/`)

各Unitは境界づけられたコンテキストを表す。

| ファイル | 内容 |
|----------|------|
| `integration_contract.md` | Unit間連携API定義・技術スタック・依存関係図 |
| `{unit}_unit.md` | ユーザーストーリー・機能要件・外部依存 |

### integration_contract.md の構造

```
- 技術スタック概要（Auth/Gateway/API Server/DB/Worker/UI/Realtime）
- ユニット間依存関係図（Mermaid）
- 公開APIエンドポイント定義（各Unit）
- 共通データフォーマット
- 認証・認可
```

### Unit一覧

| Unit | 責務 |
|------|------|
| IAM Unit | 認証・JWT発行・ユーザー情報 |
| Admin Unit | ユーザー・チーム管理・権限付与 |
| Client Unit | クライアント（BPO委託元企業）管理 |
| Knowledge Unit | クライアントごとの業務ナレッジ管理 |
| Partner Master Unit | 取引先マスタ管理 |
| Workflow Dashboard Unit | プロセス一覧・状態管理 |
| Estimate Unit | 見積書作成プロセス管理（コアドメイン） |
| Audit Unit | 監査ログ記録・閲覧 |

---

## ドメインモデル (`docs/product/construction/`)

各境界づけられたコンテキストのドメイン設計。

### ディレクトリ構成

```
docs/product/construction/
├── {context}/domain_model.md    # 各コンテキストのドメインモデル
├── shared_kernel/domain_model.md # 共有カーネル
├── architecture_image.md         # アーキテクチャ図
└── flow_image.md                 # フロー図
```

### domain_model.md の構造

```
1. コンテキスト概要
   - 境界づけられたコンテキスト
   - ユビキタス言語
   - コンテキストマップ

2. 集約 (Aggregates)
   - 集約ルート定義
   - 不変条件
   - 状態遷移図

3. エンティティ (Entities)

4. 値オブジェクト (Value Objects)

5. ドメインイベント (Domain Events)

6. ポリシー (Policies)

7. リポジトリ (Repositories)

8. ドメインサービス (Domain Services)

9. クラス図（Mermaid）

10. イベントソーシング実装（該当する場合）
```

---

## コードベース構成

### functions/ (API Server - Cloud Run)

```
functions/
├── src/
│   ├── model/           # ドメインモデル層
│   ├── usecase/         # ユースケース層
│   ├── port/            # ポートインターフェース
│   ├── controller/      # コントローラー層
│   ├── gateway/         # 外部通信ゲートウェイ
│   └── infrastructure/  # インフラ層
└── tests/               # テスト
```

### hosting/ (Frontend - React)

```
hosting/
├── src/
│   ├── pages/           # ページコンポーネント
│   ├── components/      # 共通コンポーネント
│   ├── hooks/           # カスタムフック
│   └── api/             # API通信
└── tests/               # テスト
```

### supabase/ (Edge Functions)

```
supabase/
└── functions/           # Edge Functions
```

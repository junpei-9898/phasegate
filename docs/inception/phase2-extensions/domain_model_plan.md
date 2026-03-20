# ドメインモデル設計計画: phase2-extensions

## 1. スコープ
- **対象Unit**: phase2-extensions（HF2-01〜HF2-03）
- **担当ストーリー**: doc-freshness-checker / pointer-validator / E2Eテスト戦略テンプレート
- **他Unitとの境界**: harness-error（HarnessError読取専用）、config-foundation（HarnessConfigV2読取専用）

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞一覧
| 業務名詞 | 抽出元ストーリー | 分類候補 |
|---------|----------------|---------|
| DocFreshnessRule | HF2-01 | 集約ルート |
| PointerRule | HF2-02 | 集約ルート |
| FreshnessThreshold | HF2-01 | 値オブジェクト |
| DocumentAge | HF2-01 | 値オブジェクト |
| Pointer | HF2-02 | 値オブジェクト |
| PointerValidationResult | HF2-02 | 値オブジェクト |
| E2EStrategyTemplate | HF2-03 | 値オブジェクト |
| FreshnessCheckService | HF2-01 | ドメインサービス |
| PointerResolutionService | HF2-02 | ドメインサービス |

### 集約候補とその根拠
1. **DocFreshnessRule（集約ルート）**: documentPattern×FreshnessThresholdの複合整合性（warn < error）を保証。HarnessConfigV2から都度ロード
2. **PointerRule（集約ルート）**: documentPattern×PointerType制限×failOnBrokenの整合性管理。拡張時（URLチェック追加）にも自然に収容可能

## 3. 設計方針
- **集約の粒度**: 2集約（DocFreshnessRule/PointerRule）。E2EStrategyTemplateは状態遷移なし・単体で完結→VOとして十分
- **VO vs エンティティ判断基準**: FreshnessThreshold/DocumentAge/Pointer等は不変・値等価性あり→VO。状態遷移・ライフサイクルなし
- **Shared Kernelとの関係**: HarnessError/HarnessConfigV2を読取専用で消費
- **Git log優先/mtimeフォールバック**: DocumentAgePortがインフラ層で吸収

## 4. 既存ドメインモデルの品質評価と補完方針

### 既存doc（agent作成）の評価
- Ownership/Import-Export: ✅ 完備
- Aggregate Boundary分析: ✅ 根拠明確
- Model Classification: ✅ 完備
- Port Interfaces: ✅ 5ポート定義済み
- Domain Rules/Invariants: ✅ INV-1〜12定義済み
- Data Flow: ✅ 全ストーリーのフロー記述あり
- 設計判断記録: ✅ D1〜D5
- engineering-perspective評価: ✅ SOLID/スメルチェック済み

### 補完が必要な項目
1. **ドメインイベント定義**: 未定義 → Phase 2で追加
2. **Mermaidクラス図**: 未作成 → Phase 2で追加

## 5. QA（不明点・確認事項）

なし（Unit定義から十分な情報が得られている）

## 6. 前提条件・リスク
- URLチェックはPhase 2スコープ外（PointerType='url'は抽出のみ）
- Git log実行失敗時のmtimeフォールバックが正しく動作するかはITテストで検証

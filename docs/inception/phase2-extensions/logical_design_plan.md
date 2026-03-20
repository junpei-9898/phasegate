# 論理設計計画: phase2-extensions

## 1. スコープ
- 対象ドメインモデル: `docs/product/construction/phase2-extensions/domain_model.md`
- 対象ストーリー: HF2-01〜HF2-03
- 設計モード: Unit横断設計

## 2. 既存論理設計の品質評価

### 評価結果
- アーキテクチャ概要（4層構成・依存方向）: ✅ 完備
- Domain層設計（集約・VO・サービス・ポート）: ✅ 詳細
- Application層設計（3 UseCase + DTO定義）: ✅ 完備
- Infrastructure層設計（5 Adapter）: ✅ 完備
- Presentation層設計（3 Handler + Formatter）: ✅ 完備
- ストーリー別フロー設計: ✅ HF2-01〜HF2-03全てカバー

### 要修正項目
1. **ディレクトリ構成のファイル名がPascalCase** → kebab-caseに修正が必要
   - `DocFreshnessRule.ts` → `doc-freshness-rule.ts`
   - `FreshnessThreshold.ts` → `freshness-threshold.ts`
   - 他全ファイル同様

## 3. QA
なし

## 4. 前提条件・リスク
- domain_model.md のドメインイベント/クラス図追加と整合性を確認済み
- 実装は既にkebab-caseで行われているため、設計文書側の修正のみ

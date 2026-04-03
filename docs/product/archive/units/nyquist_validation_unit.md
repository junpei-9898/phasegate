# Unit定義: nyquist-validation

> **Unit ID**: nyquist-validation
> **作成日**: 2026-03-10
> **Wave**: 2（コア品質機構）
> **対応Epic**: E-02 Nyquist検証層

---

## 1. 概要

要件（AC）とテストケースの双方向トレーサビリティを保証するNyquist検証層を構築するUnit。requirement-test-matrix.jsonの定義、phase-gateへのACマッピング完了チェック追加、要件カバレッジ算出、影響分析コマンド、VALIDATION.md自動生成を実現する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| US-005 | requirement-test-matrix.jsonの新設 | Must |
| US-006 | phase-gateへのACマッピング完了チェック追加 | Must |
| US-007 | test-coverage-checkerでの要件カバレッジ算出 | Must |
| US-008 | phasegate:impact-analysisコマンドの新設 | Should |
| US-009 | VALIDATION.mdの自動生成 | Should |

---

## 3. 機能要件

### 3.1 requirement-test-matrix.json

- JSONスキーマ定義: User Story ID / AC ID / テストケースファイルパス / テスト種別（unit/it/scenario）
- 配置先: `docs/product/construction/{unit}/requirement-test-matrix.json`
- スキーマバリデーション

### 3.2 phase-gate ACマッピングチェック

- phase-gate.tsのcheckImplementationReadiness()にACマッピング完了チェック追加
- 未マッピングAC存在時のphase-gate失敗
- HarnessErrorに未マッピングAC一覧を含める

### 3.3 要件カバレッジ算出

- AC網羅率（マッピング済みAC数 / 全AC数）の算出
- 未カバーAC一覧のレポート出力
- コードカバレッジ（90%閾値）と要件カバレッジの併記

### 3.4 impact-analysis（Should）

- `phasegate:impact-analysis US-XXX`コマンド
- User Storyに紐づくテストケース一覧出力
- テスト種別（unit/it/scenario）の表示

### 3.5 VALIDATION.md自動生成（Should）

- `docs/inception/{unit}/{US}/validation.md`に自動生成
- マッピング状態・AC網羅率・テスト通過状態のサマリー

---

## 4. データモデル概要

- **requirement-test-matrix.json**: `{ "stories": [{ "storyId": string, "acs": [{ "acId": string, "tests": [{ "file": string, "type": "unit"|"it"|"scenario" }] }] }] }`
- **VALIDATION.md**: マッピング状態のMarkdownレポート

---

## 5. 外部依存

| 依存先 | 種別 | 内容 |
|--------|------|------|
| 既存phase-gate.ts | 拡張 | checkImplementationReadiness()にACマッピングチェックを追加（既存コードへの拡張であり、他v1 Unitへの依存はなし。Wave 2として独立着手可能） |

---

## 6. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| データ | requirement-test-matrix.json | skill-enhancement（test-coverage-checker Nyquist統合、Plan-Checker Loop） |
| CLI | `phasegate:impact-analysis` | 外部利用者 |
| バリデータ | phase-gate ACマッピングチェック | 全Unit（L2 Pre-commit） |

# Unit定義: regression-suite

> **Unit ID**: regression-suite
> **作成日**: 2026-03-10
> **Wave**: 4（高度機能 — Phase A: E-09回帰テスト設計、Phase B: E-14 v0テスト移行）
> **対応Epic**: E-09 非交渉要件K1-K13回帰保証 + E-14 v0テスト資産移行

---

## 1. 概要

v0で確立した品質基準（K1-K13非交渉要件）のv1回帰テスト整備と、v0の143テスト仕様のv1再実装・CIゲート化を担うUnit。Phasegate v1の品質基盤が継続的に維持されることを自動保証する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 | 元Epic |
|----------|---------|--------|--------|
| US-031 | 5層防御・Phase Gate・Biome AST・テスト品質の回帰テスト整備 | Must | E-09 |
| US-032 | スキル・2-Phase・Document Split・Cascade・Agent-Lessonの維持保証 | Must | E-09 |
| US-033 | Security/Performance・Drift Detection・Consistency・config単一原則の維持保証 | Must | E-09 |
| US-048 | v0の143テスト仕様のv1再実装 | Must | E-14 |
| US-049 | v1再実装テストのCIゲート化 | Must | E-14 |
| US-055 | Go/No-Go Gate 8条件の回帰テスト整備 | Must | E-09 |

---

## 3. 機能要件

### 3.1 K1-K13回帰テスト（E-09由来）

**US-031: 5層防御・Phase Gate・Biome AST・テスト品質**
- L0-L4各レイヤーバリデータ正常動作の回帰テスト
- phase-gate.ts checkImplementationReadiness()の回帰テスト
- Biome AST解析（importグラフ+循環依存検出）の回帰テスト
- テスト品質ルール（AAA/actual/single-act/no-domain-mocking）の回帰テスト

**US-032: スキル・2-Phase・Document Split・Cascade・Agent-Lesson**
- 全スキルSKILL.md構造検証テスト
- 2-Phase Executionフロー検証テスト
- inception/product分離（Document Split）検証テスト
- Cascade Updater回帰テスト
- Agent-Lesson System回帰テスト

**US-033: Security/Performance・Drift・Consistency・config**
- Security検出（ハードコード秘密、SQLインジェクション）回帰テスト
- Performance検出（ループ内await、N+1、bundleSizeLimit）回帰テスト
- Drift Detection（設計-実装乖離双方向検出）回帰テスト
- Consistency Checker回帰テスト
- phasegate.config.json単一原則検証テスト

**US-055: Go/No-Go Gate 8条件回帰テスト**
- GNG-1: npmパッケージ非依存（package.jsonにGSD関連パッケージなし）
- GNG-2: `.planning/`不使用（ディレクトリ非存在）
- GNG-3: 設定ファイル統一（GSD由来設定がphasegate.config.json内）
- GNG-4: yolo/skip-permissions不採用（deny list+hooks完全維持）
- GNG-5: 2-Phase Execution維持（設計スキルの人間承認ゲート存在）
- GNG-6: プロジェクトローカル実行（`~/.claude/`へのグローバル書き込みなし）
- GNG-7: 既存コマンド体系尊重（`/gsd:*`コマンド非露出）
- GNG-8: デフォルトOFF（GSD由来機能のデフォルト値がfalse/disabled）
- 全8条件のCIゲート組み込み

### 3.2 v0テスト資産移行（E-14由来）

**US-048: v0テスト仕様v1再実装**
- v0テスト仕様の分析・移行対象リスト作成
- v1コードベースでの再実装
- Biome移行に伴う修正
- v0-v1テスト対応表作成

**US-049: CIゲート化**
- CIパイプラインにv1再実装テスト全件実行ステップ追加
- テスト失敗時のCI失敗
- テストカバレッジ90%閾値適用

---

## 4. データモデル概要

- **回帰テストスイート**: テストファイル群（vitest/jest）
- **v0-v1テスト対応表**: ドキュメント（移行追跡用）
- **CIワークフロー**: `.github/workflows/` 内のテスト実行ステップ

---

## 5. 外部依存

| 依存先 | 種別 | 内容 |
|--------|------|------|
| biome-toolchain | 基盤 | Biome移行完了後にv0テスト仕様の再実装が可能（E-14はE-11依存） |

---

## 6. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| テストスイート | K1-K13回帰テスト群 | CI/CD（自動実行） |
| テストスイート | v0再実装テスト群 | CI/CD（自動実行） |
| ドキュメント | v0-v1テスト対応表 | 外部利用者（品質管理者） |

---

## 7. 実装フェーズ分け

本Unitは内部で2フェーズに分ける：

1. **Phase A（E-09: 回帰テスト整備）**: biome-toolchain完了を待たず設計・一部実装可能。K要件の回帰テスト仕様を策定し、既存機構のテストを作成
2. **Phase B（E-14: v0テスト移行）**: biome-toolchain完了後に着手。v0の143テスト仕様をv1で再実装し、CIゲート化

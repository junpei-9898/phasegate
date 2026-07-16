# Unit定義: phase2-extensions

@story-id HF2-01
@story-id HF2-04
設計要素: phase2-extensions Unit definition.
> **Phase**: Future（v1スコープ外）

> **Unit ID**: phase2-extensions
> **作成日**: 2026-03-12
> **Wave**: Future Phase
> **対応Epic**: H-F2 Phase 2拡張

---

## 1. 概要

v1完了後のPhase 2で追加するL4拡張バリデータおよびE2Eテスト戦略テンプレートを集約するUnit。doc-freshness-checker（設計文書鮮度検証）、pointer-validator（ドキュメント・AGENTS.md内ポインタ実在検証）をL4拡張バリデータとして提供し、Playwright統合のE2Eテスト戦略テンプレートを整備する。

いずれもv1のvalidator-system（L4拡張インターフェース）およびharness-api（CLIコマンド拡張ポイント）のExtension Pointを利用して統合する。v1スコープでは設計文書の鮮度やポインタ検証はスコープ外であるが、本Unitの将来的な追加を見据えてv1側のExtension Pointを確保する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| HF2-01 | doc-freshness-checker（L4拡張） | Should |
| HF2-02 | pointer-validator（L4拡張） | Should |
| HF2-03 | E2Eテスト戦略テンプレート（Playwright統合） | Should |

---

## 3. 機能要件

### 3.1 doc-freshness-checker（HF2-01）

- 設計文書の最終更新日からの経過日数を検出するL4バリデータ
- 閾値（日数）とコミット数閾値が `phase2Extensions.initialCreationExpirationRules` で設定可能。`p2:check-initial-creation` は public compatibility command としてこの設定を参照する。<!-- @work-item-id WI-170 -->
- 閾値超過時のHarnessErrorにadr_ref + 推奨アクション（文書レビュー・更新の推奨）を含む
- validator-systemのL4バリデータ拡張インターフェースを使用して登録

### 3.2 pointer-validator（HF2-02）

- ドキュメント内のファイルパス参照が実在することを検証するL4バリデータ
- AGENTS.md内のコマンドポインタ（CLIコマンド名・スクリプトパス等）が有効であることを検証
- 検出されたリンク切れの一覧をレポート（HarnessError形式）に出力
- validator-systemのL4バリデータ拡張インターフェースを使用して登録

### 3.3 E2Eテスト戦略テンプレート（HF2-03）

- Playwright統合のE2Eテスト戦略テンプレートの作成
- テンプレートにシードデータ管理・セレクタ戦略・ページオブジェクトパターンを含む
- scenario-test-logic-designerスキルとの連携方法のドキュメント化
- harness-apiのCLIコマンド拡張ポイントを使用してE2Eテスト実行コマンドを登録

---

## 4. ドメインモデル概要

- **DocFreshnessRule（集約ルート）**: 設計文書の鮮度検証ルール。対象ファイルパターン・閾値日数・関連ADR参照を保持
- **FreshnessThreshold（値オブジェクト）**: 鮮度閾値（日数）。phasegate.config.jsonから読み込み
- **DocumentAge（値オブジェクト）**: 設計文書の最終更新日からの経過日数。Git履歴またはファイルメタデータから算出
- **PointerRule（集約ルート）**: ポインタ検証ルール。検証対象ドキュメントパターン・ポインタ抽出正規表現を保持
- **Pointer（値オブジェクト）**: ドキュメント内のファイルパス参照またはコマンド参照。参照元ファイル・行番号・参照先パスを保持
- **PointerValidationResult（値オブジェクト）**: ポインタ検証結果。有効/無効・無効理由（ファイル不在・コマンド未登録等）
- **E2EStrategyTemplate（値オブジェクト）**: E2Eテスト戦略テンプレートの構造。シードデータ管理方針・セレクタ戦略・ページオブジェクトパターンを定義
- **FreshnessCheckService（ドメインサービス）**: DocFreshnessRuleに基づき対象文書の鮮度を検証し、閾値超過文書のHarnessErrorリストを生成
- **PointerResolutionService（ドメインサービス）**: PointerRuleに基づきドキュメント内のポインタを抽出・解決し、リンク切れを検出

---

## 5. 外部依存

### 5.1 Shared Kernel参照

- **HarnessError型**（harness-errorが定義）: バリデータのエラー出力に使用。adr_ref・fix_example・severity含む
- **HarnessConfigV2型**（config-foundationが定義）: 閾値設定・バリデータ有効/無効設定の参照

### 5.2 v1 Extension Points（統合に必要な拡張ポイント）

本UnitはFuture Phaseであり、v1のCross-Unit Contractを直接消費するのではなく、v1側が確保するExtension Pointを利用して統合する。

| Extension Point | 所有Unit | 本Unitでの利用 | v1側で確保すべき内容 |
|----------------|---------|---------------|---------------------|
| L4バリデータ拡張インターフェース | validator-system | doc-freshness-checker・pointer-validatorをL4バリデータとして登録 | ValidatorRegistryに新規L4バリデータ（L4-004〜）を追加登録できるAPI |
| CLIコマンド拡張ポイント | harness-api | E2Eテスト関連コマンドの追加登録 | CommandRegistryへの新規コマンド登録API |

### 5.3 v1 Cross-Unit Contract（参照のみ）

| 契約 | 役割 | 相手Unit | 内容 |
|------|------|---------|------|
| **ADR Frontmatter Schema** | 消費 | adr-foundation | doc-freshness-checkerのHarnessErrorに含むadr_refの参照形式 |
| **AGENTS.md Schema** | 消費 | ci-governance | pointer-validatorがAGENTS.md内ポインタを検証する際の正構造参照 |
| **phase2Extensions.initialCreationExpirationRules** | 消費 | config-foundation | initial_creation expiration detector の public compatibility 設定。config-foundation が schema contract を所有する。<!-- @work-item-id WI-170 --> |

### 5.4 実装時依存

| 依存先Unit | 依存内容 |
|-----------|---------|
| validator-system | L4バリデータ拡張インターフェース。doc-freshness-checker・pointer-validatorをL4バリデータとして登録・実行 |
| harness-api | CLIコマンド拡張ポイント。E2Eテスト実行コマンドの追加登録 |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|---------------|
| K1 | 4層防御モデル（L1-L4） | doc-freshness-checker・pointer-validatorをL4（consistency/drift）バリデータとして追加。既存の4層構造を拡張 |
| K6 | 2-Phase Execution | doc-freshness-checkerが設計文書の鮮度を検証し、設計-実装間の乖離リスクを事前検出。Phase依存の遵守を間接的に支援 |
| K13 | phasegate.config.json | 閾値設定（鮮度日数等）・バリデータ有効/無効をphasegate.config.json v2で管理 |
| K4 | テスト品質ルール | E2Eテスト戦略テンプレートにより、E2Eテストの設計・実装に一貫した方法論を提供 |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| L4バリデータ | doc-freshness-checker（設計文書鮮度検証） | validator-system経由で全体実行 |
| L4バリデータ | pointer-validator（ポインタ実在検証） | validator-system経由で全体実行 |
| テンプレート | E2Eテスト戦略テンプレート（Playwright統合） | 外部利用者（scenario-test-logic-designerスキル経由） |

---

## 8. 実装上の制約・注意事項

- **Future Phaseの位置づけ**: 本Unitはv1スコープ外であり、詳細なconstruction-level設計（US単位の詳細設計・実装計画）は作成しない。Unit定義とExtension Point契約までをスコープとする
- **v1 Extension Pointへの依存**: 実装開始前に、validator-system（L4バリデータ拡張インターフェース）およびharness-api（CLIコマンド拡張ポイント）の各Extension Pointがv1で確定・安定していることが前提
- **doc-freshness-checkerの鮮度算出**: Git履歴（`git log --format=%ai`）を優先し、Git未管理ファイルはファイルメタデータ（mtime）にフォールバック。算出方法の選択はインフラ層に閉じ込める
- **pointer-validatorのスコープ**: Phase 2初期はファイルパス参照の実在検証に限定。URLの到達性検証（HTTP HEAD）は将来の拡張オプションとして扱う
- **E2EテンプレートとPlaywright**: Playwrightの具体的なバージョン・設定はPhase 2開始時の最新安定版に合わせる。テンプレートはフレームワーク非依存の戦略層と、Playwright固有の実装層を分離して設計する
- **ci-governanceとの連携**: pointer-validatorはAGENTS.md内のポインタも検証対象とするため、ci-governance（AGENTS.mdポインタ型移行）との連携が必要。v1でci-governanceがAGENTS.mdの構造を確定した後に、pointer-validatorの検証ルールを策定する

---

## 9. Corpus 履歴

- 2026-05-07: WI-035 で Phase Gate self-hosting の kebab-case path 解決用 entry を追加した。
- 2026-07-16: WI-285 で HF2-04 traceability を含む詳細定義を canonical path へ統合し、単一正本化した。

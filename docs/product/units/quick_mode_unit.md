# Unit定義: quick-mode

> **Unit ID**: quick-mode
> **作成日**: 2026-03-12
> **Wave**: 2（コア品質機構）
> **対応Epic**: H-10 Quick Mode

---

## 1. 概要

Quick Modeの設定定義・判定エンジン・バリデータ緩和実行・quick-implementorスキルを提供するUnit。軽微な変更（バグ修正、ドキュメント修正、テスト追加、設定変更）に対してGated Velocityの原則に基づき品質ゲートを最小限に絞り、速度を最大化する。

v0ではquick_modeセクション定義とquick-checkコマンドが中心だったが、v1では判定エンジン（H10-02）を新設し、Quick Mode適用条件を厳格に定義することで「これもQuickでいいのでは」という適用範囲拡大圧力への防波堤を構築する。また、バリデータ緩和実行の仕様をL1全維持/L2選択/L3 securityのみ/L4スキップとして明確化し、quick-implementorスキルのSKILL.mdを定義する。

---

## 2. 担当ストーリー

| Story ID | タイトル | 優先度 |
|----------|---------|--------|
| H10-01 | Quick Mode設定（harness.config.json quickModeセクション） | Must |
| H10-02 | Quick Mode判定エンジン | Must |
| H10-03 | Quick Modeバリデータ緩和実行 | Must |
| H10-04 | quick-implementor（Quick Mode下のad-hoc実装スキル） | Should |

---

## 3. 機能要件

### 3.1 Quick Mode設定（H10-01）

- harness.config.jsonの`quickMode`セクションで対象条件を定義
- `allowedCategories`で対象カテゴリ（bugfix/docs/test/config）が設定可能
- `maintainedLayers`で維持するレイヤー（デフォルト: L1, L2）が設定可能
- `relaxedGates`で緩和するゲート（デフォルト: phase-gate, 2-phase-execution）が設定可能
- JSONスキーマバリデーションが通過すること

### 3.2 Quick Mode判定エンジン（H10-02）

- 変更対象ファイルからQuick Mode対象/対象外を自動分類するエンジン
- **混在変更拒否**: Quick Mode対象ファイルと対象外ファイルの同時変更を拒否
- **新ドメイン拒否**: `domain/`配下の新規ファイル追加を自動拒否
- **API契約変更拒否**: Port/Adapterインターフェースの変更を自動拒否
- 判定結果にQuick Mode適用可否と根拠を含める
- 境界ケースの自動テストが存在すること

### 3.3 Quick Modeバリデータ緩和実行（H10-03）

- **L1 全維持**: 全8ルール（コア4 + AIアンチパターン4）が実行される（緩和なし）
- **L2 選択実行**: `metadata`、`test-quality`バリデータは維持。`phase-gate`はスキップ
- **L3 securityのみ**: `security`バリデータのみ実行。`performance`/`coverage`/`nyquist`はスキップ
- **L4 全スキップ**: L4バリデータは全てスキップ
- **2-Phase Execution緩和**: Quick Mode対象の軽微変更では不要

### 3.4 quick-implementor SKILL.md（H10-04）

- quick-implementorのSKILL.mdを作成
- Quick Mode判定（H10-02）を前提条件として使用
- バリデータ緩和設定（H10-03）に基づいて品質チェックを実行
- Atomic commitは維持（Quick Modeでもコミット単位は保持）

---

## 4. ドメインモデル概要

- **QuickModeConfig（値オブジェクト）**: allowedCategories / maintainedLayers / relaxedGates の設定値。config-foundationの`HarnessConfigV2.quickMode`セクションから取得
- **ChangeClassification（値オブジェクト）**: 変更ファイル群の分類結果（category: bugfix/docs/test/config/feature/domain/api）
- **QuickModeEligibility（値オブジェクト）**: Quick Mode適用可否判定結果（eligible: boolean, reason: string, rejectionDetails?: string[]）
- **ValidatorRelaxationProfile（値オブジェクト）**: 緩和後のバリデータ実行構成（L1全維持/L2選択/L3 securityのみ/L4スキップ）
- **QuickModeJudgmentEngine（ドメインサービス）**: 変更ファイル群からChangeClassificationを生成し、QuickModeEligibilityを判定する。混在変更拒否・新ドメイン拒否・API契約変更拒否のルールを内包
- **ValidatorRelaxationService（ドメインサービス）**: QuickModeConfigに基づきValidatorRelaxationProfileを生成し、validator-systemに緩和構成を指示

---

## 5. 外部依存

### 5.1 Shared Kernel参照

- **HarnessError型**（harness-errorが定義）: 判定拒否時・バリデータエラー出力に使用
- **HarnessConfigV2型**（config-foundationが定義）: `quickMode`セクションの読み取りに使用

### 5.2 Cross-Unit Contract

| 契約 | 役割 | 相手Unit | 内容 |
|------|------|---------|------|
| **Preset ID Registry** | 消費 | config-foundation | プリセット（minimal/standard/strict）ごとのデフォルトquickMode設定を参照 |
| **Validator ID Registry** | 消費 | validator-system | 緩和対象バリデータIDの参照。L2 phase-gateスキップ、L3選択実行、L4全スキップの指示 |

### 5.3 実装時依存

| 依存先Unit | 依存内容 |
|-----------|---------|
| config-foundation | `quickMode`設定セクションの読み取り |
| validator-system | バリデータの選択実行（緩和構成に基づくバリデータ実行） |

---

## 6. 非交渉要件（K要件）対応

| K# | 要件 | 本Unitでの対応 |
|----|------|---------------|
| K1 | 4層防御モデル（L1-L4） | Quick Mode時もL1は全維持。L2-L4は明示的な緩和ルールで制御し、4層構造自体は維持 |
| K3 | Biome AST解析 | Quick Mode時もL1全8ルール（Biome ASTルール含む）を実行。緩和なし |
| K4 | テスト品質ルール | Quick Mode時もL2 `test-quality`バリデータを維持 |
| K6 | 2-Phase Execution | Quick Mode対象の軽微変更に限り2-Phase Execution緩和。新ドメインモデル・API契約変更は判定エンジンで自動拒否し、フルハーネス（2-Phase Execution必須）にフォールバック |
| K13 | harness.config.json | `quickMode`セクションでQuick Mode設定をharness.config.jsonに集約 |
| K14 | Phase Dependency Model | **非緩和**: Level間依存（Level 2→Level 1、Level 3→Level 2）はQuick Modeでも絶対に緩和不可。Quick Modeが緩和するのはLevel内の一部ゲート（phase-gate, 2-phase-execution）のみ |
| K15 | Plan文書の必須生成 | **非緩和**: Quick Mode対象の軽微変更でもplan文書なしのPhase 2移行は不可。ただしQuick Mode対象変更ではPhase 1/2構造自体が不要なため、この制約はフォールバック時にのみ適用される |

---

## 7. 公開インターフェース

| 種別 | 名称 | 利用Unit |
|------|------|---------|
| ロジック | QuickModeJudgmentEngine（対象/対象外自動分類 + 適用可否判定） | validator-system（バリデータ緩和実行時に内部参照）、skill-quality（quick-implementor前提チェック） |
| DTO | QuickModeDecision（判定結果: eligible + reason + rejectionDetails + relaxationProfile） | validator-system、harness-api（ステータス表示用） |
| ロジック | ValidatorRelaxationProfile（緩和後バリデータ構成） | validator-system（緩和構成に基づくバリデータ実行） |
| SKILL.md | quick-implementor（Quick Mode下のad-hoc実装スキル） | 外部利用者（オーケストレーターの`/gsdlc:quick`コマンド経由） |

---

## 8. 実装上の制約・注意事項

- **v0との差異**: v0のUS-012（`harness:quick-check`コマンド）はv1ではharness-apiが所有するCLIコマンドとして再定義。本Unitはコマンド仕様を所有しない（判定エンジンとバリデータ緩和ロジックのみ提供）
- **判定エンジンの厳格性**: Quick Mode適用条件の緩和は許可しない設計。新規カテゴリの追加は`allowedCategories`への明示的追加が必要であり、デフォルトは拒否方向
- **混在変更の検出精度**: ファイルパスベースの分類に加え、変更内容（diff）の解析が必要。`domain/`配下の新規ファイル検出はファイルシステム操作で判定
- **validator-systemとの連携**: 緩和構成はValidatorRelaxationProfileとして渡し、validator-system側で実行制御する。quick-mode側がバリデータを直接実行しない
- **Atomic commit維持**: Quick Modeであってもコミット単位の品質保持は必須。story-implementorと同等のAtomic commitルールを適用

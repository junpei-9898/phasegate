# ドメインモデル設計計画: quick-mode

> **作成日**: 2026-03-17
> **ステータス**: Phase 1（計画）— 承認待ち
> **対象Unit**: quick-mode（H-10 Quick Mode）
> **担当ストーリー**: H10-01〜H10-04

---

## 1. スコープ

- **対象Unit**: quick-mode
- **担当ストーリー**:
  - H10-01: Quick Mode設定（harness.config.json quickModeセクション）
  - H10-02: Quick Mode判定エンジン
  - H10-03: Quick Modeバリデータ緩和実行
  - H10-04: quick-implementor SKILL.md
- **他Unitとの境界**:
  - config-foundation: HarnessConfigV2.quickModeセクションからQuickModeConfig取得
  - validator-system: ValidatorRelaxationProfileをvalidator-systemに渡し、緩和構成に基づくバリデータ実行を委譲
  - harness-api: `QuickModeDecision`（判定結果DTO）をharness-apiのstatusコマンド表示用に公開
  - harness-error: 判定拒否時・バリデータエラーにHarnessError型を使用
  - skill-quality: quick-implementorスキルの前提チェックにQuickModeJudgmentEngineを参照

---

## 2. 集約候補の分析

### ストーリーから抽出した業務名詞

| 名詞 | 出現ストーリー | 分類候補 |
|------|-------------|---------|
| QuickModeConfig | H10-01〜H10-03 | 値オブジェクト（allowedCategories/maintainedLayers/relaxedGates） |
| ChangeClassification | H10-02 | 値オブジェクト（変更ファイル群の分類結果） |
| QuickModeEligibility | H10-02 | 値オブジェクト（適用可否判定結果 + 理由 + 拒否詳細） |
| ValidatorRelaxationProfile | H10-03 | 値オブジェクト（緩和後バリデータ実行構成） |
| ChangedFile | H10-02 | 値オブジェクト（変更ファイルのパス + 変更種別） |
| ChangeCategory | H10-02 | 値オブジェクト（bugfix/docs/test/config/feature/domain/api） |
| QuickModeDecision | H10-02, H10-03 | 値オブジェクト（判定結果 + 緩和プロファイルの複合DTO） |
| QuickModeJudgmentEngine | H10-02 | ドメインサービス（変更→ChangeClassification→QuickModeEligibility） |
| ValidatorRelaxationService | H10-03 | ドメインサービス（QuickModeConfig→ValidatorRelaxationProfile） |

### 集約の評価: 集約なし

横断契約§6の再評価方針に照らして、quick-modeは集約を必要としない。

**集約なしの根拠**:
- quick-modeのドメインは「変更ファイル群を分類し、適用可否を判定し、緩和プロファイルを生成する」ステートレスな判定エンジン
- 永続化が不要。入力（変更ファイル群 + HarnessConfigV2）→出力（QuickModeDecision）の純粋な計算処理
- 状態遷移を持つエンティティが存在しない。QuickModeConfigはHarnessConfigV2から毎回生成される

---

## 3. 設計方針

### 3.1 VO中心・ドメインサービス2つの構成

```
[入力]
  変更ファイル群（ChangedFile[]）
  HarnessConfigV2.quickMode → QuickModeConfig VO

[QuickModeJudgmentEngine]
  ↓
  ChangedFile[] → ChangeClassification VO
  ChangeClassification + QuickModeConfig → QuickModeEligibility VO
  ↓（eligible=trueの場合）

[ValidatorRelaxationService]
  QuickModeConfig → ValidatorRelaxationProfile VO
  ↓
  QuickModeDecision VO（eligible + reason + relaxationProfile）

[出力]
  QuickModeDecision（→ validator-systemに渡す + harness-apiのstatus表示用）
```

### 3.2 QuickModeJudgmentEngineの3拒否ルール

Quick Mode適用可否を判定する3つの自動拒否ルールをドメインサービス内の不変条件として定義する：

1. **混在変更拒否**: ChangedFile[]に Quick Mode対象ファイルと対象外ファイルが混在する場合は拒否
2. **新ドメイン拒否**: `domain/`配下の新規ファイル追加（ChangeKind=CREATE）を含む場合は拒否
3. **API契約変更拒否**: Port/Adapterインターフェースファイルの変更を含む場合は拒否

これらのルールは`QuickModeJudgmentEngine`内にハードコードされ、`allowedCategories`設定で上書きできない。Quick Mode適用条件の緩和圧力への防波堤として機能する（K6対応）。

### 3.3 ValidatorRelaxationProfileの構造

緩和後のバリデータ実行構成を宣言的なVOとして表現する：

```
ValidatorRelaxationProfile {
  l1: { all: true }                    // L1は全維持（緩和なし）
  l2: { maintained: ["L2-002", "L2-003"], skipped: ["L2-001"] }  // phase-gateスキップ
  l3: { maintained: ["L3-001"], skipped: ["L3-002", "L3-003", "L3-004"] }  // securityのみ
  l4: { all: false }                   // L4は全スキップ
  phaseExecution: { twoPhaseRequired: false }  // 2-Phase Execution緩和
}
```

validator-systemはこのProfileを受け取り、バリデータ選択実行の指示として解釈する。quick-mode側がバリデータを直接実行しない設計を維持する。

### 3.4 ChangeClassificationの分類ロジック

`ChangedFile`は`filePath`と`changeKind`（CREATE/MODIFY/DELETE）を持つVO。`ChangeClassification`は`ChangedFile[]`を受け取り、以下の分類を行う：

| ChangeCategory値 | 判定条件 |
|----------------|---------|
| `bugfix` | 既存実装ファイルの修正（domain/以外）|
| `docs` | `docs/`配下のファイル変更 |
| `test` | `__tests__/`配下・`*.test.ts`・`*.spec.ts`の変更 |
| `config` | `*.config.json`・`*.config.ts`・`harness.config.json`の変更 |
| `feature` | 新規実装ファイル追加（domain/・port/以外）|
| `domain` | `domain/`配下のファイル追加・変更 |
| `api` | Port/Adapterインターフェースファイルの変更 |

`ChangeClassification.category`は変更ファイル群全体の**最高リスクカテゴリ**として決定する（複数ファイルの混在がある場合は最もリスクの高いカテゴリを採用）。

### 3.5 K14（Phase Dependency Level間依存）の非緩和保証

`QuickModeJudgmentEngine`は以下を不変条件として保持する：
- Level間の依存（Level 2→Level 1、Level 3→Level 2）はQuick Modeでも**絶対に緩和しない**
- Quick Modeが緩和するのはLevel内の一部ゲート（L2 phase-gate, 2-Phase Execution）のみ
- この不変条件は`ValidatorRelaxationProfile.levelDependencyRelaxed: false`として常にfalseを保証する

---

## 4. QA（設計判断の根拠）

### Q1: ChangedFileのファイルパスはどのPathオブジェクトを使うか

**質問**: ChangedFileのfilePathフィールドに使用するPath型はbiome-ast-engineのFilePath VOと同一型か、quick-mode独自のローカルVOか？

**決定**: 横断契約§4（Shared Kernel最小化）に従い、`FilePath`は各Unit内のローカルVOとする。quick-modeの`ChangedFile.filePath`はstring型またはローカルVO（`WorkspaceRelativePath`）とし、biome-ast-engineのFilePathに依存しない。ファイルパスの意味論（getLayer()等）はquick-modeでは不要なため、単純なstring valueで十分。

### Q2: QuickModeDecisionの設計—QuickModeEligibility + ValidatorRelaxationProfileの分離vs統合

**質問**: QuickModeEligibility（適用可否）とValidatorRelaxationProfile（緩和構成）は別VOとして定義すべきか、QuickModeDecisionにすべて含めるべきか？

**決定**: 2段階で処理する。まずJudgmentEngineが`QuickModeEligibility`を返す（eligible: true/false + reason）。eligible=trueの場合のみValidatorRelaxationServiceが`ValidatorRelaxationProfile`を生成する。`QuickModeDecision`は`{ eligibility: QuickModeEligibility, relaxationProfile?: ValidatorRelaxationProfile }`の複合VOとして最終出力する。eligibilityがfailの場合はrelaxationProfileをundefinedにする。

### Q3: quick-implementor SKILL.md（H10-04）はドメインモデルに含めるか

**質問**: H10-04のquick-implementorスキルはSKILL.mdドキュメントの生成であり、ドメインモデルの設計対象外ではないか？

**決定**: H10-04はドメインモデルの設計対象外。SKILL.mdはdocs/skills/配下のドキュメント成果物であり、本Unitの実装ロジック（H10-01〜H10-03）が確定した後にskill-creatorスキルで作成する。domain_model.mdにはH10-04のドメイン概念は含めない。

### Q4: ChangeClassificationの「最高リスクカテゴリ」ルールの明確化

**質問**: 複数ファイルが混在する変更（例: `docs/`修正 + `__tests__/`追加）の場合、どちらのカテゴリを採用するか？テストと設計文書の同時変更はQuick Mode対象か？

**決定**: `allowedCategories`に含まれる全カテゴリのファイルのみで構成される変更はQuick Mode対象とする。1つでも`allowedCategories`外のカテゴリ（domain, api, feature）のファイルが含まれる場合は「混在変更拒否」ルールが発動する。`docs + test`の組み合わせはどちらも`allowedCategories`のデフォルト対象（bugfix/docs/test/config）のため、Quick Mode対象となる。

---

## 5. ポートインターフェース（予定）

| ポート | 方向 | 責務 |
|--------|------|------|
| ChangedFilesPort | 外部→ドメイン | git diff等から変更ファイル一覧を取得（filePath + changeKind） |
| QuickModeConfigPort | 外部→ドメイン | HarnessConfigV2.quickModeセクションを取得 |
| ValidatorIdRegistryPort | 外部→ドメイン | validator-systemのValidatorId一覧を参照（RelaxationProfile生成時） |

---

## 6. 前提条件・リスク

| 項目 | 内容 |
|------|------|
| 依存: config-foundation | HarnessConfigV2.quickModeセクションの確定が前提。Wave 1で実装済み |
| 依存: validator-system | ValidatorRelaxationProfileの消費側（validator-system）との契約確定が必要。Wave 2並列設計のため、事前にValidatorRelaxationProfileのインターフェース（VOの構造）を合意する |
| 依存: harness-error | HarnessError型の確定が前提。Wave 1で実装済み |
| リスク: 混在変更検出の精度 | ファイルパスベースの分類は完全ではない。`domain/`配下の既存ファイル修正（bugfix）を誤って拒否する可能性。`changeKind=MODIFY`かつ`domain/`配下のケースは「ドメイン既存修正」として別途検討が必要 |
| リスク: H10-04（SKILL.md）のスコープ外れ | quick-implementorスキルはdomain_model設計のスコープ外。論理設計フェーズで取り扱うか、skill-creatorスキルで別途対応する |

---

## 7. 承認

- [ ] 人間承認済み（Phase 2着手許可）

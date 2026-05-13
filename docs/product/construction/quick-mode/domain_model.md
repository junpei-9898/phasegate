# ドメインモデル: quick-mode

@story-id H10-01
@story-id H10-02
@story-id H10-03
@story-id H10-06
> **Unit ID**: quick-mode
> **作成日**: 2026-03-19
> **最終更新**: 2026-04-24（H10-06 / ISSUE-026 Phase D-1 WI-aware quick-implementor 反映）
> **Wave**: 2（品質検証レイヤー）
> **対応ストーリー**: H10-01〜H10-03, H10-06（H10-04/H10-06はSKILL.md契約のため実装ロジック外）
> **横断契約参照**: cross_cutting_decisions.md §2（Layer語彙）, §4（Shared Kernel最小化）, §6（集約降格）

---

## 1. Ownership / Import-Export

### このUnitが所有する概念

| 概念 | 分類 | 説明 |
|------|------|------|
| QuickModeConfig | 値オブジェクト | HarnessConfigV2.quickModeセクションからの設定VO（allowedCategories/maintainedLayers/relaxedGates） |
| ChangedFile | 値オブジェクト | 変更ファイルのパス（string）+ 変更種別（ChangeKind） |
| ChangeCategory | 値オブジェクト | 変更カテゴリ列挙型（bugfix/docs/test/config/feature/domain/api） |
| ChangeClassification | 値オブジェクト | ChangedFile[]の分類結果（最高リスクカテゴリ + カテゴリ別ファイル一覧） |
| QuickModeEligibility | 値オブジェクト | Quick Mode適用可否判定結果（eligible: boolean + reason + rejectionDetails?） |
| ValidatorRelaxationProfile | 値オブジェクト | 緩和後のバリデータ実行構成（L1〜L4各レイヤーの維持/スキップ宣言） |
| QuickModeDecision | 値オブジェクト | 最終判定複合VO（eligibility + relaxationProfile?） |
| QuickModeJudgmentEngine | ドメインサービス | 変更→ChangeClassification→QuickModeEligibility の判定処理 |
| ValidatorRelaxationService | ドメインサービス | QuickModeConfig → ValidatorRelaxationProfile の生成 |
| CommentOnlyDiffDetector | ドメインサービス | before/after source からコメント・空白のみの差分かを判定する |

<!-- @work-item-id WI-015 -->
### WI-015: コメントのみ差分の分類モデル

`ChangedFile` は従来の `filePath` / `changeKind` に加え、hook などの呼び出し元が取得できる場合のみ `beforeContent` / `afterContent` を保持する。content が未指定の場合は従来通りパスのみで分類する。

`CommentOnlyDiffDetector` は TypeScript/JavaScript の行コメント、ブロックコメント、JSDoc、空白を除いたソースを比較し、残るトークンが同一ならコメントのみ差分とみなす。文字列リテラル内の `//` や `/* */` はコメントとして扱わない。

### 他Unitから受け取るShared Kernel

| 型名 | 所有Unit | 自Unitでの扱い | 変更可否 |
|------|---------|---------------|---------|
| HarnessError | harness-error | 判定拒否時・バリデータエラーにHarnessError型を使用 | 読取専用 |
| HarnessConfigV2 | config-foundation | `HarnessConfigV2.quickMode` セクションからQuickModeConfig取得 | 読取専用 |

### 他Unitへ公開する契約

| 契約 | 消費Unit | 内容 |
|------|---------|------|
| QuickModeDecision Contract | harness-api | `{ eligibility: QuickModeEligibility, relaxationProfile?: ValidatorRelaxationProfile }` — statusコマンド表示用 |
| ValidatorRelaxationProfile Contract | validator-system | バリデータ緩和実行構成（Quick Mode時の選択実行指示として解釈） |
| QuickModeJudgmentEngine 参照 | skill-quality | quick-implementorスキルの前提チェックに使用 |

---

## 2. Aggregate Boundary

### 結論: 集約なし（ステートレス判定エンジン）

横断契約§6の集約降格方針に従い、quick-modeは集約を必要としない。

### 集約なしの根拠

- **ステートレス計算**: quick-modeのドメインは「変更ファイル群を分類し、適用可否を判定し、緩和プロファイルを生成する」純粋な計算処理
- **永続化不要**: 入力（ChangedFile[] + HarnessConfigV2）→ 出力（QuickModeDecision）の変換処理のみ
- **状態遷移なし**: QuickModeConfigはHarnessConfigV2から毎回生成され、独立ライフサイクルを持たない

---

## 3. Model Classification

### 値オブジェクト

| 値オブジェクト | 不変 | 値等価性 | 説明 |
|-------------|------|---------|------|
| QuickModeConfig | ✓ | ✓ | allowedCategories: ChangeCategory[], maintainedLayers: string[], relaxedGates: string[] |
| ChangedFile | ✓ | ✓ | filePath: string（WorkspaceRelativePath相当）, changeKind: ChangeKind |
| ChangeCategory | ✓ | ✓ | `'bugfix' \| 'docs' \| 'test' \| 'config' \| 'feature' \| 'domain' \| 'api'` |
| ChangeClassification | ✓ | ✓ | dominantCategory: ChangeCategory, categorizedFiles: Map\<ChangeCategory, ChangedFile[]\> |
| QuickModeEligibility | ✓ | ✓ | eligible: boolean, reason: string, rejectionRule?: RejectionRule, rejectedFiles?: ChangedFile[] |
| ValidatorRelaxationProfile | ✓ | ✓ | l1/l2/l3/l4設定 + phaseExecution設定（後述） |
| QuickModeDecision | ✓ | ✓ | eligibility: QuickModeEligibility, relaxationProfile?: ValidatorRelaxationProfile |

### 補助型

| 型 | 説明 |
|---|------|
| ChangeKind | `'CREATE' \| 'MODIFY' \| 'DELETE'` |
| RejectionRule | `'MIXED_CHANGES' \| 'NEW_DOMAIN' \| 'API_CONTRACT'` — 拒否ルール識別子 |

### ドメインサービス

| サービス | 責務 | 参照するポート |
|---------|------|--------------|
| QuickModeJudgmentEngine | 1. ChangedFile[]をChangeClassificationに変換<br>2. 3拒否ルール評価 → QuickModeEligibility生成 | ChangedFilesPort, QuickModeConfigPort |
| ValidatorRelaxationService | QuickModeConfigのmaintainedLayers/relaxedGatesから ValidatorRelaxationProfile生成 | ValidatorIdRegistryPort |

---

## 4. Port Interfaces

### 入力ポート（外部→ドメイン）

| ポート名 | 責務 | 利用サービス |
|---------|------|------------|
| ChangedFilesPort | git diff等から変更ファイル一覧を取得（filePath + changeKind） | QuickModeJudgmentEngine |
| QuickModeConfigPort | HarnessConfigV2.quickModeセクションを取得 → QuickModeConfig生成 | QuickModeJudgmentEngine, ValidatorRelaxationService |
| ValidatorIdRegistryPort | validator-systemのValidatorId一覧を参照（RelaxationProfile生成時にL2-001〜L4-005を列挙） | ValidatorRelaxationService |

---

## 5. Domain Rules and Invariants

### QuickModeJudgmentEngineの3拒否ルール（ハードコード不変条件）

以下の3ルールは`QuickModeJudgmentEngine`内にハードコードされ、`allowedCategories`設定で**上書きできない**。Quick Mode適用条件の緩和圧力への防波堤として機能する（横断契約K6対応）。

| RejectionRule | 条件 | 説明 |
|--------------|------|------|
| MIXED_CHANGES | ChangedFile[]に `allowedCategories`外のカテゴリ（domain/api/feature）を含む場合 | Quick Mode対象外ファイルとの混在は拒否 |
| NEW_DOMAIN | `domain/`配下のChangeKind=CREATEを含む場合 | 新ドメインエンティティ/VOの追加は拒否 |
| API_CONTRACT | Port/Adapterインターフェースファイルの変更を含む場合 | API契約変更は拒否 |

**評価順序**: MIXED_CHANGES → NEW_DOMAIN → API_CONTRACT（最初に一致したルールで即座に拒否）

### ChangeClassification分類ロジック

`ChangedFile.filePath`のパターンマッチングによるカテゴリ判定:

| ChangeCategory値 | 判定条件（filePath + changeKind） |
|----------------|---------------------------------|
| `bugfix` | 既存実装ファイルの修正（domain/以外, changeKind=MODIFY） |
| `docs` | `docs/`配下のファイル変更 |
| `test` | `__tests__/`配下 or `*.test.ts` or `*.spec.ts` |
| `config` | `*.config.json` or `*.config.ts` or `phasegate.config.json` |
| `feature` | 新規実装ファイル追加（domain/・port/以外, changeKind=CREATE） |
| `domain` | `domain/`配下のファイル（CREATE/MODIFY/DELETE） |
| `api` | Port/Adapterインターフェースファイル（`*port.ts`, `*adapter.ts`） |

<!-- @work-item-id WI-015 -->
`beforeContent` / `afterContent` があり、差分がコメントまたは空白のみの場合は、`*port.ts` / `*adapter.ts` より優先して `docs` に分類する。実際の interface、型、export、実装コードの変更は引き続き `api` として扱う。

**混在変更の判定**: `allowedCategories`に含まれる全カテゴリのファイルのみで構成される変更がQuick Mode対象。1つでも`allowedCategories`外（domain/api/feature）が含まれる場合はMIXED_CHANGES拒否。

### K14: Level間依存の非緩和保証

`QuickModeJudgmentEngine`は以下を不変条件として保持する:
- **INV-1**: Level間の依存（Level 2→Level 1、Level 3→Level 2）はQuick Modeでも**絶対に緩和しない**
- **INV-2**: Quick Modeが緩和するのはLevel内の一部ゲート（L2 phase-gate, 2-Phase Execution）のみ
- **INV-3**: `ValidatorRelaxationProfile.levelDependencyRelaxed` は常に `false`

### ValidatorRelaxationProfile不変条件

- **INV-4**: `eligible=false`のQuickModeDecisionでは`relaxationProfile`は`undefined`
- **INV-5**: `eligible=true`の場合のみValidatorRelaxationServiceがProfileを生成する

---

## 6. ValidatorRelaxationProfile構造

```typescript
interface ValidatorRelaxationProfile {
  levelDependencyRelaxed: false;          // 常にfalse（K14保証）
  l1: { all: true };                       // L1は全維持（緩和なし）
  l2: {
    maintained: ValidatorId[];            // ["L2-002", "L2-003", "L2-014"] (metadata/test-quality/WI status維持)
    skipped: ValidatorId[];               // ["L2-001", "L2-013", "L2-015"] (phase-gate/CLI E2E/contract traceabilityスキップ)
  };
  l3: {
    maintained: ValidatorId[];            // ["L3-001"] (security のみ維持)
    skipped: ValidatorId[];               // ["L3-002", "L3-003", "L3-004"] (performance/coverage/nyquist スキップ)
  };
  l4: { all: false };                     // L4は全スキップ
  phaseExecution: {
    twoPhaseRequired: false;              // 2-Phase Execution緩和
  };
}
```

**デフォルト緩和プロファイル**（`maintainedLayers`/`relaxedGates`設定がデフォルト値の場合）:
- L1: 全維持
- L2: L2-001（phase-gate）, L2-013（CLI E2E coverage）, L2-015（contract traceability）スキップ / L2-002, L2-003, L2-014 維持
- L3: L3-001（security）のみ維持 / L3-002, L3-003, L3-004 スキップ
- L4: 全スキップ
- 2-Phase Execution: 緩和（単フェーズ実行可）

---

## 7. Data Flow

```
[git diff / ChangeSource からの変更ファイル一覧]
         ↓
ChangedFilesPort → ChangedFile[]（filePath + changeKind）
QuickModeConfigPort → QuickModeConfig（allowedCategories/maintainedLayers/relaxedGates）
         ↓
QuickModeJudgmentEngine.judge(changedFiles, config)
  1. ChangeClassification 生成
     - filePath パターンマッチング → カテゴリ判定
     - dominantCategory 決定（allowedCategories外が含まれる場合）
  2. 3拒否ルール評価
     - MIXED_CHANGES: allowedCategories外ファイルの存在確認
     - NEW_DOMAIN: domain/ + CREATE の確認
     - API_CONTRACT: port/adapter ファイルの変更確認
  → QuickModeEligibility { eligible, reason, rejectionRule?, rejectedFiles? }
         ↓
    [eligible=false]                  [eligible=true]
         ↓                                  ↓
  QuickModeDecision               ValidatorRelaxationService.build(config)
  { eligibility, relaxationProfile: undefined }  → ValidatorIdRegistryPort（全ValidatorId取得）
  → HarnessError出力                         → ValidatorRelaxationProfile生成
                                             ↓
                                    QuickModeDecision
                                    { eligibility, relaxationProfile }
                                             ↓
                         [harness-api statusコマンド表示]
                         [validator-system への緩和指示]
```

---

## 8. 設計判断記録

### D1: 集約なしの判断

quick-modeは「変更ファイル群を分類し、適用可否を判定し、緩和プロファイルを生成する」ステートレスな判定エンジンであり、永続化が不要。入力（ChangedFile[] + HarnessConfigV2）→ 出力（QuickModeDecision）の純粋な計算処理のため集約は不要と判断した。QuickModeConfigはHarnessConfigV2から毎回生成され、独立ライフサイクルを持たない。

### D2: 3拒否ルールのハードコード

MIXED_CHANGES / NEW_DOMAIN / API_CONTRACT の3拒否ルールは`allowedCategories`設定で上書きできない不変条件として実装する。Quick Mode適用条件の緩和圧力への防波堤として機能させるため（横断契約K6「ゲート緩和圧力への防波堤」対応）。設定で緩和可能にすると将来的にQuick Modeの品質保証が形骸化するリスクがある。

### D3: ChangedFileのfilePath型をstring（ローカルVO）にした理由

横断契約§4（Shared Kernel最小化）に従い、`FilePath`は各Unit内のローカルVOとする。biome-ast-engineのFilePathに依存しない。quick-modeの`ChangedFile.filePath`はgetLayer()等の意味論が不要なため、単純なstring値（WorkspaceRelativePath相当）で十分。

### D4: QuickModeDecisionを複合VOにした理由

`QuickModeEligibility`（適用可否）と`ValidatorRelaxationProfile`（緩和構成）を2段階処理にする設計を採用。JudgmentEngineが`QuickModeEligibility`を返し、eligible=trueの場合のみRelaxationServiceが`ValidatorRelaxationProfile`を生成する。`QuickModeDecision`は`{ eligibility, relaxationProfile? }`の複合VOとして最終出力。eligibility=failの場合はrelaxationProfileをundefinedにする。

### D5: H10-04 / H10-06（quick-implementor SKILL.md）のスコープ外し

H10-04はSKILL.mdドキュメントの生成であり、ドメインモデルの設計対象外。SKILL.mdはdocs/skills/配下のドキュメント成果物であり、H10-01〜H10-03の実装ロジックが確定した後にskill-creatorスキルで作成する。

H10-06はISSUE-026 Phase D-1として、同じくquick-implementorのスキル契約をWI-awareに更新する作業である。`type: fix | chore` をQuick Mode適用候補、`type: story | issue | refactor` をFull Mode対象として扱うルール、および `Work-Item: WI-XXX` trailer をスキル側の手順に追加する。QuickModeJudgmentEngine自体はファイルカテゴリ判定を維持し、WI frontmatterの運用判断はスキル入口契約で扱う。

<!-- @work-item-id WI-159 -->
## WI-159 Validator Catalog Alignment

Quick Mode consumes a validator ID catalog that matches validator-system for the public L2/L3/L4 surface. The L2 set is `L2-001`, `L2-002`, `L2-003`, `L2-013`, `L2-014`, and `L2-015`.

`maintainedLayers` is an exact-ID list, not a layer expander. The only shorthand interpreted by the current model is `L1` for full L1 behavior and `L4` as an all-skipped layer marker in `relaxedGates`. Therefore `maintainedLayers: ["L2"]` does not keep every L2 validator active; users must list all L2 IDs explicitly when they need that behavior.

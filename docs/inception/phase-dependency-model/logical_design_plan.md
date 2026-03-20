# 論理設計計画: phase-dependency-model

> **作成日**: 2026-03-13
> **モード**: Unit横断（Phase 1）
> **対応ストーリー**: H02-01, H02-02, H02-03

---

## 1. スコープ

### 対象ストーリー

| Story ID | タイトル | 優先度 | 本計画で扱う中心論点 |
|----------|---------|--------|----------------------|
| H02-01 | 3層フェーズ構造定義 + phase-gateバリデータ拡張 | Must | PhaseStructure集約、Level 1→2→3の依存モデル、phase-gate判定 |
| H02-02 | Planning Mode（interactive/embedded-qa）+ plan文書必須生成 | Must | PlanningMode正規定義、PlanEvidence検証、QAセクション充足判定 |
| H02-03 | Phase Dependencyカスタマイズ | Should | PhaseCustomizationPolicy、override監査、緩和不可制約 |

### 対象層

| 層 | 対象 | 役割 |
|----|------|------|
| Domain | 対象 | 3層フェーズ構造の意味論、不変条件、PlanningMode正規定義 |
| Application | 対象 | phase-gate検証、依存グラフ公開、PhaseInfo算出、監査連携 |
| Infrastructure | 対象 | ファイルシステム読取、Markdown/plan解析、config-foundation連携 |
| Presentation | 限定対象 | 本UnitはCLIを所有しないため最小限。必要時のみharness-api/validator-system向けDTO変換を置く |

### スコープ外

- validator-system側の実行オーケストレーション本体
- harness-api側のCLIコマンド登録そのもの
- config-foundation側のJSONスキーマ定義実装

---

## 2. 設計方針

### 2.1 アーキテクチャ層定義

v1正規語彙である `domain / application / infrastructure / presentation` を採用する。`port / usecase / controller` は実装パターン名としてのみ使用し、`@layer` には使用しない。依存方向は横断契約に従い `domain ← application ← infrastructure`、`domain ← application ← presentation` とする。

- Domain層は `PhaseStructure` 集約を中心に、Level間依存、PlanningMode、カスタマイズ緩和不可制約を保持する
- Application層は外部証跡を収集して集約に渡し、`PhaseGateResult` や `PhaseInfo` をユースケース出力へ写像する
- Infrastructure層はファイルシステム、Markdown解析、`HarnessConfigV2` 読み取りのアダプターを実装する
- Presentation層は本Unit直下では最小限とし、validator-system/harness-api が呼びやすいDTOやFacadeを提供する

### 2.2 技術スタック

| 項目 | 方針 |
|------|------|
| 言語 | TypeScript |
| 実行基盤 | Node.js + `tsx` |
| テスト | Vitest |
| 整形/静的検証 | Biome |
| 外部I/O | `node:fs`, `node:path` を用いたファイルシステムアクセス |
| Markdown解析 | Wave 1では軽量な純TS実装を優先し、QAセクション検出に必要な最小構文のみ扱う |

### 2.3 ディレクトリ構造方針

既存コードベースが `scripts/harness` 配下で構成されているため、新規実装も同じルートに寄せる。`validators/phase-gate.ts` や `cli/check-phase.ts` は最終的に本UnitのApplication層を利用する消費側に寄せ、意味論の所有は本Unitに集約する。

```text
scripts/harness/
└── phase-dependency-model/
    ├── domain/
    │   ├── models/
    │   │   └── phase-structure.ts
    │   ├── value-objects/
    │   │   ├── phase-level.ts
    │   │   ├── phase-node.ts
    │   │   ├── phase-dependency.ts
    │   │   ├── planning-mode.ts
    │   │   ├── plan-evidence.ts
    │   │   ├── phase-gate-result.ts
    │   │   ├── phase-customization-policy.ts
    │   │   └── artifact.ts
    │   └── ports/
    ├── application/
    │   ├── usecases/
    │   ├── dto/
    │   └── services/
    ├── infrastructure/
    │   ├── filesystem/
    │   ├── config/
    │   └── logging/
    └── presentation/
        └── dto/
```

### 2.4 構造定義の保持方針

3層フェーズ構造のノード一覧とデフォルト依存関係は、本Unit所有の静的定義としてコード化する。`harness.config.json` では構造そのものを差し替えず、`phaseDependencies.customRules` で追加依存のみを注入できる形に限定する。これにより、Level間依存とTDD最低保証を設定ファイルで破壊できない設計にする。

---

## 3. 層別設計の計画

### 3.1 Domain層

#### 中心概念

- `PhaseStructure` を唯一の集約ルートとし、Level 1/2/3 のフェーズノード、既定依存、カスタマイズポリシー適用後の検証責務を持たせる
- `PlanningMode` は本Unitが正規定義を所有する値オブジェクトとし、`interactive` と `embedded-qa` の意味論をDomain層で固定する
- `PlanEvidence` は plan文書実体ではなく、存在・QA充足・PlanningMode整合の検証結果を表す値オブジェクトとして扱う

#### 型シグネチャ方針

| 型 | 方針 |
|----|------|
| `PhaseLevel` | `1 | 2 | 3` を包む値オブジェクト。比較 (`isHigherThan`, `isPrerequisiteOf`) を持つ |
| `PlanningMode` | 文字列unionを包む値オブジェクト。`fromConfig(value)` で構文→正規型へ昇格 |
| `PhaseNode` | `skillName`, `level`, `artifacts[]` を保持する不変値。ID文字列ではなく値そのもので等価性を取る |
| `Artifact` | `name`, `path`, `required` を保持。パスは project-relative 前提 |
| `PhaseGateResult` | `passed`, `blockers`, `warnings`, `auditPayload?` を保持し、Application層にそのまま返せる粒度にする |

#### 集約メソッドの計画

| メソッド | 責務 |
|---------|------|
| `checkPhaseGate(targetLevel, evidenceBundle)` | Level間依存、Level内順序、PlanEvidence、CustomizationPolicyを統合判定 |
| `getPhaseNodes(level)` | Level別ノード公開。validator-system/regression-suite向けの元データ |
| `buildDependencyGraph()` | 既定依存 + 許可された追加依存を反映したDAGを返す |
| `applyCustomization(policy)` | 緩和不可制約を検証しつつポリシーを適用する |

#### 設計上の決定

- ドメインサービスは原則設けない。検証ロジックは `PhaseStructure` 集約に寄せ、貧血化を避ける
- `PhaseNode` 一覧はDomain所有の静的定義として扱い、外部設定から任意ノードを注入しない
- Quick Modeの緩和は本Unitの不変条件を書き換えない。Quick Modeは実行範囲制御に限定する

### 3.2 Application層

Application層は外部ポートから証跡を取得し、Domain層へ入力を整形する調整役とする。

| ユースケース | 対応ストーリー | 役割 | 主な出力 |
|-------------|-------------|------|---------|
| `CheckPhaseGateUseCase` | H02-01, H02-02, H02-03 | target level/unit/story に必要な証跡を収集し、`PhaseStructure.checkPhaseGate` を実行する | `PhaseGateResultDto` |
| `BuildPhaseDependencyGraphUseCase` | H02-01 | 3層フェーズ構造と依存関係をvalidator-system/regression-suite向けに公開する | `PhaseDependencyGraphDto` |
| `GetPhaseInfoUseCase` | H02-01, H02-02 | 現在どのLevel/Phaseまで充足済みかを算出し、`harness:check-phase` 用情報を返す | `PhaseInfoDto` |
| `ValidateCustomizationPolicyUseCase` | H02-03 | `HarnessConfigV2.phaseDependencies` を読み、緩和不可制約違反を早期に拒否する | `CustomizationValidationResultDto` |
| `RecordPhaseOverrideAuditUseCase` | H02-03 | `override: true` の監査ペイロードをログ/レポート向けに永続化または出力する | `void` |

#### Applicationサービスの補助方針

- `EvidenceBundleAssembler` をApplicationサービスとして置き、Artifact存在結果、PlanEvidence、PlanningMode、CustomizationPolicyを集約入力へまとめる
- DTOは `harness-api` の `PhaseInfo` と `validator-system` の phase-gate 応答に再利用しやすい最小形へ揃える
- `RecordPhaseOverrideAuditUseCase` は `CheckPhaseGateUseCase` から分離し、副作用を隔離する

### 3.3 Infrastructure層

| アダプター | 実装するPort | 設計方針 |
|-----------|-------------|---------|
| `FileSystemArtifactExistenceChecker` | `ArtifactExistenceCheckerPort` | project root 基準で成果物パスを解決し、必須成果物の存在を判定する |
| `MarkdownPlanDocumentReader` | `PlanDocumentReaderPort` | `*_plan.md` の存在、QAセクション見出し、回答有無、PlanningMode痕跡を抽出する |
| `HarnessConfigPhaseConfigProvider` | `PhaseConfigProviderPort` | config-foundationの `loadConfig()` を利用し、`phaseDependencies` と `planningMode` を本Unitの正規型へ変換する |
| `PhaseOverrideAuditLogger` | `PhaseAuditLoggerPort` | override適用時の監査ペイロードをCLI/CIで追跡可能な形式へ出力する |

#### Infrastructure上の実装ポリシー

- ファイル存在判定はキャッシュせず、実行時点の成果物状態を都度参照する
- `PlanDocumentReader` は Markdown全文の意味解析ではなく、phase-gateに必要な構造検査に限定する
- `PhaseConfigProvider` は構造検証を再実装しない。構文妥当性はconfig-foundationを信頼し、本Unitでは意味論だけを検証する

### 3.4 Presentation層

本UnitはCLIコマンドを所有しないため、Presentation層は必須ではない。ただし既存の `scripts/harness/cli/check-phase.ts` および validator-system から利用しやすくするため、必要最小限のFacade/DTO変換は許容する。

- `PhaseInfoPresenter`:
  `GetPhaseInfoUseCase` の出力を `HarnessApiResponse.data` に積みやすい形へ変換する
- `PhaseGateResultPresenter`:
  `PhaseGateResult` を `HarnessError[]` や CLI表示用メッセージに変換する

---

## 4. ポートインターフェース一覧

| Port | 層 | 方向 | 主要メソッド案 | 目的 |
|------|----|------|---------------|------|
| `ArtifactExistenceCheckerPort` | Domain/Application | outbound | `checkAll(artifacts: Artifact[]): Promise<Map<string, boolean>>` | 成果物存在の外部取得 |
| `PlanDocumentReaderPort` | Domain/Application | outbound | `readEvidence(node: PhaseNode, mode: PlanningMode): Promise<PlanEvidence>` | plan文書の存在とQA充足の取得 |
| `PhaseConfigProviderPort` | Domain/Application | outbound | `getPlanningMode(scope: PhaseScope): Promise<PlanningMode>` / `getCustomizationPolicy(): Promise<PhaseCustomizationPolicy>` | config-foundation構造を意味論付き型へ変換 |
| `PhaseAuditLoggerPort` | Application | outbound | `record(payload: PhaseOverrideAuditPayload): Promise<void>` | override監査の外部出力 |

### ポート設計上の注意

- `PhaseConfigProviderPort` は `HarnessConfigV2` 全体を露出しない。必要最小限の意味論付きデータだけを返す
- `PlanDocumentReaderPort` は Markdown文字列を返さず、`PlanEvidence` を返すことでApplication/Domainに解析責務を漏らさない
- DomainテストではこれらのPortに対して外部依存のみをFake化し、ドメイン概念自体はモックしない

---

## 5. config-foundationとの境界設計

### 所有権分離

| 関心 | config-foundation | phase-dependency-model |
|------|-------------------|------------------------|
| `phaseDependencies` | JSONスキーマ構造の定義と構文妥当性検証 | `preset/override/customRules` の意味論、不変条件、緩和可否判定 |
| `planningMode` | JSONスキーマ構造の定義とデフォルト値保持 | `interactive/embedded-qa` の正規型定義、QA必須ルール、Phaseごとの適用意味 |
| 3層フェーズ構造 | 保有しない | ノード一覧、成果物一覧、依存DAGの正規定義 |
| override監査 | 保有しない | 監査要否の判定、監査ペイロード生成 |

### 受け渡しルール

- config-foundationは `HarnessConfigV2` の構造を保証するが、`customRules.phase` が実在するPhaseか、追加依存がDAGを壊さないか、overrideが緩和不可制約へ抵触しないかは本Unitが判定する
- `planningMode.default` と `planningMode.perPhase` は文字列のまま受け取り、本Unitで `PlanningMode` 値オブジェクトへ昇格する
- `phaseDependencies` は「構造注入」であって「構造置換」ではない。Level間依存と `story-implementor` 前のテスト設計前提は、本Unitのハードコード不変条件として保持する
- Quick Modeが別Unitから `relaxedGates` を渡しても、Phase Dependencyの最低保証は本Unit側で拒否できるようにする

### 境界上の設計判断

- `PhaseNode` 一覧は設定ファイルへ逃がさない。理由は、構造の正規定義を外部設定へ漏らすと ownership が崩れ、回帰テスト基準が不安定になるため
- config-foundationとの結合は `PhaseConfigProviderPort` で一本化し、Application層でのみ利用する

---

## 6. テスト方針

### テストレイヤー別方針

| テスト対象 | 目的 | 主な観点 |
|-----------|------|---------|
| Domainユニットテスト | 不変条件の検証 | Level間依存の緩和拒否、PlanningModeごとのQA必須、customRules追加時のDAG維持 |
| Applicationユニットテスト | オーケストレーション検証 | 証跡収集、Port呼び出し順、監査ログ分離、DTO変換 |
| Infrastructure統合テスト | 実ファイル解析の検証 | `*_plan.md` 存在判定、QAセクション抽出、config変換、パス解決 |
| 契約テスト | Cross-Unit整合 | `HarnessConfigV2` 受け渡し、`PhaseInfo` DTO、validator-systemが期待するgraph出力 |
| 回帰テスト | H02-01〜H02-03のAC保証 | plan文書なし拒否、設計文書なし実装拒否、override監査、緩和不可制約 |

### テスト記述ルール

- `docs/principles/testing-rules.md` に従い、AAAパターンを維持する
- 実行結果は `actual` 変数へ代入する
- テストケース名は日本語で記述する
- ドメインモデル自体はモックせず、外部依存PortのみFake/Stubを使う

### 優先度

1. `PhaseStructure` の不変条件テスト
2. `CheckPhaseGateUseCase` の正常系/拒否系
3. `MarkdownPlanDocumentReader` のQA抽出テスト
4. config-foundationとの契約テスト
5. validator-systemとの回帰フィクスチャ

---

## 7. 見積もり

| 作業 | 内容 | 見積もり |
|------|------|---------|
| Domain設計 | 集約API、値オブジェクト、依存DAG定義、緩和不可制約整理 | 1.5人日 |
| Application設計 | ユースケース、DTO、監査フロー、Facade設計 | 1.0人日 |
| Infrastructure設計 | FS/Markdown/config adapter設計、既存 `scripts/harness` への組込み方針 | 1.0人日 |
| テスト設計 | Domain/Application/Infrastructure/契約テスト観点の具体化 | 1.0人日 |
| Cross-Unitすり合わせ | config-foundation, validator-system, harness-apiとのIF確認 | 0.5人日 |
| **合計** |  | **5.0人日前後** |

### 見積もり上の注意

- `validator-system` 側のphase-gate呼び出し口の責務分離が未確定なら、0.5人日程度の調整バッファを見込む
- `PhaseNode` 一覧の粒度変更が入る場合、Domain設計と回帰テスト設計が連動して増える

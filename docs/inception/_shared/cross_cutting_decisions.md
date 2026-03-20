# Wave 1 横断契約決定事項

> **作成日**: 2026-03-12
> **ステータス**: Phase 2開始前に確定すべき事項
> **合意形成**: Claude Code + codex (gpt-5.4) 2ラウンドレビュー

---

## 1. Story ID正規形式

| 項目 | 決定 |
|------|------|
| **正規形式** | `HXX-XX`（例: H01-01, H06-03） |
| **旧形式** | `US-XXX` — deprecated / read-only。`user_stories.md`に`旧US`フィールドとして保持 |
| **所有Unit** | traceability-model（`StoryId`値オブジェクト） |
| **別名解決** | `StoryIdAliasResolver`サービスとして`StoryId`本体から分離 |

### メタデータ種別と検証責務

| メタデータ | 記法 | L2 metadata検証 | L3 nyquist検証 |
|-----------|------|----------------|---------------|
| `@story-id HXX-XX` | 設計文書の累積更新時 | 存在・書式・参照解決 | — |
| `// @story HXX-XX` | テストファイル | 存在・書式 | 被覆関係・要件追跡 |

---

## 2. レイヤー語彙

| 項目 | 決定 |
|------|------|
| **v1正規語彙** | `domain` / `application` / `infrastructure` / `presentation` |
| **v0語彙の扱い** | `port` / `usecase` / `controller` はレイヤーではなく実装パターン/役割の語彙として使用可。`@layer`タグには使用しない |
| **依存方向** | `domain ← application ← infrastructure`, `domain ← application ← presentation` |
| **要対応** | `architecture-philosophy.md`をPhase 2前にv1語彙で更新 |

### biome-ast-engine / traceability-model での適用

- `LayerBoundary`（biome-ast-engine）と`LayerReference`（traceability-model）は同一語彙表を参照
- `@layer`に許容される値: `domain`, `application`, `infrastructure`, `presentation`

---

## 3. ErrorCode正規形式

| 項目 | 決定 |
|------|------|
| **正規形式** | `L{n}-{nnn}`（例: L1-001, L2-001, L3-004） |
| **意味名コード** | 廃止。`L2-PHASE-GATE`等は`L2-001`に統一 |
| **人間可読性** | `message`フィールド + ErrorDefinitionRegistryの`title`/`category`属性で補完 |
| **拡張性** | `layer: L0〜L4`、連番の上限なし。Future Unit（L0-xxx, L4-004〜）の追加が自然に行える |

### ErrorDefinitionRegistry

各ErrorCodeに対して以下の属性を持つ定義レジストリを`harness-error`が所有:

| 属性 | 説明 |
|------|------|
| code | `L{n}-{nnn}` |
| title | 短い人間可読タイトル（例: "Phase Gate Violation"） |
| category | 分類（例: "structure", "metadata", "security"） |
| defaultSeverity | `error` / `warning` |
| adrRef | 関連ADR（オプション） |

---

## 4. Shared Kernel最小化

### Shared Kernelに含めるもの（3つのみ）

| 型 | 所有Unit | 用途 |
|----|---------|------|
| `HarnessError` | harness-error | 全バリデータのエラー報告フォーマット |
| `HarnessConfigV2` | config-foundation | 品質設定のSingle Source of Truth |
| `StoryId` | traceability-model | ストーリー識別子（HXX-XX形式） |

### Shared Kernelに含めないもの

| 型 | 方針 |
|----|------|
| `FilePath` | 各Unit内のローカル値オブジェクト。共通化する場合は`ProjectRelativePath`として構文的最小型に限定し、意味論を載せない |
| `PlanningMode` | phase-dependency-modelが正規定義を所有。config-foundationは構造のみ |
| `LayerName` | biome-ast-engine / traceability-modelの各Unit内で定義。語彙表は横断契約（本文書§2）で固定 |

---

## 5. config-foundation vs 各Unitの所有権

| 関心 | config-foundation | 各Unit |
|------|-------------------|--------|
| `phaseDependencies` | JSONスキーマ構造 | phase-dependency-model: 意味論・不変条件 |
| `planningMode` | JSONスキーマ構造 | phase-dependency-model: 正規型定義・ビジネスルール |
| `layers.L1` | JSONスキーマ構造 | biome-ast-engine: ルール定義・評価ロジック |
| `harnesses` | JSONスキーマ構造 | 各対応Unit: 機能の意味論 |
| `FeatureRegistry` | ACL的ドメインサービス。Wave 1は`harnesses`キーのみ、Wave 2でValidator ID追加 |

---

## 6. 集約の再評価方針

### 降格対象

| 概念 | 変更前 | 変更後 | 理由 |
|------|--------|--------|------|
| LintExecution | 集約 | ドメインサービス(`LintRunner`) + 値オブジェクト(`LintReport`) | 永続化不要、処理フロー |
| TraceabilityChain | 集約 | 値オブジェクト（ファイル起点の不変チェーン値） | 検証スナップショット、所有権境界なし |
| PlanDocument | エンティティ | 値オブジェクト(`PlanEvidence`) | ファイルシステム状態の読み取り結果 |
| HarnessError | 集約候補 | リッチ値オブジェクト + `HarnessErrorFactory`ドメインサービス | 不変、値等価性、永続化不要 |
| PhaseDependencyCustomization | 集約 | ポリシー値オブジェクト(`PhaseCustomizationPolicy`) | 実体はHarnessConfigV2内、独立ライフサイクルなし |
| BiomeRule | 集約（状態あり） | 不変`RuleDefinition` + 設定注入 | ルール定義は不変、有効状態は外部設定 |

### 維持する集約

| 集約 | Unit | 理由 |
|------|------|------|
| PhaseStructure | phase-dependency-model | Level間依存の整合性境界として必要 |
| HarnessConfig | config-foundation | ファイル単位I/Oの整合性境界 |
| ADR | adr-foundation | 独立ライフサイクル（状態遷移）を持つ |

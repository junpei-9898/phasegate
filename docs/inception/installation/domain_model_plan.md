---
traceability:
  initial_creation: true
---

# ドメインモデル設計計画: installation

@work-item-id WI-144

> 起票元: WI-144 系の domain modeling 第一段階
> 関連: `docs/product/units/installation_unit.md` (unit-designer Phase 2 成果物、承認済み)
> 既存承認文書: `docs/inception/_shared/installation_unit_design_plan.md`, `docs/inception/_cross/WI-145/logical_design_plan.md`

## 1. スコープ

### 対象 Unit と担当 WI
- Unit: `installation`
- 担当 WI: WI-145 (manifest + doctor), WI-146 (install merge), WI-147 (uninstall), WI-148 (reconcile + init deprecation)

### 他 Unit との境界
本 unit が **所有** する概念:
- Deployment 状態 (manifest)
- Structural health diagnostics (doctor)
- AI 委譲経路の domain 表現 (RepairMode / SuggestedSkill)
- Merge / Uninstall / Reconcile 戦略

本 unit が **参照** する概念 (他 unit 所有):
- `HarnessError` (harness-error unit) — エラー出力で再利用、新規 Shared Kernel は導入しない
- `phasegate.config.json` schema (config-foundation unit) — deploy 整合性検査で参照
- Agent hook config 知識 (agent-integration unit) — settings.json / hooks.json の merge strategy 内で参照
- CI workflow 規約 (ci-governance unit) — workflow file 配置 strategy 内で参照

### 設計対象の業務領域
phasegate 自身が「deploy された」「deploy されていない」「部分的に deploy された」「user 改変で破損した」等の状態を**機械的に判定可能**にすること。さらにその状態から「機械的に修復可能 / AI 委譲推奨 / 手動」を区別すること。

## 2. 集約候補の分析

### 抽出した業務名詞 (WI description.md + unit_design_plan.md + logical_design_plan.md 横断)

| 名詞 | 業務的意味 | ライフサイクル | 集約候補 |
|---|---|---|---|
| Deployment Manifest | phasegate が deploy した全 file の記録 | install で作成 → uninstall で archive | **集約 root** |
| Deployment Entry | manifest 内の 1 file 単位記録 | manifest と共に存在、独立変更なし | VO (manifest 内部) |
| Diagnostic Report | doctor 1 回実行で出る検査結果 | 一過性 (doctor 実行ごと新規) | **集約 root** |
| Diagnostic Finding | report 内の 1 件の検出 | report と共に存在 | VO (report 内部) |
| Repair Mode | 修復の機械化レベル (3 値) | 永続せず finding に付随 | VO |
| Suggested Skill | AI 委譲推奨先 | RepairTable 内で静的定義 | VO |
| Repair Table | checkId → SuggestedSkill 静的マッピング | 永続せず domain pure object | **Domain Service / 静的レジストリ** (集約にしない) |
| Heuristic Check | 1 種の検査手続き | doctor 実行時に評価 | Domain Service interface (集約にしない) |
| Merge Strategy | 既存 file への structured merge 戦略 | install 実行時に評価 | Domain Service interface (集約にしない、WI-146 で導入) |
| Managed Block | merge 時に挿入する識別可能 block | manifest entry の属性 | VO (entry 内部) |

### 集約候補と根拠

| 集約 | Root | 内部 VO | 不変条件 |
|---|---|---|---|
| **DeploymentManifest** | `DeploymentManifest` | `DeploymentEntry[]` | (a) `entries[].path` がユニーク; (b) `entry.mode == "merged"` ⇒ `entry.block != null`; (c) `entry.hash` は sha256 hex 形式; (d) `version` は semver 形式 |
| **DiagnosticReport** | `DiagnosticReport` | `DiagnosticFinding[]` | (a) `findings[].checkId` がユニーク; (b) `finding.repairMode == "ai-assisted"` ⇒ `finding.suggestedSkill != null`; (c) `finding.severity == "red"` のとき report 全体の `overallStatus = "red"`; (d) `overallStatus` は `findings` から derive される |

VO のみで集約にしないもの:
- `RepairMode`: 3 値 enum-like VO。比較・serialize のみ
- `SuggestedSkill`: `{skillName, rationale, invokeCommand}` の純粋データ VO
- `RepairTable`: 静的 lookup table、domain pure object として `lookup(checkId)` を提供 (集約ライフサイクルを持たない)
- `HeuristicCheck`: interface (application layer の strategy)

## 3. 設計方針

### 3.1 集約の粒度方針
- **小さい集約**: DeploymentManifest と DiagnosticReport は別集約に切る。理由: ライフサイクルが完全に独立 (manifest は永続的、report は一過性)、トランザクション境界が異なる
- **集約間参照は ID のみ**: 該当する局面 (例: doctor が manifest を読む) では `ManifestRepositoryPort.load(projectRoot)` で取得し、DiagnosticReport から直接参照しない

### 3.2 値オブジェクト vs エンティティの判断基準
- **エンティティを持たない**: 本 domain では `id + 可変属性` を持つ概念が存在しない
  - DeploymentEntry は `path` で identify されるが immutable (一度作ったら変更しない、`removeEntry` は別エントリで置換)
  - DiagnosticFinding も immutable (report と一体で 1 回作成)
- **全て VO + 集約 root のみ**: 純粋にデータ志向の domain、副作用は infrastructure adapter 側で扱う

### 3.3 Shared Kernel との関係
- 新規 Shared Kernel は **導入しない** (unit_design_plan.md §5 制約)
- `HarnessError` を再利用 (harness-error unit 所有)
- `RepairMode` / `SuggestedSkill` / `DeploymentManifest` 等は installation unit 内に閉じる。他 unit からの参照は port interface 経由のみ

### 3.4 Immutability 方針
- 全 VO / 集約 root を TypeScript `readonly` で記述
- runtime 保護として constructor で `Object.freeze()` (deep freeze 含む)
- domain pure: 全ての mutating-looking API (`addEntry` / `removeEntry`) は **新インスタンスを返す pure function**

### 3.5 Domain Event の取り扱い
本 unit では **ドメインイベントを発行しない**。理由:
- file system state を直接操作する性質上、event sourcing は overkill
- install / uninstall / reconcile の途中状態は manifest 自体に記録される
- 将来 event 発行が必要になった場合の拡張余地は持つが、本 WI スコープでは不要

## 4. QA（不明点・確認事項）

### [Question] Q1: DiagnosticReport を「集約 root」とするか「value tuple」とするか

doctor 実行の出力 `DiagnosticReport` は一過性 (永続化しない) ため、集約 root として扱うか単純な value tuple として扱うかは設計判断。

**選択肢 a**: 集約 root (`DiagnosticReport.findings` の不変条件を root で保証)
**選択肢 b**: 単純な `{ findings: DiagnosticFinding[], overallStatus: ... }` value tuple

**推奨案**: **a (集約 root)**
- 理由 1: 不変条件 (red finding が 1 件でもあれば overallStatus = "red") を root の constructor / factory で保証できる
- 理由 2: WI-146/147/148 で install/uninstall/reconcile が同種の report を返すようになると、共通基底として集約パターンが活きる
- 理由 3: TypeScript readonly + Object.freeze() で value tuple とほぼ同等の immutability を得つつ、不変条件の集約を持てる

[Answer]
推奨案 a (集約 root) で承認 (2026-05-11)

### [Question] Q2: `RepairTable` の placement と test 戦略

`RepairTable` (checkId → SuggestedSkill 静的マッピング) を:

**選択肢 a**: domain layer の `const REPAIR_TABLE: Record<CheckId, SuggestedSkill>` (top-level constant)
**選択肢 b**: domain class `RepairTable` で `lookup(checkId): SuggestedSkill | null` メソッドを提供
**選択肢 c**: application layer の domain service として injection 可能化

**推奨案**: **b (domain class)**
- 理由 1: 将来 user-config による override (WI-148 で検討) を入れる際、class でラップしておけば API を変えずに拡張できる
- 理由 2: TypeScript の class + readonly Map で immutability を保ちつつ、ユニットテストで lookup ロジックを検証しやすい
- 理由 3: c (DI) は本 WI スコープでは overkill。WI-148 で必要なら昇格させる

[Answer]
推奨案 b (domain class) で承認 (2026-05-11)

### [Question] Q3: Hash アルゴリズムの選定

DeploymentEntry.hash で使うアルゴリズム:

**選択肢 a**: sha256 (Node.js `crypto.createHash("sha256")`)
**選択肢 b**: xxhash (高速、依存追加が必要)
**選択肢 c**: murmur3

**推奨案**: **a (sha256)**
- 理由 1: Node.js 標準で依存追加なし
- 理由 2: deploy file は config / hook script で kbyte オーダー、sha256 で性能問題なし
- 理由 3: 衝突耐性が必要 (user 改変検出の信頼性)
- 理由 4: hash 値は manifest に persist されるため、安定アルゴリズムが望ましい
- format: `sha256:<64 hex chars>` の prefix 付き string (将来の alg 切替に備える)

[Answer]
推奨案 a (sha256, `sha256:` prefix) で承認 (2026-05-11)

### [Question] Q4: DeploymentEntry の equality 定義

VO の equality を `path` 一致で判定するか、全フィールド一致で判定するか:

**選択肢 a**: `path` 一致のみ (集約内 entry の identity として path を使う)
**選択肢 b**: 全フィールド一致 (path + mode + block + hash が完全一致)

**推奨案**: **a (path 一致)**
- 理由 1: 集約 root (DeploymentManifest) 内で `entries[].path` がユニークという不変条件を持つ
- 理由 2: hash や mode の更新は「同 path entry の差し替え」として扱う方が直感的
- 理由 3: `removeEntry(manifest, path)` 等の API が path-based で一貫する

[Answer]
推奨案 a (path 一致) で承認 (2026-05-11)

### [Question] Q5: DiagnosticFinding の severity と RepairMode の関係性

`severity: "red" | "warn"` と `repairMode: "mechanical" | "ai-assisted" | "manual"` は独立次元か、依存次元か:

**選択肢 a**: 独立 (severity は重要度、repairMode は修復可能性、直交)
**選択肢 b**: 一部依存 (red ⇒ mechanical or ai-assisted、warn ⇒ 任意 RepairMode)
**選択肢 c**: 完全依存 (severity から RepairMode を derive)

**推奨案**: **a (独立)**
- 理由 1: 「red flag だが ai-assisted」 (e.g. settings.json の構造的不在 + user 改変あり) のような組み合わせが意味を持つ
- 理由 2: 「warn だが manual」 (e.g. CI workflow と意味的競合の可能性、人間判断要) も意味を持つ
- 理由 3: 直交させた方が finding の表現力が高い
- 制約: 不変条件 (a) `repairMode == "ai-assisted"` ⇒ `suggestedSkill != null` のみ

[Answer]
推奨案 a (独立次元) で承認 (2026-05-11)

## 5. 前提条件・リスク

### 前提条件
- 上位設計 (`installation_unit.md`) は承認済み (unit-designer Phase 3 完了)
- WI-145 logical_design_plan.md の Q1〜Q6 は推奨案で承認済み
- `phasegate.config.json` の `architecture.preset: "clean"` を維持

### リスク

| リスク | 影響 | 緩和策 |
|---|---|---|
| 集約と VO の境界が WI-146/147/148 拡張時に揺れる | merge/uninstall/reconcile strategy 追加で再設計が発生 | strategy は domain service interface として独立、集約 root には含めない (本計画書 §2) |
| sha256 計算が大きな file で遅延 | doctor / install 実行が体感的に遅い | deploy 対象 file は config + hook で kbyte オーダー、性能問題は実測で検証 |
| DiagnosticReport の集約化で過剰設計に見える | レビュー時の議論 | Q1 で a 採用根拠を明示 (将来の install/uninstall/reconcile report との共通基底) |
| RepairTable のマッピングが運用で陳腐化 | hint が無効になる | WI-148 でユーザー上書き経路 (config 化) を別途検討、本 WI では静的固定 |

### 既知の依存
- domain-designer Phase 2 完了が logical-designer Phase 2 (横断モード本実行) の前提条件

---

## Phase 1 完了宣言

本計画書を出力した時点で Phase 1 は完了。人間にレビューと Q1〜Q5 回答を依頼する。Phase 2 では `docs/product/construction/installation/domain_model.md` に集約・VO・不変条件・状態遷移表・Mermaid 図を生成する。

# TDD実装計画: configurable_phase_gate_plan Phase B-2（ドメイン層）

> **作成日**: 2026-04-05
> **対象計画書**: `docs/inception/_shared/configurable_phase_gate_plan.md` §B-2
> **対象 Unit**: phase-dependency-model
> **性質**: 横断タスク（単一ユーザーストーリーに紐付かない）。story-implementor の 2フェーズ承認ゲートを `_shared` 配下の計画ファイルで代替する

---

## 1. スコープ

### 対応計画書セクション
- B-2-1: `GateDefinition` 値オブジェクト新設
- B-2-2: `GateGraph` ドメインサービス新設 — DAG 検証 + 循環依存検出
- B-2-3: `PhaseStructure` を `gates[]` から動的構築できるよう拡張
- 付随: `GlobMatcherPort` インターフェース定義のみ（実装は B-4）

### 影響する層
- ✅ Domain（新規追加）
- ❌ Application（B-3 で実施）
- ❌ Infrastructure（B-4 で実施）
- ❌ Presentation（本フェーズでは変更なし）

### 非スコープ
- B-3 アプリケーション層（ResolveGateUseCase）
- B-4 インフラ層（PicomatchGlobMatcher、CustomGatesConfigParser）
- `package.json` への `picomatch` 追加（B-4 で実施）
- `docs/guide/configuration.md` 更新（B-6）
- JSON Schema ファイルへの `gates[]` 実体追加（B-4 で実施）

---

## 2. 前提条件検証

| 項目 | 状態 |
|------|------|
| `docs/product/construction/phase-dependency-model/domain_model.md` §11 | ✅ 2026-04-05 更新済み |
| `docs/product/construction/phase-dependency-model/logical_design.md` §10 | ✅ 2026-04-05 更新済み |
| `configurable_phase_gate_plan.md` §5 / §B-2 | ✅ 既存 |
| B-1-1（glob ライブラリ選定）| ✅ picomatch 決定 |
| B-1-2（JSON Schema ドラフト）| ✅ 確定 |
| 既存 `PhaseStructure` 集約の把握 | ✅ `scripts/harness/phase-dependency-model/domain/models/phase-structure.ts` |

**判定**: ✅ 実装準備完了

---

## 3. TDD実装順序

### 3.1 Unit テスト（RED → GREEN → REFACTOR）

テスト配置: `scripts/harness/__tests__/unit/phase-dependency-model/`

| # | 対象 | テストファイル | テスト観点 | 実装ファイル |
|---|------|----------------|-----------|-------------|
| 1 | `GateName` VO | `gate-name.test.ts` | kebab-case パターン、空文字、先頭数字、大文字、ハイフン末尾 | `domain/values/gate-name.ts` |
| 2 | `GateStoryAnnotation` VO | `gate-story-annotation.test.ts` | `required`/`tag` 必須、`tag` 空文字不可 | `domain/values/gate-story-annotation.ts` |
| 3 | `GateDefinition` VO | `gate-definition.test.ts` | INV-10（storyAnnotation × level !== 3 → throw）、readonly 凍結、`fromRaw` 正常系 | `domain/values/gate-definition.ts` |
| 4 | `GateGraph` ドメインサービス | `gate-graph.test.ts` | INV-11（循環: 自己/2ノード/長鎖）、INV-12（未知 dependsOn）、INV-13（レベル逆行）、INV-14（重複 name）、`resolveAncestors` トポロジカル順、エラー集約 | `domain/services/gate-graph.ts` |
| 5 | `PhaseStructure.fromGates()` | `phase-structure-from-gates.test.ts` | GateDefinition → PhaseNode 変換、既存 INV-1〜9 の継承、`fromPresetRules` リグレッションなし | `domain/models/phase-structure.ts`（拡張） |

### 3.2 IT テスト

本フェーズでは **なし**。アプリケーション層（B-3）で実施。

### 3.3 E2E テスト

本フェーズでは **なし**。B-5-3 で `custom` プリセットの E2E を実施。

### 3.4 実行方式

- **TDD 本体**: Codex CLI 経由（`feedback_codex_delegation.md` 準拠、`codex exec --dangerously-bypass-approvals-and-sandbox`）
- **レビュー**: Claude Code（メインセッション）が codex の出力を検証
  - 新規ファイル配置・命名規約
  - テストが実際に RED → GREEN を通っているか
  - メタデータ (`@unit` / `@layer`) の付与
  - 既存テスト全件パス

---

## 4. 実装対象ファイル一覧

### 新規作成

```
scripts/harness/phase-dependency-model/domain/
├── values/
│   ├── gate-name.ts
│   ├── gate-story-annotation.ts
│   └── gate-definition.ts
├── services/
│   └── gate-graph.ts
└── ports/
    └── glob-matcher-port.ts

scripts/harness/__tests__/unit/phase-dependency-model/
├── gate-name.test.ts
├── gate-story-annotation.test.ts
├── gate-definition.test.ts
├── gate-graph.test.ts
└── phase-structure-from-gates.test.ts
```

### 修正

```
scripts/harness/phase-dependency-model/domain/models/phase-structure.ts
  - 新ファクトリ `fromGates(gates, policy)` 追加
  - 既存 `fromPresetRules(policy)` は変更しない
```

### エラークラス追加場所

既存の `phase-dependency-model/domain/errors/` または `shared-kernel/harness-error` の方針に従って配置:
- `InvalidGateDefinitionError`
- `GateGraphValidationError`

（既存のエラークラス配置規約を codex が読み取り、準拠する）

---

## 5. 環境検証チェックリスト

- [ ] `npm run test` が既存テスト全件パス（ベースライン確認）
- [ ] `npx phasegate lint`（L1 Biome AST）パス
- [ ] `npx phasegate validate --layer L2` パス（本 Phase 範囲で発火する範囲）
- [ ] TypeScript コンパイル（`tsc --noEmit`）パス

事前実行結果: **実装開始時に codex 側で実施**

---

## 6. QA（不明点・確認事項）

### [Question] Q1: エラークラスの配置場所

既存ドメイン層には専用の `errors/` ディレクトリがあるか未確認。存在すればそこに、なければ `values/` 配下に `gate-errors.ts` として置く。

**推奨案**: codex に既存構造を読ませた上で、既存規約に追従させる。明示的な指示は与えない（= 既存パターンの再利用優先）。

[Answer] 承認（推奨案採用）

---

### [Question] Q2: `GateDefinition.fromRaw()` の位置づけ

`fromRaw(raw: unknown)` は JSON Schema 検証後のパースヘルパーだが、これを Domain 層に置くか Infrastructure 層に置くか。

**推奨案**: Domain 層に置く。理由:
- Schema 検証（AJV）は Infrastructure で行う
- `fromRaw` はその後の型付き構築のみを担当（I/O なし、pure function）
- Domain が自己の VO 構築ロジックを所有するのは Clean Architecture の原則と整合

[Answer] 承認（推奨案採用）

---

### [Question] Q3: `GateGraph` のエラー集約方針

複数の違反（循環 + レベル逆行 + 未知参照）が同時にある場合、1 件目で throw するか全件集約するか。

**推奨案**: **全件集約**。`GateGraphValidationError` に `violations: Violation[]` フィールドを持たせ、ユーザーが 1 回の config 修正で全違反を把握できるようにする（`consistency-checker` 系 UX と同等）。

[Answer] 承認（推奨案採用）

---

### [Question] Q4: `PhaseStructure.fromGates()` のエラー処理

`fromGates` 内で `GateGraph.build()` が throw した場合、そのまま伝搬するか、`PhaseStructureBuildError` にラップするか。

**推奨案**: **そのまま伝搬**。`GateGraphValidationError` は十分に詳細情報を持っており、ラップは情報を失う可能性がある。呼び出し側（B-3 の UseCase）で必要なら catch してユーザー向けメッセージに変換する。

[Answer] 承認（推奨案採用）

---

### [Question] Q5: `blocks` が空配列または省略された場合の挙動

計画書 §5.4 に「省略時はプリセットのデフォルト挙動にフォールバック」とあるが、`custom` プリセット時にフォールバック先となる "デフォルト" が存在しない。

**推奨案**: **Domain 層では `blocks` の空配列を許容する**（INV で強制しない）。意味論は Application 層（B-3 `ResolveGateUseCase`）で決定する:
- `blocks: []` → そのゲートはどの Write 対象にも発火しない（"passive gate" = dependsOn でのみ参照される中間ノード）
- 明示的な空配列を許容することで、階層化されたゲート設計（ルートゲートが blocks を持ち、子ゲートは dependsOn でつながる）が可能

[Answer] 承認（推奨案採用）

---

## 7. 前提条件・リスク

### 前提条件
- 既存 `PhaseStructure` 集約の public API は変更しない（後方互換維持）
- Codex CLI が利用可能（`codex exec --dangerously-bypass-approvals-and-sandbox`）
- Phase Gate はドメイン層の新規ファイル追加を `logical_design.md` + `domain_model.md` 存在チェックで許可する

### リスク
| リスク | 軽減策 |
|--------|--------|
| 既存 `PhaseStructure` テストがリグレッション | `fromGates` は新ファクトリとして追加、既存コンストラクタ・ファクトリは変更しない |
| `gate-graph.ts` の Tarjan 実装バグ | Unit テストで 3 パターンの循環（自己/2ノード/長鎖）を網羅 |
| エラークラス配置の既存規約違反 | codex に既存ディレクトリ構造を読ませてから配置決定 |
| Codex による scope 越境（docs/ 編集など） | `feedback_codex_scope_violations.md` 準拠: `scripts/harness/phase-dependency-model/` + `__tests__/unit/phase-dependency-model/` に限定する旨を明示指示 |

---

## 8. Phase 2 実行時の codex プロンプト骨子

```
以下を TDD で実装せよ（RED → GREEN → REFACTOR）:

対象 Unit: phase-dependency-model
スコープ: configurable_phase_gate_plan.md §B-2（ドメイン層のみ）

参照文書:
- docs/product/construction/phase-dependency-model/domain_model.md §11
- docs/product/construction/phase-dependency-model/logical_design.md §10
- docs/inception/_shared/configurable_phase_gate_b2_tdd_plan.md（本計画）

編集対象ディレクトリ（これ以外は編集禁止）:
- scripts/harness/phase-dependency-model/domain/
- scripts/harness/__tests__/unit/phase-dependency-model/

実装順:
1. gate-name.ts + test（kebab-case 検証）
2. gate-story-annotation.ts + test
3. gate-definition.ts + test（INV-10）
4. gate-graph.ts + test（INV-11〜14、Tarjan SCC、全違反集約）
5. glob-matcher-port.ts（interface のみ）
6. phase-structure.ts に fromGates() 追加 + test（既存 fromPresetRules はリグレッションなし）

全新規ファイルに以下メタデータ必須:
// @unit phase-dependency-model
// @layer domain

テストケース名は日本語、AAA パターン、Vitest、ドメイン層モック禁止。

完了条件:
- npm run test が全件パス
- npx phasegate lint パス
- 新規テストが実際に RED → GREEN を経由していることを各 VO ごとにコミットログで示す（任意、困難なら省略可）

禁止事項:
- docs/ 以下の編集
- package.json の編集
- scripts/harness/phase-dependency-model/{application,infrastructure,presentation}/ の編集
- scripts/harness/ 以外の編集
```

---

## 9. Phase 1 完了条件

- [x] 計画ファイルを出力（本ファイル）
- [x] 環境検証チェックリスト記載（事前実行は Phase 2 冒頭で）
- [x] QA セクションに Q1〜Q5 を記載し推奨案を提示
- [ ] **人間の承認待ち** ← ここで止まる
- [ ] 実装コードはまだ書いていない ✅

---

## 10. 次のアクション

ユーザーが本計画を承認した場合、以下を実施:

1. §8 の codex プロンプトで Codex CLI に TDD 実装を委任
2. 実装完了後、Claude Code（メインセッション）がレビュー:
   - 新規ファイルの配置・命名・メタデータ
   - テスト全件パス確認（`npm run test`）
   - `npx phasegate lint` パス確認
   - 既存テストのリグレッションがないこと
3. レビュー通過後、TaskList の B-2 タスクを `completed` にマーク
4. `configurable_phase_gate_plan.md` の B-2-1/2/3 を `[x]` に更新
5. 次のフェーズ B-3（アプリケーション層）に進む

# TDD実装計画: configurable_phase_gate_plan Phase B-4（インフラストラクチャ層）

> **作成日**: 2026-04-05
> **対象計画書**: `docs/inception/_shared/configurable_phase_gate_plan.md` §B-4
> **対象 Unit**: phase-dependency-model（主）、config-foundation（JSON Schema 拡張のみ）、traceability-model（L2-002 再利用のみ）
> **性質**: 横断タスク（単一ユーザーストーリーに紐付かない）

---

## 1. スコープ

### 対応計画書セクション
- **B-4-1**: `gates[]` config パース + バリデーション（JSON Schema 拡張 + `CustomGatesConfigParser`）
- **B-4-2**: glob マッチングアダプター実装 — `PicomatchGlobMatcher`（`InMemoryGlobMatcher` 置換）
- **B-4-3**: `storyAnnotation` フィールドと既存 L2-002 (`ValidateDesignStoryAnnotationsUseCase`) の統合

### 影響する層
- ✅ Infrastructure（phase-dependency-model / config-foundation）
- ✅ Application（phase-dependency-model `ResolveGateUseCase` に storyAnnotation 検証経路を追加）
- ❌ Domain（B-2 で完了済み、追加変更なし）
- ❌ Presentation（本フェーズでは変更なし）

### 非スコープ
- B-5 テスト（DAG 検証 UT / UseCase IT / custom E2E）
- B-6 ドキュメント（`configuration.md` `gates[]` リファレンス）
- Phase C 既存負債

---

## 2. 前提条件検証

| 項目 | 状態 |
|------|------|
| B-2 ドメイン層（`GateDefinition.fromRaw`, `GateGraph`, `GlobMatcherPort`） | ✅ 完了（v0.20.0） |
| B-3 アプリケーション層（`ResolveGateUseCase`, custom preset 分岐） | ✅ 完了（v0.21.0） |
| picomatch 依存の有無 | ✅ transitive に v4.0.4 存在、`dependencies` に明示追加必要 |
| `harness-config-v2.schema.json` の `phaseDependencies` 位置 | ✅ L152-215 に存在 |
| 既存 L2-002 UseCase 配置 | ✅ `scripts/harness/traceability-model/application/usecases/validate-design-story-annotations-usecase.ts` |
| AJV Validator 既存実装 | ✅ `scripts/harness/config-foundation/infrastructure/validators/ajv-config-schema-validator.ts` |
| `configurable_phase_gate_plan.md` §5.2 gates[] フィールド仕様 | ✅ 確定済み |

**判定**: ✅ 実装準備完了

---

## 3. TDD実装順序

### 3.1 Unit テスト（RED → GREEN → REFACTOR）

配置: `scripts/harness/__tests__/unit/phase-dependency-model/`

| # | 対象 | テストファイル | テスト観点 | 実装ファイル |
|---|------|----------------|-----------|-------------|
| 1 | `PicomatchGlobMatcher` | `picomatch-glob-matcher.test.ts` | `foo/**`, `foo/*.ts`, 完全一致, 非マッチ, 複雑パターン（`**/*.{ts,tsx}`） | `infrastructure/adapters/picomatch-glob-matcher.ts` |
| 2 | `CustomGatesConfigParser` | `custom-gates-config-parser.test.ts` | 正常系（1〜複数ゲート）、不正型、未知フィールド拒否、空配列許容、`fromRaw` → `GateGraph.build` 統合、DAG 違反時エラー伝搬 | `infrastructure/config/custom-gates-config-parser.ts` |

### 3.2 Integration テスト

配置: `scripts/harness/__tests__/integration/phase-dependency-model/`

| # | 対象 | テストファイル | テスト観点 |
|---|------|----------------|-----------|
| 3 | AJV Schema（phaseDependencies.gates[]） | `ajv-phase-dependencies-gates.integration.test.ts` | `phaseDependencies.gates[]` を含む config が AJV を通過、`storyAnnotation` Level 制約、`additionalProperties: false` |
| 4 | `ResolveGateUseCase` + storyAnnotation 統合 | `resolve-gate-usecase-story-annotation.integration.test.ts` | storyAnnotation required:true ゲートで Write 対象に `@story-id` 欠落 → blockers に追加、存在 → passes |
| 5 | custom プリセット composition-root | `composition-root-custom-preset.integration.test.ts` | config から `CustomGatesConfigParser` → `ResolveGateUseCase` → 実 FS 判定の一気通貫 |

### 3.3 E2E テスト
本フェーズでは **なし**（B-5-3 で実施）。

### 3.4 実行方式
- **TDD 本体**: Codex CLI 経由（`feedback_codex_delegation.md` 準拠、`codex exec --dangerously-bypass-approvals-and-sandbox`）
- **レビュー**: Claude Code（メインセッション）

---

## 4. 実装対象ファイル一覧

### 新規作成

```
scripts/harness/phase-dependency-model/
├── infrastructure/
│   ├── adapters/
│   │   └── picomatch-glob-matcher.ts          # GlobMatcherPort 実装
│   └── config/
│       └── custom-gates-config-parser.ts      # raw → GateDefinition[] + GateGraph 検証
└── application/services/
    └── story-annotation-verifier.ts           # L2-002 呼び出しラッパー（phase-dependency-model 側）

scripts/harness/__tests__/unit/phase-dependency-model/
├── picomatch-glob-matcher.test.ts
└── custom-gates-config-parser.test.ts

scripts/harness/__tests__/integration/phase-dependency-model/
├── ajv-phase-dependencies-gates.integration.test.ts
├── resolve-gate-usecase-story-annotation.integration.test.ts
└── composition-root-custom-preset.integration.test.ts
```

### 修正

```
scripts/harness/config-foundation/infrastructure/schemas/harness-config-v2.schema.json
  - phaseDependencies.properties.gates[] を追加（§5.2 準拠）
  - storyAnnotation は Level 3 制約（if/then もしくは allOf）

scripts/harness/phase-dependency-model/composition-root.ts
  - InMemoryGlobMatcher → PicomatchGlobMatcher 置換
  - rawCustomGates.map(fromRaw) → CustomGatesConfigParser.parse(rawCustomGates) 置換
  - StoryAnnotationVerifier を ResolveGateUseCase に配線（必要時のみ）

scripts/harness/phase-dependency-model/application/usecases/resolve-gate-usecase.ts
  - storyAnnotation 経路を追加（storyAnnotation.required=true のゲートがマッチした場合、verifier 呼び出し）

package.json
  - dependencies に picomatch を明示追加（transitive ではなく direct）
```

### 削除
```
scripts/harness/phase-dependency-model/infrastructure/adapters/in-memory-glob-matcher.ts
  - PicomatchGlobMatcher に置換後、テストと合わせて削除
```

---

## 5. 環境検証チェックリスト

- [ ] `npm run test` が既存テスト全件パス（ベースライン確認）
- [ ] `npx phasegate lint` パス
- [ ] `npx phasegate validate --layer L2` パス（本フェーズで発火する範囲）
- [ ] TypeScript コンパイル（新規ファイル起因エラーゼロ）
- [ ] `package.json` picomatch バージョン整合性

事前実行結果: **実装開始時に codex 側で実施**

---

## 6. QA（不明点・確認事項）

### [Question] Q1: picomatch の依存種別

`dependencies` / `devDependencies` / `peerDependencies` のどれに入れるか。

**推奨案**: **`dependencies`**。本番実行時（`npx phasegate` CLI 経由）に必須。v4.0.4 を明示バージョン指定し、transitive 依存に頼らない。`@types/picomatch` は `devDependencies`。

[Answer] （未回答）

---

### [Question] Q2: JSON Schema `gates[]` の配置

`harness-config-v2.schema.json` の `phaseDependencies.properties` に直接追加するか、別ファイル（`phase-gates.schema.json`）に分離して `$ref` するか。

**推奨案**: **直接追加**。既存スキーマの拡張として最小変更で完結。`storyReflection` も既に同じ位置に入っており、構成的にも自然。分離は schema が 500 行を超えてから検討。

[Answer] （未回答）

---

### [Question] Q3: `CustomGatesConfigParser` の責務境界

Parser は (a) AJV 検証済みの raw 配列を受け取り `GateDefinition[]` を返すだけにするか、(b) 自前で AJV を呼び検証から実施するか。

**推奨案**: **(a) AJV 検証は上位（config-foundation の `AjvConfigSchemaValidator`）に任せ、Parser は `GateDefinition.fromRaw` + `GateGraph.build` のみ実施**。責務分離の原則 + config-foundation の既存検証パスに自然に乗る。Parser 内では `InvalidGateDefinitionError` / `GateGraphValidationError` を throw し、呼び出し側（composition-root）でキャッチして起動エラーに変換。

[Answer] （未回答）

---

### [Question] Q4: storyAnnotation 検証の実装経路

B-2/B-3 時点では `storyAnnotation` は GateDefinition に保持されるだけで実検証は未実装。L2-002 (`ValidateDesignStoryAnnotationsUseCase`) は `traceability-model` Unit に存在する。統合方式は？

- (a) `ResolveGateUseCase` が直接 `traceability-model` の UseCase を呼ぶ（横断依存）
- (b) `phase-dependency-model` 側に薄い port (`StoryAnnotationVerifierPort`) を作り、composition-root で `traceability-model` の UseCase をアダプタ化して注入
- (c) L2-002 の検証ロジックのみを `shared-kernel` に抽出し、両 Unit から参照

**推奨案**: **(b) Port + Adapter**。理由:
- Clean Architecture の依存方向を守れる（`phase-dependency-model` の Application/Domain は外部 Unit を知らない）
- composition-root で両 Unit を組み合わせるのが自然
- shared-kernel 抽出は B-4 のスコープを超える（将来 B-6 以降で必要なら実施）

[Answer] （未回答）

---

### [Question] Q5: storyAnnotation 欠落時の扱い

`storyAnnotation.required=true` のゲートで Write 対象ファイルに `@story-id` が無い場合、`blockers` に入れるか `warnings` に入れるか。

**推奨案**: **`blockers`**。計画書 §5.2 の `required: true` 意味論に準拠（= ゲート通過不可）。`required: false` の場合は `warnings`。これは B-3 の requires 欠損ポリシーと完全に一致。

[Answer] （未回答）

---

### [Question] Q6: `InMemoryGlobMatcher` の扱い

B-3 で暫定用に作成した `InMemoryGlobMatcher` を削除するか残すか。

**推奨案**: **削除**。picomatch 版に完全置換し、テストも削除。暫定実装として残しておく理由はない（後からユースケース別に実装を切り替える必要が出たら、その時点で復活させればよい）。

[Answer] （未回答）

---

### [Question] Q7: AJV 検証エラー時の起動挙動

config に不正な `gates[]` が含まれていた場合、phasegate CLI はどう振る舞うべきか。

- (a) 起動時に例外を throw して即座に exit 1（fail-fast）
- (b) 警告を出しつつ `default` プリセットにフォールバック

**推奨案**: **(a) fail-fast**。config 不整合は設定ミスであり、黙って別プリセットで動くと予期せぬブロック/スキップが発生し debug が困難になる。エラーメッセージに違反内容を全て列挙（`GateGraphValidationError` の `violations[]` を活用）。

[Answer] （未回答）

---

## 7. 前提条件・リスク

### 前提条件
- B-2 / B-3 が main にマージ済み（v0.21.0 時点で完了）
- `GateDefinition.fromRaw` / `GateGraph.build` が完成している（B-2）
- `ResolveGateUseCase` の I/O 契約が確定している（B-3）

### リスク
| リスク | 軽減策 |
|--------|--------|
| picomatch のパターン仕様が `InMemoryGlobMatcher` と微妙に異なり、既存 B-3 テストが落ちる | B-3 の test fixture は picomatch 互換パターンのみ使用していることを事前確認。差分があれば test を picomatch 仕様に修正 |
| AJV Schema 拡張による既存 config 互換性破壊 | 既存 config は `gates[]` を持たないため、`gates` を optional として追加すれば後方互換 |
| Port/Adapter 経由の横断依存による composition-root 肥大化 | `StoryAnnotationVerifierAdapter` を別ファイルに切り出す |
| storyAnnotation 検証のパフォーマンス（Write のたびに L2-002 実行） | L2-002 は単一ファイル検証なので low cost。必要なら結果キャッシュを将来追加 |

---

## 8. Phase 2 実行時の codex プロンプト骨子

```
configurable_phase_gate_plan Phase B-4 を TDD で実装せよ（RED → GREEN → REFACTOR）。

## 参照文書（必読）
- docs/inception/_shared/configurable_phase_gate_b4_tdd_plan.md（本計画）
- docs/inception/_shared/configurable_phase_gate_plan.md §5, §B-4

## 実装対象 Unit
- phase-dependency-model（主）
- config-foundation（従: JSON Schema 拡張のみ）

## 編集対象ディレクトリ（これ以外は編集禁止）
- scripts/harness/phase-dependency-model/infrastructure/adapters/picomatch-glob-matcher.ts（新規）
- scripts/harness/phase-dependency-model/infrastructure/config/custom-gates-config-parser.ts（新規）
- scripts/harness/phase-dependency-model/application/services/story-annotation-verifier.ts（新規、Adapter 側）
- scripts/harness/phase-dependency-model/domain/ports/story-annotation-verifier-port.ts（新規、Port 定義）
- scripts/harness/phase-dependency-model/application/usecases/resolve-gate-usecase.ts（storyAnnotation 経路追加）
- scripts/harness/phase-dependency-model/composition-root.ts（配線差し替え）
- scripts/harness/phase-dependency-model/infrastructure/adapters/in-memory-glob-matcher.ts（削除）
- scripts/harness/config-foundation/infrastructure/schemas/harness-config-v2.schema.json（gates[] 追加）
- scripts/harness/__tests__/unit/phase-dependency-model/picomatch-glob-matcher.test.ts（新規）
- scripts/harness/__tests__/unit/phase-dependency-model/custom-gates-config-parser.test.ts（新規）
- scripts/harness/__tests__/integration/phase-dependency-model/*.integration.test.ts（新規 3 件）
- package.json（picomatch を dependencies に追加、最小修正）

## 実装順（TDD）
1. picomatch-glob-matcher.test.ts で RED、picomatch-glob-matcher.ts で GREEN
2. InMemoryGlobMatcher を削除、composition-root を PicomatchGlobMatcher に差し替え（既存テスト全件パス確認）
3. custom-gates-config-parser.test.ts で RED、custom-gates-config-parser.ts で GREEN
4. harness-config-v2.schema.json に gates[] 追加、ajv-phase-dependencies-gates.integration.test.ts で通過確認
5. StoryAnnotationVerifierPort 定義 + Adapter 実装（traceability-model の L2-002 を呼ぶ）
6. ResolveGateUseCase に storyAnnotation 経路追加、resolve-gate-usecase-story-annotation.integration.test.ts で RED → GREEN
7. composition-root に verifier 配線、composition-root-custom-preset.integration.test.ts で一気通貫確認
8. package.json に picomatch を dependencies 追加

## QA 決定事項（Q1〜Q7）
- Q1: picomatch は dependencies、@types/picomatch は devDependencies
- Q2: gates[] は harness-config-v2.schema.json の phaseDependencies に直接追加
- Q3: CustomGatesConfigParser は AJV 検証済み raw を受けて GateDefinition[] を返す（AJV は config-foundation に委譲）
- Q4: StoryAnnotationVerifierPort + Adapter パターン（traceability-model の UseCase を composition-root で注入）
- Q5: storyAnnotation 欠落は required=true → blockers、required=false → warnings
- Q6: InMemoryGlobMatcher は削除
- Q7: AJV/DAG 検証エラーは起動時 fail-fast（全違反列挙）

## 制約
- 全新規ファイルに // @unit {unit名} と // @layer {layer名} メタデータ必須
- テストケース名は日本語、AAA パターン、Vitest、ドメイン層モック禁止
- Clean Architecture 依存方向維持（domain は外部依存なし、application → infrastructure）
- package.json の picomatch 追加以外の編集禁止
- docs/ 以下の編集禁止（本計画ファイル以外）
- domain 層の既存ファイル変更禁止（ports 新規追加のみ許可）

## 完了条件
- npm run test 全件パス（既存 2973 + 新規 ≒ 15 件以上）
- npx phasegate lint パス（新規違反ゼロ）
- 既存テストのリグレッションなし
- tsc --noEmit が新規ファイル起因エラーゼロ
- package.json version 更新は **禁止**（v0.22.0 はレビュー後に手動で bump）
```

---

## 9. Phase 1 完了条件

- [x] 計画ファイルを出力（本ファイル）
- [x] 環境検証チェックリスト記載（事前実行は Phase 2 冒頭で）
- [x] QA セクションに Q1〜Q7 を記載し推奨案を提示
- [ ] **人間の承認待ち** ← ここで止まる
- [ ] 実装コードはまだ書いていない ✅

---

## 10. 次のアクション

ユーザーが本計画を承認した場合、以下を実施:

1. §8 の codex プロンプトで Codex CLI に TDD 実装を委任
2. 実装完了後、Claude Code（メインセッション）がレビュー
3. レビュー通過後、TaskList の B-4 を `completed` にマーク、計画書の B-4-1/2/3 を `[x]` に更新
4. v0.22.0 に bump + commit + tag
5. 次のフェーズ B-5（テスト）へ

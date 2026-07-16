# Phasegate v1 — ユーザーストーリー一覧

@story-id H02-04
@story-id H03-04
@story-id H03-05
@story-id H13-05
@work-item-id WI-126
@work-item-id WI-285
@work-item-id WI-301
更新: H02-04（ISSUE-026 Phase A-1 / `@work-item-id` アノテーション併存対応）、H03-04（Phase A-2 / WI frontmatter parser）、H03-05（Phase A-3 / L2 validator 統合）、H13-05（OSS license 変更 Apache-2.0 → MIT, v0.111.0）を追加。
WI-126 で WI status derivation / safe apply を追加し、`status: drafted | reflected | implemented | tested` を PhaseGate が成果物から更新する運用契約を具体化する。

> **ステータス**: Phase 2（実行）— codex 1stレビュー済み・指摘反映済み
> **作成日**: 2026-03-12
> **入力**: `docs/inception/_shared/story_writer_plan.md`（Phase 1計画・承認済み）
> **プロダクト概要**: `docs/product/harness_product_overview.md`
> **合計**: 18 Epic / 89 ストーリー（v1: 84, Future: 5）
> **レビュー**: codex (gpt-5.4) 1stレビュー済み — 指摘事項反映済み

---

## Epic一覧

| Epic ID | Epic名 | US数 | Wave |
|---------|--------|------|------|
| H-01 | Biome AST解析基盤 | 3 | 1 |
| H-02 | Phase Dependency Model | 7 | 1 |
| H-03 | Traceability Model | 8 | 1 |
| H-04 | phasegate.config.json v2 | 3 | 1 |
| H-05 | ADR基盤 | 3 | 1 |
| H-06 | HarnessError体系 | 3 | 1 |
| H-07 | Nyquist検証層 | 4 | 2 |
| H-08 | L2-L4バリデータ体系 | 6 | 2 |
| H-09 | Harness API | 4 | 2 |
| H-10 | Quick Mode | 5 | 2 |
| H-11 | エージェント統合オプション | 5 | 2 |
| H-12 | スキル品質強化 | 7 | 3 |
| H-13 | Scheduled Governance & CI/CDテンプレート | 4 | 3 |
| H-14 | K1-K15回帰保証 | 3 | 3 |
| H-15 | v0テスト資産移行 | 2 | 3 |
| H-16 | Signed Attestation | 3 | 3 |
| H-17 | World Model | 15 | 4 |
| H-F2 | Phase 2拡張 | 5 | Future |

---

## Wave 1: 基盤構築（H-01〜H-06 / 27 US）

---

## H-01: Biome AST解析基盤

### H01-01: v0コア4ルールのBiomeプラグイン移植

**Epic**: H-01 Biome AST解析基盤
**旧US**: US-036
**優先度**: Must

**As a** ハーネス開発者,
**I want to** v0の4カスタムESLintルール（require-unit-comment, require-layer-comment, no-layer-violation, enforce-folder-structure）をBiomeプラグインとして移植したい,
**so that** Biomeネイティブ環境でv0と同等のアーキテクチャ強制力を維持し、Rust製の高速AST解析によるエディタ保存時フィードバックを実現できる。

#### 受け入れ基準

- [ ] AC-1: `require-unit-comment`ルールがBiomeプラグインとして実装され、`// @unit`コメントのないソースファイルを検出する
- [ ] AC-2: `require-layer-comment`ルールがBiomeプラグインとして実装され、`// @layer`コメントのないソースファイルを検出する
- [ ] AC-3: `no-layer-violation`ルールがBiomeプラグインとして実装され、レイヤー境界を越えるimport（domain→infrastructure等）をAST解析で検出する
- [ ] AC-4: `enforce-folder-structure`ルールがBiomeプラグインとして実装され、アーキテクチャに違反するファイル配置を検出する
- [ ] AC-5: 各プラグインにv0 ESLintルールと同等のテストケースが存在し、同一の検出精度を保証する
- [ ] AC-6: @unit/@layerメタデータの付与漏れがv0と同等の精度で検出される（K3.5維持保証）
- [ ] AC-7: `no-layer-violation`ルールにimportグラフの循環依存検出が含まれ、循環importをHarnessError（L1-003）として報告する

#### 対応非交渉要件
K3（Biome AST解析 — importグラフ解析+循環依存検出）, K3.5（@unit/@layerメタデータ）

---

### H01-02: AI生成コードアンチパターン検出ルール

**Epic**: H-01 Biome AST解析基盤
**旧US**: US-038
**優先度**: Must

**As a** ハーネス開発者,
**I want to** AI生成コード特有のアンチパターンを検出するBiomeルール4種（no-any-abuse, no-code-duplication, no-ghost-file, no-comment-flood）を実装したい,
**so that** AIエージェントが生成しがちな品質劣化パターンをエディタ保存時に即座に検出し、コード品質を維持できる。

#### 受け入れ基準

- [ ] AC-1: `no-any-abuse`ルールが実装され、`any`型の過剰使用（AI生成コードの典型的アンチパターン）を検出する
- [ ] AC-2: `no-code-duplication`ルールが実装され、構造的に重複するコードブロックを検出する
- [ ] AC-3: `no-ghost-file`ルールが実装され、どこからもimportされないファイルを検出する
- [ ] AC-4: `no-comment-flood`ルールが実装され、過剰なコメント（AIが生成しがちな冗長コメント）を検出する
- [ ] AC-5: 各ルールのHarnessErrorコード（L1-005〜L1-008）が定義され、統一フォーマットに準拠する

---

### H01-03: CIパイプラインBiome統合（ESLint完全除去）

**Epic**: H-01 Biome AST解析基盤
**旧US**: US-039
**優先度**: Must

**As a** ハーネス開発者,
**I want to** CIパイプラインでBiomeを使用して全L1チェックを実行し、ESLint関連の設定・依存を完全に除去したい,
**so that** CI/CDでもBiomeベースの品質チェックが一貫して適用され、ESLint依存が排除される。

#### 受け入れ基準

- [ ] AC-1: CIパイプライン（aidlc-gate.yml相当）でBiomeによるリント+フォーマットチェックが実行される
- [ ] AC-2: H01-01の4カスタムルール+H01-02の4アンチパターンルールがCIで実行される
- [ ] AC-3: ESLint関連の設定ファイル（.eslintrc*, eslint.config.*）・依存パッケージがプロジェクトから完全除去されている
- [ ] AC-4: CI失敗時のエラー出力がHarnessError形式（code/severity/message/suggestion）に準拠している

#### 対応非交渉要件
K3（Biome AST解析）

---

## H-02: Phase Dependency Model

### H02-01: 3層フェーズ構造定義 + phase-gateバリデータ拡張

**Epic**: H-02 Phase Dependency Model
**旧US**: 新規（K14）
**優先度**: Must

**As a** 品質管理者,
**I want to** Phase Dependency Modelの3層フェーズ構造（Level 1: Product全体設計 / Level 2: Unit横断設計 / Level 3: ストーリー実装）を定義し、phase-gateバリデータをレベル間依存検証に拡張したい,
**so that** 設計→設計および設計→実装の順序が機械的に強制され、上位設計なしの下位設計・実装を物理的に拒否できる。

#### 受け入れ基準

- [ ] AC-1: 3層フェーズ構造（Level 1/2/3）が定義され、各レベルのフェーズと成果物がドキュメント化されている
- [ ] AC-2: phase-gateバリデータがLevel間の依存違反を検出する（Level 2の前提なしにLevel 3開始を拒否）
- [ ] AC-3: phase-gateバリデータがLevel内の上流設計なしの下流設計生成を拒否する
- [ ] AC-4: phase-gateバリデータが設計文書・plan文書なしの実装コード変更を拒否する
- [ ] AC-5: Level間依存の緩和が不可であること（カスタマイズによるLevel間依存削除を拒否）を検証するテストが存在する

#### 対応非交渉要件
K2（Phase Gate）, K14（Phase Dependency Model）

---

### H02-02: Planning Mode（interactive/embedded-qa）+ plan文書必須生成

**Epic**: H-02 Phase Dependency Model
**旧US**: 新規（K15）
**優先度**: Must

**As a** 品質管理者,
**I want to** 2つのPlanning Mode（interactive/embedded-qa）を定義し、どちらのモードでもPhase 1完了時に`inception/`配下に`*_plan.md`が必須生成されるようにしたい,
**so that** 設計判断の根拠（QAセクション）がplan文書内にトレーサブルに保持され、セッションが失われても設計意図が残る。

#### 受け入れ基準

- [ ] AC-1: interactiveモード（AIが対話的にヒアリング→plan文書生成）が定義されている
- [ ] AC-2: embedded-qaモード（テンプレートのQAセクションに人間が回答→AIが計画完成）が定義されている
- [ ] AC-3: 両モードとも最終成果物として3層構造に応じた`inception/`配下に`*_plan.md`を生成する
- [ ] AC-4: phase-gateバリデータがplan文書のファイル存在でPhase 1完了を検証する（plan文書なしのPhase 2移行を拒否）
- [ ] AC-5: plan文書にQAセクション（設計判断の根拠）が含まれることを検証するテストが存在する

#### 対応非交渉要件
K6（2-Phase Execution）, K15（Plan文書の必須生成）

---

### H02-03: Phase Dependencyカスタマイズ

**Epic**: H-02 Phase Dependency Model
**旧US**: 新規
**優先度**: Should

**As a** ハーネス管理者,
**I want to** phasegate.config.jsonの`phaseDependencies`セクションでフェーズ依存のカスタマイズ（依存の追加・緩和）を設定したい,
**so that** PJ固有の事情（既存システムへの段階導入、特定フェーズの省略等）に対応できる。

#### 受け入れ基準

- [ ] AC-1: phasegate.config.jsonに`phaseDependencies`セクション（preset/override/customRules）が追加されている
- [ ] AC-2: デフォルトフローへの依存追加（強化）が`customRules`で設定可能である
- [ ] AC-3: デフォルトフローからの依存削除（緩和）には`override: true`の明示が必要である
- [ ] AC-4: `story-implementor`前のテスト設計フェーズ存在が緩和不可である（TDD最低保証）
- [ ] AC-5: Level間依存（Level 2→Level 1、Level 3→Level 2）が緩和不可である

---

### H02-04: `@work-item-id` アノテーション併存対応（ISSUE-026 Phase A-1）

**Epic**: H-02 Phase Dependency Model
**旧US**: 新規（ISSUE-026 Phase A の分割）
**優先度**: Must

**As a** PhaseGate 開発者,
**I want to** `FileSystemStoryReflectionAdapter` の annotation parser を拡張し、既存の `@story-id` に加えて `@issue-id` / `@work-item-id` を同一の統一規約で認識できるようにしたい,
**so that** ISSUE-026 で採用した work item 一本化（WI-XXX）への段階移行が、既存 `@story-id` の互換性を壊さず進められる。

#### 受け入れ基準

- [ ] AC-1: `FileSystemStoryReflectionAdapter#fileContainsStoryAnnotation` が `@story-id` / `@issue-id` / `@work-item-id` いずれのアノテーションでも、指定 ID を検出できる
- [ ] AC-2: いずれのアノテーションでもカンマ/空白区切りの複数 ID を検出できる
- [ ] AC-3: HTML コメント（`<!-- @work-item-id WI-001 -->`）形式でも検出できる
- [ ] AC-4: 既存 `@story-id` のユニットテストが全て green のまま保たれる
- [ ] AC-5: 新規 `@work-item-id` / `@issue-id` に対するユニットテストが `unit_test_design.md` に追加されている
- [ ] AC-6: `StoryReflectionFileSystemPort#fileContainsStoryAnnotation` の signature は据え置き（振る舞いのみ拡張・後方互換）

#### 対応非交渉要件
K3.5（@unit/@layer/@story-id メタデータ）— `@story-id` 統一規約の軸に `@issue-id` / `@work-item-id` を加える

---

### H02-05: WI-aware story reflection listing（ISSUE-026 Phase C-1）

**Epic**: H-02 Phase Dependency Model
**旧US**: 新規（ISSUE-026 Phase C-1 の分割）
**優先度**: Must

**As a** PhaseGate 開発者,
**I want to** story reflection が `docs/inception/{unit}/WI-*` と `docs/inception/_cross/WI-*` を列挙対象に含めるようにしたい,
**so that** Phase B で移行した WI layout を gate logic refresh の対象にできる。

#### 受け入れ基準

- [ ] AC-1: `docs/inception/{unit}/WI-*` が story reflection 候補として列挙される
- [ ] AC-2: legacy `docs/inception/{unit}/{HXX-XX}` / `US-*` は移行期間中も列挙される
- [ ] AC-3: `docs/inception/_cross/WI-*` が story reflection 候補として列挙される
- [ ] AC-4: `docs/inception/{unit}/issues` は列挙されない
- [ ] AC-5: `docs/inception/_cross` の非WIディレクトリは列挙されない

#### 対応非交渉要件
K3.5（@unit/@layer/@story-id メタデータ）— WI layout を reflection gate の入力に乗せる

---

### H02-06: WI frontmatter affects-aware story reflection（ISSUE-026 Phase C-3）

**Epic**: H-02 Phase Dependency Model
**旧US**: 新規（ISSUE-026 Phase C-3 の分割）
**優先度**: Must

**As a** PhaseGate 開発者,
**I want to** story reflection が `_cross/WI-*` のfrontmatter `affects` を読んで対象Unitだけを検査できるようにしたい,
**so that** 横断WIを全Unitへ過剰適用せず、実際に影響するUnitのproduct反映だけをゲートできる。

#### 受け入れ基準

- [ ] AC-1: `_cross/WI-*` のinception pathは `docs/inception/_cross/{WI}/...` として解決される
- [ ] AC-2: `affects` に対象Unitが含まれる場合、reflection検査対象になる
- [ ] AC-3: `affects` に対象Unitが含まれない場合、reflection検査対象から除外される
- [ ] AC-4: frontmatterが読めない場合は既存互換として対象に含める

#### 対応非交渉要件
K3.5（@unit/@layer/@story-id メタデータ）— WI frontmatter を reflection gate の対象解決に利用する

---

### H02-07: WI annotation legacy compatibility（ISSUE-026 Phase C-4）

**Epic**: H-02 Phase Dependency Model
**旧US**: 新規（ISSUE-026 Phase C-4 の分割）
**優先度**: Must

**As a** PhaseGate 開発者,
**I want to** `legacy_id` を持つ `WI-*` が旧 `@issue-id ISSUE-*` のproduct反映を移行互換として認識できるようにしたい,
**so that** Phase Bで移行された既存issueが、product文書のannotationを一斉更新しなくても段階的にWI運用へ移行できる。

#### 受け入れ基準

- [ ] AC-1: product文書の `@work-item-id WI-XXX` は直接検出される
- [ ] AC-2: `_cross/WI-XXX/description.md` に `legacy_id: ISSUE-XXX` がある場合、product文書の `@issue-id ISSUE-XXX` が `WI-XXX` の反映として扱われる
- [ ] AC-3: `legacy_id` がない場合、旧IDだけではWI反映として扱われない
- [ ] AC-4: 既存 `@story-id` / `@issue-id` の直接検出は後方互換で維持される

#### 対応非交渉要件
K3.5（@unit/@layer/@story-id メタデータ）— legacy annotation と WI annotation の段階移行互換

---

## H-03: Traceability Model

### H03-01: @unit/@layerメタデータ体系 + L2 metadataバリデータ基本実装

**Epic**: H-03 Traceability Model
**旧US**: 新規（K3.5）
**優先度**: Must

**As a** 品質管理者,
**I want to** 実装ファイルに`@unit`/`@layer`メタデータを必須化し、L2 metadataバリデータでUnit名整合・Layer名整合を検証したい,
**so that** 実装コードとUnit/Layerの帰属が決定論的に導出でき、トレーサビリティの基盤が確立される。

#### 受け入れ基準

- [ ] AC-1: 実装ファイルに`// @unit {unit_name}`コメントが必須であり、L1 `require-unit-comment`で存在チェックされる
- [ ] AC-2: 実装ファイルに`// @layer {layer_name}`コメントが必須であり、L1 `require-layer-comment`で存在チェックされる
- [ ] AC-3: L2 metadataバリデータが`@unit`値と`product/units/{unit_name}.md`の定義名の一致を検証する
- [ ] AC-4: L2 metadataバリデータが`@layer`値が有効なレイヤー名（domain/application/infrastructure/presentation）であることを検証する
- [ ] AC-5: Unit名不一致・Layer名不正の場合、HarnessError（L2-002）が出力される

#### 対応非交渉要件
K3.5（@unit/@layer/@story-idメタデータ）

---

### H03-02: @story-idメタデータ + 設計文書累積更新時の付与検証

**Epic**: H-03 Traceability Model
**旧US**: 新規
**優先度**: Must

**As a** 品質管理者,
**I want to** 設計文書（`product/construction/{unit}/`配下）の累積更新時に`@story-id HXX-XX`アノテーションの付与を検証したい,
**so that** 設計文書の各要素がどのストーリーの意図から追加・変更されたかをトレースできる。

#### 受け入れ基準

- [ ] AC-1: `product/construction/{unit}/`配下のドキュメント更新時、更新箇所に`@story-id HXX-XX`が付与されていることをL2 metadataバリデータが検証する
- [ ] AC-2: `@story-id`が参照するストーリーIDが`product/user_stories.md`に存在することを検証する
- [ ] AC-3: 初回のUnit横断設計（Level 2）で作成された内容にはストーリー注釈不要であることをバリデータが許容する
- [ ] AC-4: `@story-id HXX-XX`は設計要素の直前に独立行として記載されることを検証する
- [ ] AC-5: @story-id欠落時のHarnessError（L2-002拡張）にfix_exampleが含まれる

---

### H03-03: @storyメタデータ + 逆引きチェーン全体検証

**Epic**: H-03 Traceability Model
**旧US**: 新規
**優先度**: Must

**As a** 品質管理者,
**I want to** テストファイルに`@story`メタデータを必須化し、実装→Unit→設計→US→計画の逆引きチェーン全体を検証したい,
**so that** 任意の実装ファイルから設計意図・USの意思決定根拠まで決定論的に辿れることが保証される。

#### 受け入れ基準

- [ ] AC-1: テストファイルに`// @story HXX-XX`コメントが必須であり、L2 metadataバリデータで検証される
- [ ] AC-2: `@story`が参照するUS IDが`product/user_stories.md`に存在することを検証する
- [ ] AC-3: 逆引きチェーン（実装→@unit→product/construction/{unit}/→@story-id HXX-XX→inception/{unit}/{HXX-XX}/）の各リンクが存在することを検証するテストが存在する
- [ ] AC-4: L3 nyquistバリデータが`@story`メタデータを入力としてUS-テスト間のトレーサビリティを検証する
- [ ] AC-5: @story欠落時のHarnessError（L2-002拡張）にfix_exampleが含まれる

---

### H03-05: WorkItem frontmatter の L2 metadata validator 統合（ISSUE-026 Phase A-3）

**Epic**: H-03 Traceability Model
**旧US**: 新規（ISSUE-026 Phase A-3 の最小統合）
**優先度**: Must

**As a** PhaseGate 開発者,
**I want to** `parseWorkItemFrontmatter` を L2 metadata validator の設計文書検証フローに統合し、壊れた WI frontmatter を commit 前に検出したい,
**so that** Phase B（migration）で WI frontmatter を実装文書へ本格導入する前に、malformed frontmatter が CI・commit を通過するリスクを除去できる。

#### 受け入れ基準

- [ ] AC-1: `DesignDocumentPort` に `readWorkItemFrontmatter(filePath): Promise<WorkItemFrontmatter | null>` が optional member として追加される
- [ ] AC-2: `MarkdownDesignDocumentGateway` が `readWorkItemFrontmatter` を実装し、有効 frontmatter は `WorkItemFrontmatter`、不在は `null` を返す
- [ ] AC-3: invalid frontmatter（enum 違反・id 形式違反等）では `WorkItemFrontmatterValidationError` が gateway からそのまま throw される
- [ ] AC-4: `ValidateDesignStoryAnnotationsUseCase` が `readWorkItemFrontmatter` を呼び、throw されたエラーを `L2-002` の `MetadataValidationOutput.errors` に変換する
- [ ] AC-5: frontmatter 不在 (`null`) の文書は validator 上追加違反を発生させない（後方互換）
- [ ] AC-6: 有効 frontmatter の文書は validator 上追加違反を発生させない
- [ ] AC-7: 既存 `readFrontmatterFlags` / `readStoryAnnotations` の挙動は無変更（既存テスト無変更で green）
- [ ] AC-8: 新テスト（UT-TM-WV01〜WV04）が追加される

#### 対応非交渉要件
K3.5（@unit/@layer/@story-id メタデータ）— WI frontmatter の well-formed 検証を L2 に統合

---

### H03-06: WorkItem 物理レイアウト移行 dry-run（ISSUE-026 Phase B-1）

**Epic**: H-03 Traceability Model
**旧US**: 新規（ISSUE-026 Phase B-1 の安全な移行計画）
**優先度**: Must

**As a** PhaseGate 開発者,
**I want to** 旧 issue レイアウトから WI レイアウトへの移行計画を dry-run で生成したい,
**so that** 実ファイル移動の前に移動元・移動先・legacy_id・衝突を確認し、進行中作業やリンクを壊さず Phase B を開始できる。

#### 受け入れ基準

- [ ] AC-1: `docs/inception/issues/{ISSUE-XXX}` が `docs/inception/_cross/{WI-XXX}` への候補として列挙される
- [ ] AC-2: `docs/inception/{unit}/issues/{ISSUE-XXX}` が `docs/inception/{unit}/{WI-XXX}` への候補として列挙される
- [ ] AC-3: `ISSUE-026` から `WI-026` を導出し、`legacy_id: ISSUE-026` の追記計画を返す
- [ ] AC-4: 移動先が既に存在する場合は candidate に `conflict: true` が設定される
- [ ] AC-5: dry-run ではファイルシステムを書き換えない
- [ ] AC-6: cross-unit issue では旧文書の「影響Unit」行から `affects` 候補を抽出し、抽出不能なら warning を返す

#### 対応非交渉要件
K3.5（@unit/@layer/@story-id メタデータ）— WI frontmatter と legacy_id による traceability migration の基盤

---

### H03-07: WorkItem migration CLI dry-run（ISSUE-026 Phase B-2）

**Epic**: H-03 Traceability Model
**旧US**: 新規（ISSUE-026 Phase B-2 の CLI 接続）
**優先度**: Must

**As a** PhaseGate 開発者,
**I want to** `phasegate migrate work-items --dry-run` で WI 移行計画を確認したい,
**so that** 実ファイル移動前に source / target / conflict / warning をレビューし、既存の config schema migration を壊さず Phase B を進められる。

#### 受け入れ基準

- [ ] AC-1: `phasegate migrate work-items --dry-run` が WorkItem migration plan を表示する
- [ ] AC-2: `--json` 指定時は `{ candidates, warnings }` を JSON で出力する
- [ ] AC-3: human 出力では source path、target path、legacy id、next id、conflict を確認できる
- [ ] AC-4: conflict が1件以上ある場合は終了コード1を返す
- [ ] AC-5: `--dry-run` 未指定または `--apply` 指定時は、ファイルシステムを書き換えず終了コード2を返す
- [ ] AC-6: 既存 `phasegate migrate --schema v3` の config schema migration は従来通り動作する

#### 対応非交渉要件
K3.5（@unit/@layer/@story-id メタデータ）— WI migration の実行前レビュー経路

---

### H03-08: WorkItem migration apply（ISSUE-026 Phase B-3）

**Epic**: H-03 Traceability Model
**旧US**: 新規（ISSUE-026 Phase B-3 の実移行）
**優先度**: Must

**As a** PhaseGate 開発者,
**I want to** `phasegate migrate work-items --apply` で旧 issue レイアウトを WI レイアウトへ安全に移行したい,
**so that** `docs/inception/issues/` と `{unit}/issues/` を廃止し、後続の gate logic refresh を単一の work item 構造に対して実装できる。

#### 受け入れ基準

- [ ] AC-1: `phasegate migrate work-items --apply` が旧 issue ディレクトリを target WI ディレクトリへ移動する
- [ ] AC-2: `issue_description.md` は `description.md` に rename され、WI frontmatter が先頭に付与される
- [ ] AC-3: 既に `description.md` の旧issueは同ファイルにWI frontmatterが付与される
- [ ] AC-4: `logical_design.md` 等の付随ファイルは target directory に保持される
- [ ] AC-5: plan に conflict が1件でもある場合は、ファイルシステムを書き換えず終了コード1を返す
- [ ] AC-6: `--apply --dry-run` の同時指定は拒否し、ファイルシステムを書き換えない

#### 対応非交渉要件
K3.5（@unit/@layer/@story-id メタデータ）— WI physical layout migration

---

### H03-04: WorkItem frontmatter parser 追加（ISSUE-026 Phase A-2）

**Epic**: H-03 Traceability Model
**旧US**: 新規（ISSUE-026 Phase A-2 の分割）
**優先度**: Must

**As a** PhaseGate 開発者,
**I want to** 設計文書先頭の YAML frontmatter から WorkItem メタデータ（`id` / `type` / `affects` / `severity` / `status` / `source` / `legacy_id`）を抽出する専用 parser を traceability-model に追加したい,
**so that** ISSUE-026 で採用した work item 一本化（WI-XXX）の識別と type 別振る舞いの基盤を、既存 `parseFrontmatterFlags` を破壊せずに整備できる。

#### 受け入れ基準

- [ ] AC-1: `parseWorkItemFrontmatter(content: string): WorkItemFrontmatter | null` が実装され、frontmatter 不在時は `null` を返す
- [ ] AC-2: `id` は `WI-\d+` / `H\d{2}-\d{2}` / `HF\d+-\d{2}` / `ISSUE-\d+` のいずれかに合致することを検証する
- [ ] AC-3: `type` は `story | issue | fix | refactor | chore` の enum に制限される
- [ ] AC-4: `affects` は省略可能、`string[]`（Unit 名リスト）として受け取る
- [ ] AC-5: `severity` は `trivial | normal | high` の省略可能 enum
- [ ] AC-6: `status` は `drafted | reflected | implemented | tested` の省略可能 enum
- [ ] AC-7: `source` / `legacy_id` は任意の string（値検証なし）
- [ ] AC-8: 型不正・enum 違反時は `WorkItemFrontmatterValidationError` を throw する
- [ ] AC-9: 既存 `parseFrontmatterFlags` の挙動は無変更（後方互換）
- [ ] AC-10: L2 metadata validator との統合は本ストーリー非対象（別 US で実施）

#### 対応非交渉要件
K3.5（@unit/@layer/@story-id メタデータ）— 設計文書 frontmatter への WI メタデータ表現を追加

---

## H-04: phasegate.config.json v2

### H04-01: phasegate.config.json v2スキーマ定義

**Epic**: H-04 phasegate.config.json v2
**旧US**: US-029改修
**優先度**: Must

**As a** ハーネス管理者,
**I want to** phasegate.config.json v2のスキーマ（project/layers/quickMode/phaseDependencies/planningMode/paths/reporting/harnesses）を定義したい,
**so that** 品質設定のSingle Source of Truthが確立され、全バリデータが統一的に設定を参照できる。

#### 受け入れ基準

- [ ] AC-1: phasegate.config.json v2のJSONスキーマが定義され、`project`/`layers`/`quickMode`/`phaseDependencies`/`planningMode`/`paths`/`reporting`/`harnesses`セクションが含まれる
- [ ] AC-2: `layers`セクションでL1-L4の有効/無効・バリデータ構成・閾値が設定可能である
- [ ] AC-3: `quickMode`セクションでallowedCategories/maintainedLayers/relaxedGatesが設定可能である
- [ ] AC-4: JSONスキーマバリデーションが通過するサンプル設定ファイルが作成されている
- [ ] AC-5: 無効なスキーマの設定ファイルに対してバリデーションエラーが検出される

#### 対応非交渉要件
K13（phasegate.config.json）

---

### H04-02: Preset System定義と切替

**Epic**: H-04 phasegate.config.json v2
**旧US**: 新規
**優先度**: Must

**As a** ハーネス利用者,
**I want to** 3つのプリセット（minimal: L1+L2 / standard: L1-L3+90% / strict: L1-L4+95%+bundleSize）を定義し、プリセット名の指定で品質レベルを切り替えたい,
**so that** プロジェクトの成熟度に応じて段階的に品質ゲートを強化でき、Progressive Disclosureが実現される。

#### 受け入れ基準

- [ ] AC-1: `minimal`プリセットがL1+L2のみ有効で定義されている（学習・プロトタイプ向け）
- [ ] AC-2: `standard`プリセットがL1+L2+L3有効・カバレッジ閾値90%で定義されている（通常開発向け）
- [ ] AC-3: `strict`プリセットがL1-L4全有効・カバレッジ閾値95%・bundleSizeLimit・agentLessonCollection・deadCodeGC有効で定義されている（本番向け）
- [ ] AC-4: `project.preset`フィールドの値変更のみでプリセット切替が完了する
- [ ] AC-5: プリセットの個別設定上書き（例: standardだがcoverageThresholdを95%に）が可能である

---

### H04-03: GSD由来品質機能のデフォルト無効化 + phasegate:enable/disable機能切替

**Epic**: H-04 phasegate.config.json v2
**旧US**: US-029一部
**優先度**: Must

**As a** ハーネス利用者,
**I want to** GSD由来の品質機能をデフォルトで無効にし、`phasegate:enable`/`phasegate:disable`コマンドで個別に有効化・無効化したい,
**so that** 既存プロジェクトへの影響なくProgressive adoptionを実現し、Go/No-Go Gate #8（デフォルトOFF）を遵守できる。

#### 受け入れ基準

- [ ] AC-1: phasegate.config.json内のGSD由来品質機能がデフォルトで`enabled: false`である
- [ ] AC-2: `phasegate:enable <feature>`コマンドで個別機能を有効化できる
- [ ] AC-3: `phasegate:disable <feature>`コマンドで個別機能を無効化できる
- [ ] AC-4: `phasegate:enable --list`で有効化/無効化可能な機能名一覧が表示される
- [ ] AC-5: 存在しない機能名が指定された場合、利用可能な機能名一覧を含むエラーメッセージが表示される

---

## H-05: ADR基盤

### H05-01: ADRテンプレート整備 + archgateパターン定義

**Epic**: H-05 ADR基盤
**旧US**: US-020改修
**優先度**: Must

**As a** ハーネス管理者,
**I want to** ADRテンプレートを整備し、archgateパターン（ADRに対応するバリデータ検証パターン）を定義したい,
**so that** 技術的意思決定がADRとして一貫した形式で記録され、HarnessErrorからADRへの参照が可能になる。

#### 受け入れ基準

- [ ] AC-1: `docs/ADR/`にADRテンプレートファイルが作成されている
- [ ] AC-2: テンプレートにタイトル/ステータス/コンテキスト/決定/結果/代替案の構造が含まれている
- [ ] AC-3: テンプレートにフロントマター（YAML形式: title, status, date, adr_id）が含まれ、機械的に解析可能である
- [ ] AC-4: archgateパターン（ADR-XXX → HarnessError codeのマッピング定義方法）が文書化されている

---

### H05-02: 初期ADR作成（§12 Key Decisions全件カバー）

**Epic**: H-05 ADR基盤
**旧US**: US-021改修
**優先度**: Must

**As a** ハーネス管理者,
**I want to** harness_product_overview §12 Key Decisionsの全意思決定をADRとして作成したい,
**so that** パッケージ分離・Biome選定・K全保持・FUSE外出し等の設計判断の根拠が形式知として記録される。

#### 受け入れ基準

- [ ] AC-1: 以下のADRが`docs/ADR/`に作成されている:
  - パッケージ分離（Quality Harness / Orchestration）
  - ESLint→Biome全面移行
  - K1-K13全て品質ハーネス側帰属
  - FUSE Hooks Engineはv1スコープ外
  - HarnessErrorにfix_example必須化
  - Quick Mode適用条件の厳格定義
  - 設定ファイル分離（phasegate.config.json / orchestration.config.json）
  - Nyquist統合（GSD-2 Truths/Artifacts検証パターン）
  - 成果物駆動の状態導出
  - スタック検出（バリデータ無限ループ防止）
  - L0→4層一時定義→5層復帰パス
- [ ] AC-2: 各ADRがH05-01のテンプレート構造に準拠している
- [ ] AC-3: 各ADRのステータスがAccepted（§12でDecided済みのもの）またはProposed（検討中のもの）で設定されている。§12のDecidedはADRではAcceptedにマッピングする
- [ ] AC-4: 各ADRのフロントマターが機械的に解析可能である

---

### H05-03: ADRステータス管理 + フロントマターバリデーション

**Epic**: H-05 ADR基盤
**旧US**: US-022
**優先度**: Must

**As a** ハーネス管理者,
**I want to** ADRにステータス管理（Proposed/Accepted/Deprecated/Superseded）を付与し、フロントマターのバリデーションを実装したい,
**so that** 廃止・置換されたADRを参照するリスクを低減し、ADRの有効性を機械的に判別できる。

#### 受け入れ基準

- [ ] AC-1: 全ADRのフロントマターに`status`フィールドが含まれている
- [ ] AC-2: statusの値がProposed/Accepted/Deprecated/Supersededのいずれかであることをバリデーションで検証する
- [ ] AC-3: Superseded状態のADRには後継ADRへの参照（`superseded_by`フィールド）が含まれている
- [ ] AC-4: フロントマターのバリデーション（statusフィールドの存在・有効値・Superseded時の後継参照）が自動テストで検証される

---

## H-06: HarnessError体系

### H06-01: HarnessError統一フォーマット + 全バリデータへの適用

**Epic**: H-06 HarnessError体系
**旧US**: US-034
**優先度**: Must

**As a** ハーネス開発者,
**I want to** HarnessError統一フォーマット（code/severity/message/suggestion/adr_ref/fix_example）を定義し、全バリデータのエラー出力をこのフォーマットに統一したい,
**so that** AIエージェントがエラーメッセージとfix_exampleを読んで自律的に自己修正でき、Error as Teacher原則が実現される。

#### 受け入れ基準

- [ ] AC-1: HarnessError型が`{code, severity, message, suggestion, adr_ref, fix_example}`で定義されている
- [ ] AC-2: L1-L4全バリデータのエラー出力がHarnessErrorフォーマットに統一されている
- [ ] AC-3: 全バリデータのHarnessErrorに`adr_ref`フィールド（関連ADRへの参照）が付与されている
- [ ] AC-4: 全バリデータのHarnessErrorに`fix_example`フィールド（修正コード例）が付与されている
- [ ] AC-5: HarnessErrorフォーマット準拠を検証する自動テストが存在する

#### 対応非交渉要件
設計哲学: Error as Teacher

---

### H06-02: fix_example品質保証

**Epic**: H-06 HarnessError体系
**旧US**: 新規（codex提案）
**優先度**: Must

**As a** 品質管理者,
**I want to** fix_exampleをテスト資産としてCI検証し、不正な修正例を自動検出したい,
**so that** AIエージェントに提供する修正コード例の品質が劣化せず、自己修正率が維持される。

#### 受け入れ基準

- [ ] AC-1: 全バリデータのfix_exampleがテスト資産として管理されている
- [ ] AC-2: CIパイプラインでfix_exampleの妥当性（適用後にバリデータが通過すること）が検証される
- [ ] AC-3: fix_exampleが構文的に不正な場合、CIが失敗する
- [ ] AC-4: fix_example更新時にバリデーションが自動実行される

---

### H06-03: severity権限契約

**Epic**: H-06 HarnessError体系
**旧US**: 新規（codex提案）
**優先度**: Must

**As a** 品質管理者,
**I want to** HarnessErrorの`severity: "error"`がオーケストレーターによって警告に格下げされないことを検証する契約を定義したい,
**so that** Quality Harnessが報告するエラーの重大度がオーケストレーション層で勝手に緩和されない。

#### 受け入れ基準

- [ ] AC-1: severity権限契約（severity: "error"の格下げ禁止）が仕様として定義されている
- [ ] AC-2: Harness APIレスポンスでseverityフィールドがread-onlyであることが型レベルで保証されている
- [ ] AC-3: severity格下げを試みるケースを検出するテストが存在する
- [ ] AC-4: 契約違反時のエラーメッセージに違反内容と根拠（ADR参照）が含まれる

---

## Wave 2: コア品質機構 + エージェント統合（H-07〜H-11 / 24 US）

---

## H-07: Nyquist検証層

### H07-01: requirement-test-matrix.json新設

**Epic**: H-07 Nyquist検証層
**旧US**: US-005
**優先度**: Must

**As a** 品質管理者,
**I want to** `requirement-test-matrix.json`でUS/AC/テストケースのマッピングをJSONスキーマで定義したい,
**so that** 要件とテストの双方向トレーサビリティが構造化され、テスト漏れを機械的に検出できる。

#### 受け入れ基準

- [ ] AC-1: requirement-test-matrix.jsonのJSONスキーマが定義されている
- [ ] AC-2: スキーマにUser Story ID、AC ID、テストケースファイルパス、テスト種別（unit/it/scenario）のフィールドが含まれている
- [ ] AC-3: スキーマバリデーションが通過するサンプルファイルが作成されている
- [ ] AC-4: 無効なスキーマのファイルに対してバリデーションエラーが検出される
- [ ] AC-5: @storyメタデータ（H03-03）との整合性が定義されている

---

### H07-02: phase-gate ACマッピング完了チェック追加

**Epic**: H-07 Nyquist検証層
**旧US**: US-006
**優先度**: Must

**As a** 開発者,
**I want to** phase-gateバリデータに「全AC→テストケースマッピング完了」チェックを追加したい,
**so that** テストマッピングが不完全な状態で実装フェーズに進むことを防止できる。

#### 受け入れ基準

- [ ] AC-1: phase-gateバリデータにACマッピング完了チェックが追加されている
- [ ] AC-2: requirement-test-matrix.jsonに未マッピングのACが存在する場合、phase-gateが失敗する
- [ ] AC-3: 全ACがマッピング済みの場合、phase-gateが正常に通過する
- [ ] AC-4: phase-gate失敗時のHarnessErrorに未マッピングAC一覧が含まれる

---

### H07-03: test-coverage-checkerでの要件カバレッジ算出

**Epic**: H-07 Nyquist検証層
**旧US**: US-007
**優先度**: Must

**As a** 品質管理者,
**I want to** test-coverage-checkerで要件カバレッジ（AC網羅率）を算出したい,
**so that** コードカバレッジだけでなく、要件レベルでのテスト充足度を把握できる。

#### 受け入れ基準

- [ ] AC-1: test-coverage-checkerがrequirement-test-matrix.jsonを読み込み、AC網羅率を算出する
- [ ] AC-2: カバレッジレポートにAC網羅率（マッピング済みAC数/全AC数）が含まれる
- [ ] AC-3: AC網羅率が100%未満の場合、未カバーACの一覧がレポートに出力される
- [ ] AC-4: コードカバレッジ閾値（standard: 90% / strict: 95%）と要件カバレッジの両方がレポートに含まれる

---

### H07-04: phasegate:impact-analysis HXX-XXコマンド

**Epic**: H-07 Nyquist検証層
**旧US**: US-008
**優先度**: Should

**As a** 開発者,
**I want to** `phasegate:impact-analysis HXX-XX`コマンドで指定ストーリーに紐づく影響テストケースを自動特定したい,
**so that** ストーリー変更の影響範囲を迅速に把握し、必要なテストを効率的に実行できる。

#### 受け入れ基準

- [ ] AC-1: `phasegate:impact-analysis HXX-XX`コマンドが実行可能であり、正常時は終了コード0、ストーリー未検出時は終了コード1を返す
- [ ] AC-2: 指定USに紐づくテストケース一覧がrequirement-test-matrix.jsonから特定・出力される
- [ ] AC-3: 存在しないストーリーIDが指定された場合、適切なエラーメッセージが表示される
- [ ] AC-4: 出力にテスト種別（unit/it/scenario）とファイルパスが含まれる

---

## H-08: L2-L4バリデータ体系

### H08-01: L2 test-qualityバリデータ

**Epic**: H-08 L2-L4バリデータ体系
**旧US**: v0維持+明示化
**優先度**: Must

**As a** 品質管理者,
**I want to** L2 test-qualityバリデータ（AAA/actual命名/single-act/no-domain-mock/E2E seed/describe-it規約）を明示的に定義・実装したい,
**so that** テスト品質ルールが機械的に強制され、AIエージェントが生成するテストの品質が保証される。

#### 受け入れ基準

- [ ] AC-1: AAAパターン（Arrange/Act/Assert）構造を検証するルールが実装されている
- [ ] AC-2: テスト変数の`actual`命名規約を検証するルールが実装されている
- [ ] AC-3: single-act（1テストケース1アクション）を検証するルールが実装されている
- [ ] AC-4: no-domain-mock（ドメイン層のモック禁止）を検証するルールが実装されている
- [ ] AC-5: E2E seed pattern（テストデータのシード方式）を検証するルールが実装されている
- [ ] AC-6: describe/it命名規約を検証するルールが実装されている
- [ ] AC-7: 各ルール違反時のHarnessError（L2-003）にfix_exampleが含まれる

#### 対応非交渉要件
K4（テスト品質ルール）

---

### H08-02: L3 security+performanceバリデータ

**Epic**: H-08 L2-L4バリデータ体系
**旧US**: v0維持+明示化
**優先度**: Must

**As a** 品質管理者,
**I want to** L3 securityバリデータ（ハードコード秘密/SQLインジェクション）とperformanceバリデータ（ループ内await/N+1/bundleSizeLimit）を明示的に実装したい,
**so that** セキュリティ・パフォーマンスに関する品質基準がCI/CDで機械的に強制される。

#### 受け入れ基準

- [ ] AC-1: ハードコードされた秘密情報（APIキー、パスワード等）を検出するルールが実装されている
- [ ] AC-2: SQLインジェクションパターンを検出するルールが実装されている
- [ ] AC-3: ループ内awaitを検出するルールが実装されている
- [ ] AC-4: N+1クエリパターンを検出するルールが実装されている
- [ ] AC-5: bundleSizeLimit（strictプリセットのみ）を検証するルールが実装されている
- [ ] AC-6: 各ルール違反時のHarnessError（L3-001/L3-002）にadr_ref + fix_exampleが含まれる

#### 対応非交渉要件
K10（Security/Performance検出）

---

### H08-03: L3 coverageバリデータ

**Epic**: H-08 L2-L4バリデータ体系
**旧US**: 新規（明示化）
**優先度**: Must

**As a** 品質管理者,
**I want to** L3 coverageバリデータでテストカバレッジ閾値（standard: 90% / strict: 95%）を検証したい,
**so that** プリセットに応じたカバレッジ基準がCIで機械的に強制される。

#### 受け入れ基準

- [ ] AC-1: coverageバリデータがphasegate.config.jsonのcoverageThresholdを読み取り、閾値検証を実行する
- [ ] AC-2: standardプリセット（90%）での閾値検証が正常に動作する
- [ ] AC-3: strictプリセット（95%）での閾値検証が正常に動作する
- [ ] AC-4: 閾値未達時のHarnessError（L3-003）に現在のカバレッジ値と不足分が含まれる

---

### H08-04: L4 drift-detectバリデータ

**Epic**: H-08 L2-L4バリデータ体系
**旧US**: 新規（明示化）
**優先度**: Must

**As a** 品質管理者,
**I want to** L4 drift-detectバリデータで設計⇔コードの双方向乖離を検出したい,
**so that** 設計にあるがコードにない/コードにあるが設計にない乖離を定期的に発見し、設計-実装の整合性を維持できる。

#### 受け入れ基準

- [ ] AC-1: 設計文書に定義されているがコードに実装されていない要素（設計→コード方向の乖離）を検出する
- [ ] AC-2: コードに存在するが設計文書に定義されていない要素（コード→設計方向の乖離）を検出する
- [ ] AC-3: @unitメタデータで参照されるUnitが設計文書に存在することを検証する
- [ ] AC-4: 設計文書の@story-idに対応するinception文書が存在することを検証する
- [ ] AC-5: 乖離検出時のHarnessError（L4-001）に乖離の方向・対象要素・推奨アクションが含まれる

#### 対応非交渉要件
K11（Drift Detection）

---

### H08-05: L4 consistency-checkバリデータ

**Epic**: H-08 L2-L4バリデータ体系
**旧US**: 新規（明示化）
**優先度**: Must

**As a** 品質管理者,
**I want to** L4 consistency-checkバリデータで文書間のレイヤー整合性を検証したい,
**so that** 設計文書間および設計-実装間の整合性破綻を定期的に検出できる。

#### 受け入れ基準

- [ ] AC-1: consistency-checkバリデータが文書間のレイヤー整合性を検証する（domain_model.md ⇔ logical_design.md ⇔ 実装コード）
- [ ] AC-2: 設計文書間の用語不一致（エンティティ名、VO名等）を検出する
- [ ] AC-3: 検出時のHarnessError（L4-002）にadr_ref + fix_example + 不整合箇所の詳細が含まれる
- [ ] AC-4: 検証対象ペア（domain_model↔logical_design, logical_design↔実装コード）が設定可能である

#### 対応非交渉要件
K12（Consistency Checker）

---

### H08-06: L4 dead-codeバリデータ

**Epic**: H-08 L2-L4バリデータ体系
**旧US**: 新規（明示化）
**優先度**: Must

**As a** 品質管理者,
**I want to** L4 dead-codeバリデータで未使用エクスポートと到達不能コードを検出したい,
**so that** 不要コードの蓄積を定期的に発見し、コードベースの保守性を維持できる。

#### 受け入れ基準

- [ ] AC-1: dead-codeバリデータが未使用エクスポート（export されているが他ファイルからimportされていない）を検出する
- [ ] AC-2: dead-codeバリデータが到達不能コード（条件分岐で到達し得ないブロック）を検出する
- [ ] AC-3: 検出時のHarnessError（L4-003）にadr_ref + fix_example + 対象ファイルパス・行番号が含まれる
- [ ] AC-4: strictプリセットでのみ有効（deadCodeGC機能としてphasegate.config.jsonで制御）

---

## H-09: Harness API

### H09-01: phasegate:check-ready / phasegate:check-phase

**Epic**: H-09 Harness API
**旧US**: 新規
**優先度**: Must

**As a** オーケストレーター（またはCLIユーザー）,
**I want to** `phasegate:check-ready`で全storyのPhase Gate通過状態を、`phasegate:check-phase`で指定Unitの現在フェーズを取得したい,
**so that** 実行フェーズへの移行判定やフェーズ遷移判定を機械的に行える。

#### 受け入れ基準

- [ ] AC-1: `phasegate:check-ready`コマンドが全storyのPhase Gate通過状態をJSON形式で返却する
- [ ] AC-2: `phasegate:check-phase <unit>`コマンドが指定Unitの現在フェーズ（Level/スキル名）を返却する
- [ ] AC-3: Phase Gate未通過のstoryが存在する場合、`phasegate:check-ready`が未通過story一覧を含むレスポンスを返す
- [ ] AC-4: 存在しないUnit名が指定された場合、適切なエラーメッセージが表示される

---

### H09-02: phasegate:ci-check

**Epic**: H-09 Harness API
**旧US**: US-019一部
**優先度**: Must

**As a** 品質管理者,
**I want to** `phasegate:ci-check`コマンドで全L3バリデータの統合実行結果を取得したい,
**so that** CIパイプラインのPass/Fail判定を一つのコマンドで実行できる。

#### 受け入れ基準

- [ ] AC-1: `phasegate:ci-check`コマンドが全L3バリデータ（security/performance/coverage/nyquist）を順次実行する
- [ ] AC-2: 全バリデータ通過時にPass判定、1つでも失敗時にFail判定を返す
- [ ] AC-3: 実行結果にバリデータ別のPass/Fail詳細が含まれる
- [ ] AC-4: 失敗時のレスポンスにHarnessError一覧が含まれる

---

### H09-03: phasegate:detect-drift

**Epic**: H-09 Harness API
**旧US**: 新規
**優先度**: Must

**As a** 品質管理者,
**I want to** `phasegate:detect-drift`コマンドで設計-実装乖離レポートを取得したい,
**so that** 設計とコードの乖離を任意のタイミングで確認でき、検証フェーズの自動実行トリガーとして利用できる。

#### 受け入れ基準

- [ ] AC-1: `phasegate:detect-drift`コマンドが設計→コード方向とコード→設計方向の双方向乖離を検出する
- [ ] AC-2: 乖離レポートにUnit名・乖離方向・対象要素の詳細が含まれる
- [ ] AC-3: 乖離が0件の場合、「乖離なし」のサマリーが返却される
- [ ] AC-4: `--json`フラグでJSON形式のレポート出力が可能であり、出力スキーマに`drifts[]`（方向/unit/要素/推奨アクション）フィールドが含まれる

---

### H09-04: phasegate:status（成果物駆動状態導出）

**Epic**: H-09 Harness API
**旧US**: 新規（codex提案）
**優先度**: Must

**As a** ハーネス利用者,
**I want to** `phasegate:status`コマンドでファイルシステム上の成果物（設計文書、テストファイル、メタデータ）の存在からハーネス全体の健全性サマリを取得したい,
**so that** ハーネスの現在の状態を一目で把握でき、ダッシュボード表示・進捗判定に利用できる。

#### 受け入れ基準

- [ ] AC-1: `phasegate:status`コマンドがファイルシステム上の成果物の存在からハーネス検査状態を導出する（成果物駆動の状態導出）
- [ ] AC-2: レスポンスにL1-L4各レイヤーの健全性（有効/無効/最終実行結果）が含まれる
- [ ] AC-3: レスポンスにPhase Gate通過状態のサマリーが含まれる
- [ ] AC-4: レスポンスにプリセット名と有効な設定のサマリーが含まれる
- [ ] AC-5: JSON形式での出力が可能である

---

## H-10: Quick Mode

### H10-01: Quick Mode設定（phasegate.config.json quickModeセクション）

**Epic**: H-10 Quick Mode
**旧US**: US-010
**優先度**: Must

**As a** ハーネス管理者,
**I want to** phasegate.config.jsonの`quickMode`セクション（allowedCategories/maintainedLayers/relaxedGates）でQuick Modeの対象条件を定義したい,
**so that** Quick Modeの対象・対象外を明確に設定し、運用ポリシーに合わせてカスタマイズできる。

#### 受け入れ基準

- [ ] AC-1: phasegate.config.jsonに`quickMode`セクションが追加されている
- [ ] AC-2: `allowedCategories`で対象カテゴリ（bugfix/docs/test/config）が設定可能である
- [ ] AC-3: `maintainedLayers`で維持するレイヤー（デフォルト: L1, L2）が設定可能である
- [ ] AC-4: `relaxedGates`で緩和するゲート（デフォルト: phase-gate, 2-phase-execution）が設定可能である
- [ ] AC-5: JSONスキーマバリデーションが通過する

---

### H10-02: Quick Mode判定エンジン

**Epic**: H-10 Quick Mode
**旧US**: 新規（codex提案）
**優先度**: Must

**As a** 品質管理者,
**I want to** Quick Mode判定エンジン（対象/対象外自動分類 + 混在変更拒否 + 新ドメイン/API変更自動拒否）を実装したい,
**so that** Quick Mode適用条件が厳格に定義され、「これもQuickでいいのでは」という適用範囲拡大圧力への防波堤となる。

#### 受け入れ基準

- [ ] AC-1: 変更対象ファイルからQuick Mode対象/対象外を自動分類するエンジンが実装されている
- [ ] AC-2: 混在変更（Quick Mode対象ファイル+対象外ファイルの同時変更）が拒否される
- [ ] AC-3: 新ドメインモデル追加（`domain/`配下の新規ファイル）が自動拒否される
- [ ] AC-4: API契約変更（Port/Adapterインターフェースの変更）が自動拒否される
- [ ] AC-5: 判定結果にQuick Mode適用可否と根拠が含まれる
- [ ] AC-6: 境界ケースの自動テストが存在する

---

### H10-03: Quick Modeバリデータ緩和実行

**Epic**: H-10 Quick Mode
**旧US**: US-011
**優先度**: Must

**As a** 開発者,
**I want to** Quick Mode実行時にL1全維持 + L2選択 + L3 securityのみ + L4スキップの構成でバリデータを実行したい,
**so that** 軽微な変更（バグ修正、ドキュメント修正、テスト追加）を迅速に完了できる。

#### 受け入れ基準

- [ ] AC-1: Quick Mode実行時にL1全8ルールが実行される（緩和なし）
- [ ] AC-2: Quick Mode実行時にL2の`metadata`、`test-quality`バリデータが実行され、`phase-gate`はスキップされる
- [ ] AC-3: Quick Mode実行時にL3は`security`バリデータのみ実行される（performance/coverage/nyquistはスキップ）
- [ ] AC-4: Quick Mode実行時にL4バリデータは全てスキップされる
- [ ] AC-5: 2-Phase Executionが緩和される（Quick Mode対象の軽微変更では不要）

---

### H10-04: quick-implementor（Quick Mode下のad-hoc実装スキル）

**Epic**: H-10 Quick Mode
**旧US**: 新規
**優先度**: Should

**As a** 開発者,
**I want to** Quick Mode下でのad-hoc実装スキル（quick-implementor）を定義したい,
**so that** Quick Mode対象の軽微変更をGated Velocityの原則に基づいて最小限のゲートで実行できる。

#### 受け入れ基準

- [ ] AC-1: quick-implementorのSKILL.mdが作成されている
- [ ] AC-2: Quick Mode判定（H10-02）を前提条件として使用する
- [ ] AC-3: バリデータ緩和設定（H10-03）に基づいて品質チェックが実行される
- [ ] AC-4: Atomic commitが維持される（Quick Modeでもコミット単位は保持）

---

### H10-06: WI-aware quick-implementor trivial path（ISSUE-026 Phase D-1）

**Epic**: H-10 Quick Mode
**旧US**: 新規（ISSUE-026 Phase D-1 の分割）
**優先度**: Should

**As a** PhaseGate 開発者,
**I want to** quick-implementor が `type: fix | chore` のWIを軽量パスとして扱い、重いWI種別をFull Modeへエスカレーションできるようにしたい,
**so that** 小さな修正にも `Work-Item` 証跡を残しつつ、設計影響のある変更は従来通りFull workflowで保護できる。

#### 受け入れ基準

- [ ] AC-1: `skills/quick-implementor/SKILL.md` が `type: fix | chore` をQuick Mode適用候補として説明している
- [ ] AC-2: `type: story | issue | refactor` は `story-implementor` へエスカレーションするよう説明している
- [ ] AC-3: Quick Modeのコミットにも `Work-Item: WI-XXX` trailer を含めるよう説明している

---

## H-11: エージェント統合オプション

### H11-01: コア品質能力のCLI/FSフォールバック定義

**Epic**: H-11 エージェント統合オプション
**旧US**: 新規
**優先度**: Must

**As a** ハーネス利用者,
**I want to** コア品質能力（L1-L4全機能）がHook無し・エージェント無しでもCLI/FS操作のみで動作することを保証したい,
**so that** エージェントの種類に依存せず、ファイルシステムとCLIだけでQuality Harnessの全機能が利用できる。

#### 受け入れ基準

- [ ] AC-1: L1-L4全バリデータがCLIコマンドから直接実行可能であることを検証するテストが存在する
- [ ] AC-2: Claude Code Hookが無効な環境でも全バリデータが正常に動作することを検証するテストが存在する
- [ ] AC-3: coreモジュールが特定エージェントAPI（Claude Code Hook API等）をimportしていないことを検証するテストが存在する
- [ ] AC-4: CLI/FSフォールバックの利用方法がドキュメント化されている

---

### H11-02: Claude Code PreToolUse Hook Adapter（リンター設定保護）

**Epic**: H-11 エージェント統合オプション
**旧US**: US-016
**優先度**: Must

**As a** ハーネス管理者,
**I want to** Claude Code PreToolUse Hook Adapterでリンター設定ファイル（biome.json/tsconfig.json/package.json）の変更をブロックしたい,
**so that** Claude Code使用時にAIエージェントがリンター設定を改変してエラーを消す行為を防止できる。

#### 受け入れ基準

- [ ] AC-1: PreToolUse Hook Adapterが`biome.json`（`.biome.json`含む）、`tsconfig.json`、`package.json`の変更をブロックする
- [ ] AC-2: ブロック時に変更対象ファイル名を含むHarnessErrorが表示される
- [ ] AC-3: ブロック対象外のファイルへの変更は正常に実行される
- [ ] AC-4: AdapterがH11-01のコア品質能力に依存し、エージェント固有APIは薄いラッパーに留まる

---

### H11-03: Claude Code PostToolUse Hook Adapter（Biomeベース高速フォーマット+リント）

**Epic**: H-11 エージェント統合オプション
**旧US**: US-037
**優先度**: Must

**As a** ハーネス開発者,
**I want to** Claude Code PostToolUse Hook AdapterでBiomeベースのフォーマット+リントを自動実行したい,
**so that** Claude Code使用時にコード生成ごとの検証ループが高速化される。

#### 受け入れ基準

- [ ] AC-1: PostToolUse Hook AdapterがBiome（`biome check`/`biome format`）を使用してフォーマット+リントを実行する
- [ ] AC-2: v0のformat-typescript-hook.shと同等以上の機能がBiomeで実現されている
- [ ] AC-3: Hook未使用時はCLI（`phasegate:lint`相当）で同等の機能が実行可能である
- [ ] AC-4: Hook実行テストが存在する

---

### H11-04: Claude Code Stop Hook Adapter（テストゲート + ci-check + 無限ループ防止）

**Epic**: H-11 エージェント統合オプション
**旧US**: US-017+018+019統合
**優先度**: Must

**As a** 品質管理者,
**I want to** Claude Code Stop Hook Adapterにテストゲート（全テストグリーン必須）+ phasegate:ci-check + 無限ループ防止（stop_hook_activeフラグ）を統合したい,
**so that** Claude Code使用時にエージェントの完了宣言前にテスト全通過+ハーネスバリデーション全通過が保証される。

#### 受け入れ基準

- [ ] AC-1: Stop Hook Adapter実行時に`pnpm test`が自動実行され、失敗時にエージェントの完了が阻止される
- [ ] AC-2: テスト通過後に`phasegate:ci-check`が実行され、失敗時にエージェントの完了が阻止される
- [ ] AC-3: `stop_hook_active`フラグで再入を検出し、無限ループ（テスト失敗→再試行→テスト失敗）を防止する
- [ ] AC-4: 再入検出時にStop Hookがスキップされ、適切な警告メッセージが表示される
- [ ] AC-5: Hook未使用時はCLI（`phasegate:complete-check`相当）で同等の完了チェックが実行可能である

---

### H11-06: WI cross layout write target scope（ISSUE-026 Phase C-2）

**Epic**: H-11 エージェント統合オプション
**旧US**: 新規（ISSUE-026 Phase C-2 の分割）
**優先度**: Must

**As a** PhaseGate 開発者,
**I want to** PreToolUse Hook の書き込み対象スコープ判定が `docs/inception/_cross/WI-*` を Level 3 作業単位として認識できるようにしたい,
**so that** Phase B で移行した横断 WI に対する設計・実装作業もフェーズゲート対象にできる。

#### 受け入れ基準

- [ ] AC-1: `docs/inception/_cross/WI-XXX/...` が `WriteTargetScope { level: 3, unitId: "_cross", storyId: "WI-XXX" }` に解決される。ただしWI入口の `description.md` はPhase 1として扱い、Level 3ゲート対象にしない。@work-item-id WI-218
- [ ] AC-2: カスタム `ProjectPaths.docs.inception` でも `_cross/WI-*` が同じ規則で解決される。ただしWI入口の `description.md` はPhase 1として扱う。@work-item-id WI-218
- [ ] AC-3: `_cross` 配下の非WIパスは storyId 付き Level 3 として誤認されない
- [ ] AC-4: 旧 `docs/inception/issues/ISSUE-*` は既存互換として Level 1 のまま維持される

#### 対応非交渉要件
K2（Phase Gate Architecture）— 新 WI layout を Hook 側のスコープ推定に接続する

---

## Wave 3: 拡張・運用・保証（H-12〜H-16 / 19 US）

---

## H-12: スキル品質強化

### H12-01: story-implementor Atomic Git Commits + TDD品質契約

**Epic**: H-12 スキル品質強化
**旧US**: US-045分割
**優先度**: Must

**As a** 開発者,
**I want to** story-implementorにAtomic Git Commits（TDDサイクル単位の自動コミット）とTDD品質契約（Green→commit, Refactor→commit）を追加したい,
**so that** TDDの各サイクルが独立したコミットとして記録され、変更履歴の粒度とトレーサビリティが向上する。

#### 受け入れ基準

- [ ] AC-1: TDDサイクルのGreen到達時（テスト通過時）にAtomic commitが自動生成される
- [ ] AC-2: Refactor完了時にAtomic commitが自動生成される
- [ ] AC-3: コミットメッセージに`feat({unit}/{US}):`プレフィックスが付与される
- [ ] AC-4: TDD品質契約（Red→Green→Refactorの各ステップでの品質チェック）がSKILL.mdに定義されている
- [ ] AC-5: Atomic commit前にL1+L2バリデータが通過していることが保証される

---

### H12-02: test-coverage-checker Nyquist Validation統合

**Epic**: H-12 スキル品質強化
**旧US**: US-046
**優先度**: Must

**As a** 品質管理者,
**I want to** test-coverage-checkerにNyquist Validation（要件→テスト双方向トレーサビリティ + matrix.json生成）を統合したい,
**so that** コードカバレッジに加えて要件カバレッジも一元的にチェックできる。

#### 受け入れ基準

- [ ] AC-1: test-coverage-checkerがrequirement-test-matrix.jsonを生成または更新する
- [ ] AC-2: 要件→テスト方向のトレーサビリティ（全ACにテストが紐づいているか）を検証する
- [ ] AC-3: テスト→要件方向のトレーサビリティ（全テストがACに紐づいているか）を検証する
- [ ] AC-4: coverage_report.mdに要件カバレッジ（AC網羅率）が含まれる

---

### H12-03: implementation-readiness-checker Plan-Checker Loop統合

**Epic**: H-12 スキル品質強化
**旧US**: US-047
**優先度**: Must

**As a** 品質管理者,
**I want to** implementation-readiness-checkerにPlan-Checker Loop（最大3回の自動検証→修正ループ + Nyquist coverageRate閾値）を統合したい,
**so that** 実装計画の品質を自動的に検証・改善し、実装開始前の準備完了度を高められる。

#### 受け入れ基準

- [ ] AC-1: implementation-readiness-checkerが最大3回の検証→修正ループを実行する
- [ ] AC-2: 各ループでNyquist coverageRate（AC網羅率）を検証する
- [ ] AC-3: coverageRateが閾値未満の場合、不足箇所を指摘して修正を促す
- [ ] AC-4: 3回のループで閾値を達成できない場合、人間へのエスカレーションが行われる
- [ ] AC-5: ループの実行履歴がログとして記録される

---

### H12-04: Agent-Lesson System

**Epic**: H-12 スキル品質強化
**旧US**: 新規（K9）
**優先度**: Must

**As a** ハーネス利用者,
**I want to** [Agent-Lesson]タグで収集された教訓をAGENTS.mdに自動更新するAgent-Lesson Systemを実装したい,
**so that** AIエージェントの学習が蓄積・共有され、同じ失敗の繰り返しが防止される。

#### 受け入れ基準

- [ ] AC-1: `[Agent-Lesson]`タグ付きの教訓をソースコード・コミットメッセージ・設計文書から収集する仕組みが実装されている
- [ ] AC-2: 収集された教訓がAGENTS.mdに構造化された形式で追記される
- [ ] AC-3: 重複する教訓の検出・統合が行われる
- [ ] AC-4: Agent-Lesson Systemの回帰テストが存在する

#### 対応非交渉要件
K9（Agent-Lesson System）

---

### H12-05: Cascade Updater拡張（Level 3完了後の累積更新 + @story-id自動付与）

**Epic**: H-12 スキル品質強化
**旧US**: 新規（K8）
**優先度**: Must

**As a** 品質管理者,
**I want to** Cascade UpdaterをLevel 3完了後の累積更新に対応させ、`product/construction/{unit}/`への更新時に@story-idアノテーションを自動付与したい,
**so that** 下位変更が上位設計に確実に伝播し、トレーサビリティが自動的に維持される。

#### 受け入れ基準

- [ ] AC-1: Level 3（ストーリー実装）完了後に`product/construction/{unit}/`配下のドキュメントが累積更新される
- [ ] AC-2: 累積更新箇所に@story-idアノテーションが自動付与される
- [ ] AC-3: Cascade Updaterの実行結果に更新されたファイル・セクション・付与されたストーリーIDの一覧が含まれる
- [ ] AC-4: Cascade Updaterの回帰テストが存在する

#### 対応非交渉要件
K8（Cascade Updater）

---

### H12-06: スキルSKILL.md構造維持検証

**Epic**: H-12 スキル品質強化
**旧US**: 新規（codex 2ndレビュー提案）
**優先度**: Must

**As a** 品質管理者,
**I want to** v0既存スキル+v1新規スキルのSKILL.mdが所定フォーマット（必須セクション・フロントマター等）を維持していることを検証したい,
**so that** スキルの品質基準が統一され、学習曲線の増大リスクが軽減される。

#### 受け入れ基準

- [ ] AC-1: SKILL.mdの必須構造（フロントマター/目的/入力/出力/前提条件/実行フロー）が定義されている
- [ ] AC-2: v0既存スキルのSKILL.mdが必須構造を満たしていることを検証するテストが存在する
- [ ] AC-3: v1新規スキルのSKILL.mdが必須構造を満たしていることを検証するテストが存在する
- [ ] AC-4: 構造違反時のエラーメッセージに不足セクション名と期待される構造が含まれる

---

### H12-07: Work-Item trailer support（ISSUE-026 Phase D-2）

**Epic**: H-12 スキル品質強化
**旧US**: 新規（ISSUE-026 Phase D-2 の分割）
**優先度**: Must

**As a** PhaseGate 開発者,
**I want to** Atomic Commitで生成されるコミットメッセージが `Work-Item: WI-XXX` trailerを保持・整形できるようにしたい,
**so that** Quick Modeを含む軽量パスでもWI単位の変更証跡をgit履歴から追跡できる。

#### 受け入れ基準

- [ ] AC-1: `CommitMessage` は任意の `workItemId` を保持できる
- [ ] AC-2: `workItemId` は `WI-\\d+` 形式のみ受け付ける
- [ ] AC-3: `format()` は `Work-Item: WI-XXX` trailerを出力する
- [ ] AC-4: `workItemId` 未指定時の既存コミット形式は維持される

---

## H-13: Scheduled Governance & CI/CDテンプレート

### H13-01: CI/CDテンプレート

**Epic**: H-13 Scheduled Governance & CI/CDテンプレート
**旧US**: 新規
**優先度**: Must

**As a** ハーネス管理者,
**I want to** CI/CDテンプレート（aidlc-gate.yml PR検証 + consistency-check.yml 週次 + .husky/pre-commit）を整備したい,
**so that** 品質ゲートがCIパイプラインとgitフックに標準的に組み込まれる。

#### 受け入れ基準

- [ ] AC-1: `aidlc-gate.yml`テンプレートが作成され、PR時にL1-L3バリデータが実行される
- [ ] AC-2: `consistency-check.yml`テンプレートが作成され、週次でL4バリデータが実行される
- [ ] AC-3: `.husky/pre-commit`テンプレートが作成され、commit時にL2バリデータが実行される
- [ ] AC-4: 各テンプレートがphasegate.config.jsonのプリセット設定を参照する

---

### H13-02: 反復エラー自動エスカレーション

**Epic**: H-13 Scheduled Governance & CI/CDテンプレート
**旧US**: 新規（codex提案）
**優先度**: Should

**As a** 品質管理者,
**I want to** 同一HarnessErrorの反復検出時に自動エスカレーション（Issue作成・通知）を実行したい,
**so that** AIエージェントが同じエラーを繰り返す「スタック状態」を検出し、人間の介入を促せる。

#### 受け入れ基準

- [ ] AC-1: 同一HarnessError codeの繰り返し（閾値: 3回以上）を検出する仕組みが実装されている
- [ ] AC-2: 反復検出時に自動エスカレーション（ログ出力+警告メッセージ）が実行される
- [ ] AC-3: エスカレーション閾値がphasegate.config.jsonで設定可能である
- [ ] AC-4: 反復検出のリセット条件（エラー解消時）が定義されている

---

### H13-03: AGENTS.mdポインタ型移行

**Epic**: H-13 Scheduled Governance & CI/CDテンプレート
**旧US**: US-035
**優先度**: Should

**As a** ハーネス管理者,
**I want to** AGENTS.mdを記述的情報からコマンド実行方式（ポインタ型）に移行し、ADR参照リンクを追加したい,
**so that** AGENTS.mdの肥大化を防ぎ、常に最新の情報を動的に取得できるようにする。

#### 受け入れ基準

- [ ] AC-1: AGENTS.mdの記述的バリデータ一覧が`phasegate:status`実行へのポインタに置換されている
- [ ] AC-2: AGENTS.mdにADR参照リンクが追加されている
- [ ] AC-3: AGENTS.mdの行数が移行前と比較して50%以上削減されている
- [ ] AC-4: ポインタが参照する先（コマンド、ファイル）が実在することが検証可能である

---

### H13-04: Work-Item trailer pre-commit/CI検証（ISSUE-026 Phase D-3）

**Epic**: H-13 Scheduled Governance & CI/CDテンプレート
**旧US**: 新規（ISSUE-026 Phase D-3 の分割）
**優先度**: Must

**As a** ハーネス管理者,
**I want to** WI配下document変更時に `Work-Item: WI-XXX` trailerをpre-commit/CI経路で検証したい,
**so that** Quick Modeを含む軽量変更でもWI単位の変更証跡がgit履歴から失われないようにする。

#### 受け入れ基準

- [ ] AC-1: WI配下documentがstagedでcommit messageに `Work-Item: WI-XXX` が無い場合、検証は失敗する
- [ ] AC-2: WI配下documentがstagedでvalid trailerがある場合、検証は成功する
- [ ] AC-3: WI配下以外の変更ではtrailerを要求しない
- [ ] AC-4: 通常pre-commitでは既存のL2/metadata検証挙動を維持する
- [ ] AC-5: `.husky/commit-msg` hookが `phasegate commit-msg "$1"` 経由でtrailer検証を実行する

---

## H-14: K1-K15回帰保証

### H14-01: K1-K13回帰テスト整備

**Epic**: H-14 K1-K15回帰保証
**旧US**: US-031~033統合
**優先度**: Must

**As a** 品質管理者,
**I want to** K1-K13の全非交渉要件（4層防御/Phase Gate/Biome AST/@unit@layer/テスト品質/DDD設計スキル/2Phase/DocSplit/Cascade/AgentLesson/Security+Perf/Drift/Consistency/Config）の回帰テストを整備したい,
**so that** v1機能追加の副作用でコア品質機構が破壊されないことを継続的に検証できる。

#### 受け入れ基準

- [ ] AC-1: K1（4層防御）— L1-L4各レイヤーのバリデータ正常動作を検証する回帰テストが存在する
- [ ] AC-2: K2（Phase Gate）— phase-gateの3層構造検証テストが存在する
- [ ] AC-3: K3（Biome AST）— Biome AST解析（importグラフ+循環依存）の回帰テストが存在する
- [ ] AC-4: K3.5（メタデータ）— @unit/@layer/@story-id/@storyメタデータ強制の回帰テストが存在する
- [ ] AC-5: K4-K6（テスト品質/DDD/2Phase）— テスト品質ルール・スキル構造・2-Phase Executionの回帰テストが存在する
- [ ] AC-6: K7-K9（DocSplit/Cascade/AgentLesson）— Document Split・Cascade Updater・Agent-Lesson Systemの回帰テストが存在する
- [ ] AC-7: K10-K13（Security/Drift/Consistency/Config）— Security・Performance・Drift・Consistency・Config単一原則の回帰テストが存在する
- [ ] AC-8: 全回帰テストがCIゲートに組み込まれている

---

### H14-02: K14-K15回帰テスト + エージェント非依存ガード

**Epic**: H-14 K1-K15回帰保証
**旧US**: 新規
**優先度**: Must

**As a** 品質管理者,
**I want to** K14（Phase Dependency Model）・K15（Plan文書必須生成）の回帰テストと、coreモジュールが特定エージェントAPIをimportしていないことを検証するエージェント非依存ガードを整備したい,
**so that** v1で追加された非交渉要件とエージェント非依存性が継続的に維持される。

#### 受け入れ基準

- [ ] AC-1: K14回帰テスト — Phase Dependency Modelの3層構造・Level間依存強制の回帰テストが存在する
- [ ] AC-2: K15回帰テスト — plan文書なしのPhase 2移行拒否の回帰テストが存在する
- [ ] AC-3: エージェント非依存ガード — coreモジュールが特定エージェントAPI（Claude Code Hook API等）をimportしていないことを検証するテストが存在する
- [ ] AC-4: エージェント非依存ガード — Adapterモジュールのみがエージェント固有APIを使用していることを検証するテストが存在する

---

### H14-03: Go/No-Go Gate品質側3条件回帰テスト

**Epic**: H-14 K1-K15回帰保証
**旧US**: US-055改修
**優先度**: Must

**As a** 品質管理者,
**I want to** Go/No-Go Gate品質側3条件（#4 yolo/skip-permissions不採用 + #5 2Phase維持 + #8 デフォルトOFF）の回帰テストを整備したい,
**so that** v1リリース判定の品質側絶対条件が継続的に満たされていることを機械的に保証できる。

#### 受け入れ基準

- [ ] AC-1: GNG-4「yolo/skip-permissions不採用」の検証テスト（deny listとhooksが完全維持）が存在する
- [ ] AC-2: GNG-5「2-Phase Execution維持」の検証テスト（設計スキルの人間承認ゲート存在）が存在する
- [ ] AC-3: GNG-8「デフォルトOFF」の検証テスト（GSD由来機能のデフォルト値がfalse/disabled）が存在する
- [ ] AC-4: 全3条件の検証テストがCIゲートに組み込まれている

---

## H-15: v0テスト資産移行

### H15-01: v0 143テスト仕様のv1再実装

**Epic**: H-15 v0テスト資産移行
**旧US**: US-048
**優先度**: Must

**As a** ハーネス開発者,
**I want to** v0の143テスト仕様をv1コードベースで再実装し、Biome対応修正と対応表を作成したい,
**so that** v0で確立した品質基準がv1でも維持され、リグレッションが防止される。

#### 受け入れ基準

- [ ] AC-1: v0テスト仕様の移行対象分析が完了し、移行対象リストが作成されている
- [ ] AC-2: 各テスト仕様がv1コードベースで再実装されている
- [ ] AC-3: Biome移行に伴い修正が必要なテストが特定され、修正されている
- [ ] AC-4: 再実装された全テストが`pnpm test`で実行可能である
- [ ] AC-5: v0テスト仕様とv1テスト実装の対応表が作成されている

---

### H15-02: v1再実装テストのCIゲート化

**Epic**: H-15 v0テスト資産移行
**旧US**: US-049
**優先度**: Must

**As a** 品質管理者,
**I want to** v1再実装テスト全件がグリーンであることをCIゲートとして設定したい,
**so that** v0から引き継いだ品質基準が継続的に維持されることを自動保証できる。

#### 受け入れ基準

- [ ] AC-1: CIパイプラインにv1再実装テスト全件実行のステップが追加されている
- [ ] AC-2: 1件でもテスト失敗があればCIが失敗する
- [ ] AC-3: テスト実行結果のサマリー（通過数/失敗数/全体数）がCI出力に含まれる
- [ ] AC-4: テストカバレッジ90%閾値がv1再実装テストにも適用される

---

## Future Phase

---

## H-F2: Phase 2拡張（Phase 2 backlog）

### HF2-01: doc-freshness-checker（L4拡張）

**Epic**: H-F2 Phase 2拡張

**As a** 品質管理者,
**I want to** doc-freshness-checkerでドキュメントの鮮度を検証したい,
**so that** 長期間更新されていない設計文書を検出し、設計-実装の乖離リスクを事前に把握できる。

#### 受け入れ基準

- [ ] AC-1: 設計文書の最終更新日からの経過日数を検出するバリデータが実装されている
- [ ] AC-2: 閾値（日数）がphasegate.config.jsonで設定可能である
- [ ] AC-3: 閾値超過時のHarnessErrorにadr_ref + 推奨アクションが含まれる

---

### HF2-02: pointer-validator（L4拡張）

**Epic**: H-F2 Phase 2拡張

**As a** 品質管理者,
**I want to** pointer-validatorでドキュメント・AGENTS.md内のポインタ（ファイルパス・コマンド参照）が実在することを検証したい,
**so that** リンク切れ・参照先消失を定期的に検出できる。

#### 受け入れ基準

- [ ] AC-1: ドキュメント内のファイルパス参照が実在することを検証するバリデータが実装されている
- [ ] AC-2: AGENTS.md内のコマンドポインタが有効であることを検証する
- [ ] AC-3: 検出されたリンク切れの一覧がレポートに出力される

---

### HF2-03: E2Eテスト戦略テンプレート（Playwright統合）

**Epic**: H-F2 Phase 2拡張

**As a** 開発者,
**I want to** Playwright統合のE2Eテスト戦略テンプレートを整備したい,
**so that** E2Eテストの設計・実装に一貫した方法論が適用できる。

#### 受け入れ基準

- [ ] AC-1: Playwright統合のE2Eテスト戦略テンプレートが作成されている
- [ ] AC-2: テンプレートにシードデータ管理・セレクタ戦略・ページオブジェクトパターンが含まれている
- [ ] AC-3: scenario-test-logic-designerとの連携方法がドキュメント化されている

---

### HF2-04: initial-creation-expiration-checker（L4拡張 / frontmatter semantic drift 検出）

**Epic**: H-F2 Phase 2拡張

**As a** 品質管理者,
**I want to** 設計文書 frontmatter の `traceability.initial_creation: true` が長期放置されていないか検証したい,
**so that** 新規作成フラグのまま陳腐化した文書を検出し、累積更新時の注釈 skip 経路が永続化するリスクを防げる。

#### 背景

`traceability.initial_creation: true` は設計文書の新規作成時に @story-id 注釈を不要とするフラグである。2 回目以降の改訂では削除される前提だが、削除漏れが発生すると validator が半永久的に素通りし、長期トレーサビリティが崩壊する（ISSUE-011 P3-4）。

#### 受け入れ基準

- [ ] AC-1: `initial_creation: true` を持つ設計文書の **初回コミット日からの経過日数** を検出する L4 validator が実装されている
- [ ] AC-2: 閾値（日数 / コミット回数）が `phasegate.config.json` (`phase2Extensions.initialCreationExpirationRules`) で設定可能である
- [ ] AC-3: 閾値超過時に `warning` severity で HarnessError を出力する（error 昇格は出さない / 段階導入方針）
- [ ] AC-4: `initial_creation: false` または frontmatter 自体が存在しない文書は対象外とする
- [ ] AC-5: config 未指定時はデフォルト閾値（90 日 OR 5 コミット）で動作する
- [ ] AC-6: HF2-01 (doc-freshness-checker) とは独立した validator として実装し、責務を分離する

---

### HF2-05: AC単位トレーサビリティ（@ac コントラクト / L4-007 advisory）

**Epic**: H-F2 Phase 2拡張

**As a** 品質管理者,
**I want to** テストケース単位で個別 AC を検証していることを `@ac` 注釈で機械的に記録し、story-level では linked だが個別 AC が検証されていない箇所（fileFallbackOnly）を advisory として可視化したい,
**so that** L3-004（file-level AC 網羅ゲート）の合否を一切変えずに、AC 単位トレーサビリティの正直な現状を把握し、将来の per-AC 保証（level:"ac"）への足がかりにできる。

#### 背景

L3-004 は「各 AC に参照テスト FILE が 1 つ以上存在する」ことを file-level で保証するが、個々の AC が個別に検証されていることは保証しない（`docs/inception/_shared/l3-004-traceability-ratchet.md` §6）。本ストーリーはすべて additive であり、L3-004 の pass/fail 判定はバイト一致で不変。ADR-019 §5 に従い、追加する L4-007 は default-OFF・advisory（non-blocking）・attestation-trust-excluded とする。

#### 受け入れ基準

- [ ] AC-1: `@ac` パーサが絶対形式（`HXX-YY-N`）・相対形式（`AC-N`）・1行複数AC（`H05-02-1 H05-02-2`）を解釈し、最近接 `@ac` を対象テストケースに紐づける（AST 非依存の positional scan）
- [ ] AC-2: 相対 `AC-N` は `@story` がちょうど 1 件のファイルでのみ解決し、複数 `@story` のファイルでは未解決（orphan）とする
- [ ] AC-3: story 外 AC を指す `@ac`・複数 story ファイルの相対 `@ac` を `orphanAcTags` として advisory 報告する
- [ ] AC-4: `MatrixTestReference.binding`（`"ac" | "file"`）を付与し、`@ac` 無しの参照は従来どおり全 AC へ `binding:"file"` でファンアウトする。L3-004 の合否判定は不変（golden matrix 比較で証明）
- [ ] AC-5: L4-007 は default-OFF・advisory（warning-only、error を出さない）・attestation-trust-excluded として実装する
- [ ] AC-6: requirement-test-matrix スキーマ 1.1 で `binding` を optional に追加し、`binding` を持たない 1.0 マトリクスも後方互換で検証を通過する

---

## H-16: Signed Attestation

### H16-01: Attestation record generation (phasegate:attest)

**Epic**: H-16 Signed Attestation
**旧US**: 新規（手1 signed attestation PoC）
**優先度**: Must

**As a** 品質管理者,
**I want to** `phasegate:attest` で ci-check の結果を content-addressed な attestation record として生成したい,
**so that** ゲート結果・検査対象入力・検査粒度を改竄検知可能な単一ドキュメントとして残し、粗い green を細かい保証として詐称（laundering）できないようにできる。

#### 背景

unsigned-poc モードは鍵を持たず、ドキュメント自身の content digest（`attestationDigest`）で **INTEGRITY（改竄検知）のみ** を証明する。**AUTHENTICITY（発行者の真正性）は証明しない**。真の ed25519 署名は `signature.mode: "signed"` で後から差し込む前提で、record format に `signature.mode` discriminator（`"unsigned-poc" | "signed"`）を持たせる。attest は opt-in の独立コマンドであり、`phasegate:ci-check` の経路には決して注入しない。

#### 受け入れ基準

- [ ] AC-1: 生成される record は `schemaVersion: "phasegate-attestation/v1"` と `predicateType: "https://phasegate.dev/attestation/gate-run/v1"` を含む
- [ ] AC-2: `subject.validatorSet` が `phasegate:ci-check --json` の出力から取得され、各要素が `{ validatorId, passed, skipped }` を持つ
- [ ] AC-3: `subject.gateResult` が ci-check の `allPassed` を反映し、`"pass" | "fail"` のいずれかである
- [ ] AC-4: `inputs.sources` が `phasegate.config.json` と `.harness/requirement-test-matrix.json` の sha256 digest を `sha256:<64hex>` 形式で含む
- [ ] AC-5: `inputs.sources` に git commit SHA が入力の一部として反映され、`inputs.inputDigest` が sources を安定ソートした上で決定論的に算出される
- [ ] AC-6: `granularity.traceability` が `subject.validatorSet` から機械的に導出され、`validator: "L3-004"`, `level: "file"` を記録する
- [ ] AC-7: `granularity.traceability.knownLimitations` に「L3-004 traceability は FILE-LEVEL であり per-AC ではない（green は各 AC に参照テスト FILE が1つ以上存在することのみを意味し、各 AC が個別に assert されていることは意味しない）」旨が含まれる
- [ ] AC-8: `signature.mode` が `"unsigned-poc"` のとき `signature.attestationDigest` が canonical payload 上の sha256 で算出され、`algorithm`/`keyId`/`value` は `null` である
- [ ] AC-9: `attestationDigest` は `signature` ブロックと volatile な `metadata`（`producedAt`, `gitCommit`）を除去した document の canonical JSON（キー昇順ソート・空白なし）上で算出される
- [ ] AC-10: `--require-pass` 指定時、`gateResult` が `fail` なら record を一切出力せず exit 1 で終了する
- [ ] AC-11: `--out <path>`（既定 `.harness/attestation.json`）で指定されたパスに record が書き出される
- [ ] AC-12: `--mode signed` 指定時は "not yet implemented" として usage error（exit 2）を返す
- [ ] AC-13: 使い方誤り（未知フラグ等）は exit 2 を返す

#### 対応非交渉要件
K9（トレーサビリティの改竄不可能性）— attestation による gate 結果の改竄検知と粒度の明示

---

### H16-02: Attestation verification (phasegate:verify-attestation)

**Epic**: H-16 Signed Attestation
**旧US**: 新規（手1 signed attestation PoC）
**優先度**: Must

**As a** 品質管理者,
**I want to** `phasegate:verify-attestation <file>` で既存 attestation record を機械的に再検証したい,
**so that** record が改竄されていないこと・入力が当時から変わっていないこと・粒度主張が validator set と整合していることを鍵なしで確認できる。

#### 受け入れ基準

- [ ] AC-1: record の schema/shape（必須フィールド・型）が妥当であることを検証し、不正なら exit 2 を返す
- [ ] AC-2: `signature.mode` がサポート対象（`unsigned-poc`）であることを検証し、非対応 mode（例: `signed`）は exit 2 で拒否する
- [ ] AC-3: canonical payload 上で `attestationDigest` を再計算し、格納値と一致することを検証する（INTEGRITY 再チェック）
- [ ] AC-4: `inputs.sources[].digest` を現在のファイルから再計算し、格納値と一致することを検証する（input-hash 再照合）
- [ ] AC-5: `granularity` を `subject.validatorSet` から再導出し、格納値と一致することを検証する（anti-laundering）
- [ ] AC-6: 全チェック合格時に exit 0 を返す
- [ ] AC-7: いずれかの再計算値が不一致（digest/input-hash/granularity mismatch）の場合 exit 1 を返す
- [ ] AC-8: ファイル不在・JSON parse 失敗・shape 不正・非対応 mode の場合 exit 2 を返す
- [ ] AC-9: `--json` 指定時は各チェックの結果を機械可読な形式で stdout に出力する

#### 対応非交渉要件
K9（トレーサビリティの改竄不可能性）— attestation の機械的再検証と laundering 検出

---

### H16-03: AC-bound coverage gate + attestation acBoundScope (L3-005)

**Epic**: H-16 Signed Attestation
**旧US**: 新規（手3b / WI-227）
**優先度**: Must

**As a** 品質管理者,
**I want to** fail-closed な L3-005「AC-bound coverage」ゲートと、attestation への machine-readable な `acBoundScope` 記録を導入したい,
**so that** 特定 story について「各 AC が個別の ac-binding テストで検証されている」ことを機械的に保証し、その厳密な保証範囲を attestation に改竄検知可能な形で明示できる（file-level の粗い green を per-AC 保証として詐称できないようにする）。

#### 背景

L3-004 は story-level（ファイル単位）の AC 網羅ゲートであり、各 AC に testReference が 1 件以上あれば pass する。しかし「各 AC が個別に assert されている」ことは保証しない（`l3-004-traceability-ratchet.md` §6 参照）。L3-005 は opt-in（default-OFF）で、スコープ内 story に限り「全 AC が ≥1 の `binding:"ac"` ref を持つ」ことを fail-closed で検査する。attestation の `acBoundScope` は、その per-AC 保証が genuinely 成立している story-id 群を machine-readable に記録する。`granularity.traceability.level` の global な "file"→"ac" 反転はしない（acBoundScope は per-story の独立次元）。

#### 受け入れ基準

- [ ] AC-1: fail-closed な L3-005「AC-bound coverage」バリデータが存在し、スコープ内 story の各 AC が ≥1 の `binding:"ac"` ref を持つ（fileFallbackOnly===0）ことを検査する
- [ ] AC-2: 検査スコープは `layers.L3.acBoundStories`（story-id 配列）で指定し、スコープ外 story の AC は無視する
- [ ] AC-3: fail-closed — matrix 不在 / parse 不能 / スコープ内のいずれかの AC が ac-binding を欠く → FAIL
- [ ] AC-4: default-OFF opt-in — `DEFAULT_CONFIG.layers.L3` の validator 集合にも standard/strict プリセットにも含めない。config alias `ac-bound-coverage` → `L3-005`
- [ ] AC-5: attestation record が machine-readable な `acBoundScope`（昇順 `string[]`。genuinely ac-bound かつスコープ内で pass した story のみ）を記録する
- [ ] AC-6: `granularity.traceability.level` は "file" のまま（global な反転をしない。acBoundScope から独立）
- [ ] AC-7: verify は `acBoundScope` を stored matrix + config allowlist から**再導出**して格納値と比較する（anti-laundering）
- [ ] AC-8: `acBoundScope` は canonical payload / `attestationDigest` に含まれる。producedAt / gitCommit のみ異なる 2 回の実行で `attestationDigest` はバイト一致（決定論）

#### 対応非交渉要件
K9（トレーサビリティの改竄不可能性）— per-AC 保証範囲の fail-closed 検査と改竄検知可能な明示

---

## Wave 4: World Model（H-17 / 15 US）

<!-- @work-item-id WI-285 -->
<!-- @work-item-id WI-292 -->
<!-- @work-item-id WI-301 -->
<!-- @work-item-id WI-302 -->

## H-17: World Model

World Modelは既存Unitの正本を複製せず、canonical / proposal / source / generated corpusをfederated read modelとして観測する。H17-01〜H17-06はPhase Aのread-only snapshotと可視化、H17-07〜H17-12はPhase Bのconstraint / obligation機能MVP、H17-13以降はPhase Cのproduction integrationを構成する。各Storyはdelivery planのWMへ1対1でbindingする。

### H17-01: Unit非依存SHA-256 capability（WM-06）

**Epic**: H-17 World Model
**旧US**: 新規（WM-06）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: required

**As a** World Model実装者,
**I want to** 既存attestationのSHA-256 primitiveをplain public capabilityとして利用したい,
**so that** world-model固有の`node:crypto`実装やattestation domainへのdeep importを増やさず決定的hashを計算できる。

#### 受け入れ基準

- [ ] AC-1: public contractが`Uint8Array`から`sha256:<64 lowercase hex>`を返すplain capabilityとして公開される
- [ ] AC-2: attestationとworld-modelが各consumer-owned portとlocal Digest VOへadaptし、互いのdomain VOをimportしない
- [ ] AC-3: World導入による新規`node:crypto` SHA-256 call siteが増えない
- [ ] AC-4: known bytes、non-ASCII UTF-8、invalid digest boundaryを検証するcontract testが存在する

### H17-02: World domain primitivesとcanonical snapshot（WM-07）

**Epic**: H-17 World Model
**旧US**: 新規（WM-07）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: required

**As a** 品質管理者,
**I want to** stable World node identityとcanonical snapshotを構築したい,
**so that** checkout locationや列挙順に依存せず同じcorpusから同じ`corpusRoot`を得られる。

#### 受け入れ基準

- [ ] AC-1: Artifact / Fragment / WorkItem / SourceFile / TestReference / ExplicitClaim / Constraint / SnapshotがADR-032の`pgw:v1` ID形式で表現される
- [ ] AC-2: file identityとfragment identityが分離され、heading text / order / line number / digestをexplicit Fragment IDに使わない
- [ ] AC-3: canonical JSON、text、path、symlink、owner-aware generated projectionがADR-033の正規化規則に従う
- [ ] AC-4: Snapshotがnodes / edges / diagnosticsと`corpusRoot`を保持し、duplicate IDでwinnerを選ばない
- [ ] AC-5: 同一fixtureの2回構築、列挙順、absolute root、LF / CRLF差に対するdeterminism testが存在する

### H17-03: Traceability plain DTO read facade（WM-08）

**Epic**: H-17 World Model
**旧US**: 新規（WM-08）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: required

**As a** World Model extractor実装者,
**I want to** traceability-modelからUnit / Story / AC / WorkItem / TestReferenceをplain DTOで読みたい,
**so that** ID parsingとlifecycleのownerを維持したままWorld factへ変換できる。

#### 受け入れ基準

- [ ] AC-1: traceability-modelがcanonical IDとprovenanceをplain application DTO / public facadeとして公開する
- [ ] AC-2: facadeがtraceability-modelのdomain entity / VO / infrastructure classを公開しない
- [ ] AC-3: world-model側のconsumer-owned adapterがDTOをWorld node / edgeへ変換する
- [ ] AC-4: legacy ID alias、cross-WI affects、missing / duplicate owner IDのcontract testが存在する

### H17-04: Design corpus extractor（WM-09）

**Epic**: H-17 World Model
**旧US**: 新規（WM-09）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: required

**As a** 設計者,
**I want to** product / inception / ADR / Unit定義を別corpus roleのWorld factとして抽出したい,
**so that** canonical設計とproposalのprovenanceを失わず構造を観測できる。

#### 受け入れ基準

- [ ] AC-1: productをcanonical、inceptionをproposal / deltaとして別Artifact IDへ抽出し、digest一致でもdeduplicateしない
- [ ] AC-2: ADRとcanonical Unit定義をdesign-document artifactとして抽出する
- [ ] AC-3: `@world-fragment-id`、legacy whole-file fallback、migration completion、`@world-reflects`をADR-032どおり解釈する
- [ ] AC-4: malformed marker、duplicate ID、missing reflection target、unsupported corpusをsilent omissionせずExtractionDiagnosticにする

### H17-05: Source / test / evidence extractor（WM-10）

**Epic**: H-17 World Model
**旧US**: 新規（WM-10）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: required

**As a** 品質管理者,
**I want to** source metadata、test reference、matrix、attestation evidenceをowner-aware projectionで抽出したい,
**so that** runtime事実とgenerated evidenceをstable snapshotへ接続できる。

#### 受け入れ基準

- [ ] AC-1: source metadataとtest referencesをSourceFile / TestReference nodeおよびtyped edgeへ変換する
- [ ] AC-2: matrixはStory / AC / TestReference semanticsを含め、`generatedAt`を除外してowner ID順に正規化する
- [ ] AC-3: attestationはgate outcome / verification statusを含め、signature、self digest、volatile metadataを除外する
- [ ] AC-4: providerのpublic facade / plain DTOだけを利用し、domain / infrastructureへdeep importしない
- [ ] AC-5: unknown owner schemaやprojection fieldをgenericに捨てずdiagnosticにする

### H17-06: World graph assemblyと`world:inspect`（WM-11）

**Epic**: H-17 World Model
**旧US**: 新規（WM-11）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: required

**As a** repository maintainer,
**I want to** 全extractorを一つのsnapshotへ組み立て`world:inspect`で観測したい,
**so that** node / edge / diagnostic / corpus rootをconstraint導入前から確認できる。

#### 受け入れ基準

- [ ] AC-1: BuildSnapshotが全extractor結果をcanonical graphへ組み立て、diagnosticを保持する
- [ ] AC-2: `world:inspect`がread-onlyでsnapshot summary、corpus role / artifact kind、diagnostics、`corpusRoot`を表示する
- [ ] AC-3: human / JSON output、stdout / stderr、exit 0 / 1 / 2がADR-037に従う
- [ ] AC-4: main dispatch、known command registry、help、CLI conformance testが同一command集合を持つ
- [ ] AC-5: 本Story完了はread-only可視化であり、obligation機能MVPを主張しない

### H17-07: ConstraintRecordとWCR evaluator（WM-12）

**Epic**: H-17 World Model
**旧US**: 新規（WM-12）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: planned -> required

**As a** 設計契約管理者,
**I want to** 両endpointをpinしたexplicit constraintを構造評価したい,
**so that** claimant / premiseのどちらが変わっても同じconstraintを決定的に再評価できる。

#### 受け入れ基準

- [ ] AC-1: ConstraintRecordがconstraint ID、directed fact type、claimant / premiseのstable node IDとcontent digestを保持する
- [ ] AC-2: directed factの意味方向を保ったまま、両endpoint変更で同じconstraintを再評価する
- [ ] AC-3: `WCR-001`〜`WCR-008`がmalformed、missing、deleted、invalid alias、duplicate、broken reference / dependency、digest mismatchを区別する
- [ ] AC-4: 機械評価をexistence、ID uniqueness、explicit reference、declared dependency、digest equalityへ限定する
- [ ] AC-5: rename / refines / causeをpath、digest、heading、prose similarityから推論しない
- [ ] AC-6: evaluation DTOはpolicy / severity / blocking decisionを持たない

### H17-08: Versioned World control repositories（WM-13）

**Epic**: H-17 World Model
**旧US**: 新規（WM-13）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: planned -> required

**As a** repository maintainer,
**I want to** constraints、adoption baseline、waiver、semantic debtをversioned external declarationとして管理したい,
**so that** review可能なcontrol inputとgenerated reportを混同せず再評価できる。

#### 受け入れ基準

- [ ] AC-1: root control filesが`phasegate.world-constraints.json`、`phasegate.world-baseline.json`、`phasegate.world-waivers.json`、`phasegate.world-debts.json`として定義される
- [ ] AC-2: schemaが`docs/contracts/world-*.schema.json`に置かれ、存在するunknown schemaをemptyへfallbackせずfail-closedにする
- [ ] AC-3: file不在はcanonical empty input、duplicate record IDはno-winnerとして扱う
- [ ] AC-4: application-owned repository portとinfrastructure adapterを分離し、control mutationはatomicに行う
- [ ] AC-5: ci-governanceの既存path / SHA-1 baselineをWorld adoption baselineへimportしない

### H17-09: Fingerprintとimmutable obligation derivation（WM-14）

**Epic**: H-17 World Model
**旧US**: 新規（WM-14）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: planned -> required

**As a** 品質管理者,
**I want to** evaluation findingからdeterministic obligationを毎回再導出したい,
**so that** legacy adoption、期限付きwaiver、新規blocking finding、返済済みentryを改竄可能なstateなしで区別できる。

#### 受け入れ基準

- [ ] AC-1: violationFingerprintがruleset、rule、constraint / endpoint pin、expected / observed evidenceから構成される
- [ ] AC-2: adoption baselineが同一ruleset内closed setで、追加禁止・返済削除のみのratchetになる
- [ ] AC-3: waiverがexact fingerprint、reason、exclusive expiry、WI、stable IDを必須とし、自動renewal / wildcardを許可しない
- [ ] AC-4: obligation reportがcurrent evaluationとpolicy inputから毎回再導出され、保存`repaid` stateや既存reportを入力にしない
- [ ] AC-5: policy inputが`policyInputsDigest`と`evaluationId`を変える一方、raw WCR finding / fingerprintを変えない
- [ ] AC-6: semantic debtをstructural obligationと別collectionで表示する

### H17-10: `world:pin` / `world:derive` CLI（WM-15）

**Epic**: H-17 World Model
**旧US**: 新規（WM-15）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: planned -> required

**As a** repository maintainer,
**I want to** endpoint pinとobligation導出を明示的なCLIで実行したい,
**so that** control mutationとgenerated report writeをreview可能なflagで分離できる。

#### 受け入れ基準

- [ ] AC-1: `world:pin`はpreview-onlyを既定とし、`--apply`時だけconstraintsをatomic updateする
- [ ] AC-2: `world:derive`はpure / read-onlyを既定とし、`--write`時だけreportを保存する
- [ ] AC-3: report既定先が`.harness/world-obligations.json`で、`--out`は`--write`と同時指定する
- [ ] AC-4: human / JSON envelope、stable sort、stdout / stderr、exit 0 / 1 / 2がADR-037に従う
- [ ] AC-5: explicit commandは`world.enabled`がfalseでも実行でき、invalid resolved configはdefaultsへfallbackしない

### H17-11: World mutation E2Eとdeterminism（WM-16）

**Epic**: H-17 World Model
**旧US**: 新規（WM-16）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: planned -> required

**As a** Phasegate maintainer,
**I want to** synthetic corpus mutationでWorld contractをend-to-end検証したい,
**so that** snapshot / constraint / obligationの決定性とfailure分類を回帰保証できる。

#### 受け入れ基準

- [ ] AC-1: fixtureがmissing、deleted、renamed、duplicate、stale reference、malformed / new constraint、new unpinned claim、waiver expiryを個別に表現する
- [ ] AC-2: 各mutationが期待するdiagnostic、`WCR-NNN`、fingerprint、exit codeを検証する
- [ ] AC-3: 同一fixtureの2回実行でcanonical snapshot、root、JSON resultがbyte-identicalになる
- [ ] AC-4: clean checkoutと既存`.harness`を持つcheckoutでderive結果が一致する
- [ ] AC-5: obligation reportの手編集・削除が再導出結果や判定を変えない

### H17-12: Self-repo adoption baselineとdogfood（WM-17）

**Epic**: H-17 World Model
**旧US**: 新規（WM-17）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: planned -> required

**As a** Phasegate maintainer,
**I want to** self-repoの実測structural violationsをreview済みbaselineとして採用したい,
**so that** 既存負債を可視化しながら新規増分をゼロに保つWorld Model機能MVPを確立できる。

#### 受け入れ基準

- [ ] AC-1: 承認済みschema / extractor / ruleset / configでclean checkoutを実測し、推測件数をbaselineに使わない
- [ ] AC-2: 同一checkoutで2回deriveし、fingerprint集合とserialized bytesが一致する
- [ ] AC-3: current structural violation集合がadoption baselineと厳密一致し、増分が0になる
- [ ] AC-4: 既知の意味的負債をexplicit semantic debt IDとしてimportし、structural obligationの「再発見」と表現しない
- [ ] AC-5: WCR-001、new claim / pin、malformed policy inputをlegacy baselineへ採用しない
- [ ] AC-6: 本Story完了をconstraint / obligationの機能MVPとし、L2 / L3 gate統合は後続Phase Cへ残す

### H17-13: World config surfaceとresolved mapping（WM-18）

**Epic**: H-17 World Model
**旧US**: 新規（WM-18 / WI-300）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: planned -> required

**As a** Phasegate導入・運用者,
**I want to** World Modelのcorpus、control input、output、session limitを`phasegate.config.json`から決定的に解決したい,
**so that** 明示CLIと将来のL2 / L3 integrationが同じfail-closed config contractを使える。

#### 受け入れ基準

- [ ] AC-1: v2 / v3 schemaがtop-level `world`の全ADR-037 fieldを受理し、unknown field、invalid path、範囲外limitを拒否する
- [ ] AC-2: minimal / standard / strict presetがcanonical World defaultsを持ち、automatic integrationの`world.enabled`は全てfalseである
- [ ] AC-3: source overrideをdeep mergeし、明示World fieldがない場合だけ既存design / inception / matrix pathを継承する
- [ ] AC-4: dedicated World mapperが完全なplain resolved DTOを返し、明示`world:*` commandは`enabled:false`でも実行できる
- [ ] AC-5: validator-system mapperが将来gate用World DTOを伝搬する一方、L2-017 / L3-008はまだ登録・有効化しない
- [ ] AC-6: configuration guideがfield、default、preset rollout、path制約を説明する

### H17-14: L2 World constraint admission fast-path（WM-19）

**Epic**: H-17 World Model
**旧US**: 新規（WM-19 / WI-301）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: planned -> required

**As a** Phasegateをpre-commitで利用する開発者,
**I want to** 新規World constraint / pin / claimの壊れた構造をlocal L2で即時検出したい,
**so that** 既存legacy debtを再blockingせず、新しい構造違反だけを導入前に修正できる。

#### 受け入れ基準

- [ ] AC-1: `L2-017 world-constraint-admission`がValidatorId、registry、RunL2、composition-rootへ一意に登録される
- [ ] AC-2: `world.enabled:false`ではL2-017を明示skipし、trueの場合だけWorld deriveを実行する
- [ ] AC-3: malformed / unsupported constraintとunpinned claimをWCR-001相当のerrorとしてfail-closedにする
- [ ] AC-4: baseline外のnew pin / claim findingをerrorとし、validな追加自体はblockしない
- [ ] AC-5: adopted-legacyとactive waiverをfingerprint付きwarningとして表示し、defaultではnon-blockingにする
- [ ] AC-6: HarnessErrorがlocal fast-pathは偽造可能でauthoritative判定はL3再導出であると明記し、L3-008は未登録のままにする

### H17-15: L3 authoritative World constraint re-derivation（WM-20）

**Epic**: H-17 World Model
**旧US**: 新規（WM-20 / WI-302）
**優先度**: Must
**Coverage status**: required
**Coverage lifecycle**: planned -> required

**As a** PhasegateをCIで運用する品質管理者,
**I want to** current corpusとversioned control declarationからWorld obligationをL3で独立再導出したい,
**so that** local resultや保存reportの改竄に依存しないauthoritative blocking判定を実施できる。

#### 受け入れ基準

- [ ] AC-1: `L3-008 world-constraint-rederivation`がValidatorId、registry、RunL3、composition-rootへ一意に登録される
- [ ] AC-2: `world.enabled:false`ではL3-008を明示skipし、trueの場合だけclean corpusから再導出する
- [ ] AC-3: 保存済み`.harness/world-obligations.json`を読まず、欠落・改竄・削除でresultとblocking判定が変わらない
- [ ] AC-4: new-structural / invalid-declarationをrule IDとfingerprint付きerror、adopted-legacy / active waiverをwarningとして返す
- [ ] AC-5: base fixtureはPASSし、structural mutationとunsupported schemaは期待rule / fingerprintまたはdiagnosticでfail-closedになる
- [ ] AC-6: L2 local fast-pathとL3 authoritative re-derivationが同じclassification契約を使い、authoritative trust rootはL3だけである

---

## Orchestration移管ストーリー一覧（参照）

以下のストーリーはOrchestrationパッケージに移管済み。Quality Harnessのスコープ外。

| 旧US | タイトル | 移管理由 |
|------|---------|---------|
| US-001~004 | E-01 コンテキスト基盤全体 | Orchestration責務 |
| US-013~014 | E-04 session-state/resume | セッション管理 |
| US-015（状態永続化部分） | pause時session-state更新 | セッション管理 |
| US-023~026 | E-07 ライフサイクル管理全体 | Orchestration責務 |
| US-027~028 | orchestration.config.json | Orchestration設定 |
| US-030 | v1→v2マイグレーション | 両パッケージ横断 |
| US-045（FCP部分） | Fresh Context Protocol | コンテキスト管理 |
| US-050~054 | E-15 オーケストレーションコマンド | Orchestration |

---

## USサマリー

| Wave | Epic | US数 | Must | Should |
|------|------|------|------|--------|
| 1 | H-01 Biome | 3 | 3 | 0 |
| 1 | H-02 Phase Dependency | 7 | 6 | 1 |
| 1 | H-03 Traceability | 8 | 8 | 0 |
| 1 | H-04 Config v2 | 3 | 3 | 0 |
| 1 | H-05 ADR | 3 | 3 | 0 |
| 1 | H-06 HarnessError | 3 | 3 | 0 |
| **Wave 1小計** | | **27** | **26** | **1** |
| 2 | H-07 Nyquist | 4 | 3 | 1 |
| 2 | H-08 L2-L4 | 6 | 6 | 0 |
| 2 | H-09 Harness API | 4 | 4 | 0 |
| 2 | H-10 Quick Mode | 5 | 3 | 2 |
| 2 | H-11 エージェント統合 | 5 | 5 | 0 |
| **Wave 2小計** | | **24** | **21** | **3** |
| 3 | H-12 スキル品質 | 7 | 7 | 0 |
| 3 | H-13 Scheduled Gov | 4 | 2 | 2 |
| 3 | H-14 K回帰 | 3 | 3 | 0 |
| 3 | H-15 v0移行 | 2 | 2 | 0 |
| 3 | H-16 Signed Attestation | 3 | 3 | 0 |
| **Wave 3小計** | | **19** | **17** | **2** |
| 4 | H-17 World Model | 15 | 15 | 0 |
| **Wave 4小計** | | **15** | **15** | **0** |
| Future | H-F2 Phase 2拡張 | 5 | — | — |
| **v1合計** | | **85** | **79** | **6** |
| **全体（Future含む）** | | **90** | — | — |

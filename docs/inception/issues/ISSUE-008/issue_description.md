# ISSUE-008: 生成系スキルがメタデータタグを emit せず、L4 バリデータの前提が崩れている

## ステータス

- **状態**: ✅ **CLOSED**（Phase A / B-2 / B-3 / C-1/C-2/C-3 / D 着地 — B-1 は 2026-04-19 調査で撤回、v0.53.0 完了）
- **起票日**: 2026-04-18
- **更新日**: 2026-04-21（Phase A〜D 完了確認、B-1 は撤回で扱う）
- **発見契機**: メンテナへの外部FB「phasegate を導入しても生成コードに `@unit` / `@layer` が付かず、設計文書にも `@us-xxx` 系メタが付いていないのでは？」への実地検証。phasegate 自身のコードには正しく付与されているが、**それは phasegate 自身を AIDLC で育てる際にメンテナが手作業で付けてきたためであり、生成系スキル自身が付与を強制する仕組みは存在しない**ことが判明。
- **影響Unit**: agent_integration（スキル定義群）, harness_error（メタデータ欠落時の誘導）, biome_ast_engine（L1-001/L1-002 既存ルールとの接続）, ci_governance（新規テンプレ提供）
- **深刻度**: P1（L4 バリデータ群 — codebase-mapper / drift-detection / dead-code / doc-freshness-checker — の前提が満たされず、投じた AIDLC コストが下流検証まで到達しない）
- **優先度**: P1 — ISSUE-007（retrofit 導入）と並走で扱うべき。ISSUE-007 が「既存コードベースへの持ち込み障壁」、本 issue は「新規導入で AIDLC を回しても L4 まで繋がらない」を扱う双子。

## 実装履歴

| Phase | 版 | 内容 |
|---|---|---|
| Phase A | v0.47.0 | P1-1 生成コードへの @unit/@layer 付与指示 |
| Phase B-1 | v0.48.0→v0.49.0 | 設計文書 frontmatter 必須化 → 撤回（既存機構で概ねカバー済と判明） |
| Phase B-2 | v0.50.0 | `validate-metadata` CLI に `.md` 分岐追加 |
| Phase B-3 | v0.52.0 | pre-commit に `.md` 設計文書検証を接続 |
| Phase C-1/C-2/C-3 | v0.53.0 | テスト @story end-to-end + templates 実体化 |
| Phase D | v0.53.0 | templates/ 実体化（Phase C と同時） |

## 問題の概要

phasegate は CLAUDE.md で「全ソースファイル先頭に `// @unit <unit名>` `// @layer <layer名>` を記載」と規定し、L1 Biome AST ルール (`L1-001: require-unit-comment`, `L1-002: require-layer-comment`) で強制する設計になっている。しかし:

1. **実装系スキル（story-implementor / quick-implementor）には、コード生成時に `@unit` / `@layer` を書き込む指示が一切ない**。スキルは Clean Architecture 準拠・TDD 順序・AAA テスト等を厳格に指示するが、メタデータ付与は「L1 で落とされることで事後的に気づく」設計になっている。新規導入 PJ では L1 有効化前にコードが量産され、後から全ファイルに付け直す苦行が発生する
2. **設計文書側にも `@story-id` / `initial_creation` が emit されていない**。検証インフラ（`validateDesignDocument` + `markdown-story-annotation-parser` + `frontmatter-flag-parser`）は **実装済み**だが、logical-designer / domain-designer / unit-designer のスキル定義にはこれらの emit 指示が無い。かつ検証 CLI（`validate-metadata`）も pre-commit から呼ばれていない。結果、**検証器は存在するが emit されないので常に空振り、仮に emit しても呼ばれないので検出されない**二重の wiring ギャップ状態
3. **テストコードへの `@story HXX-XX` 付与も実体化していない**。`docs/inception/_shared/cross_cutting_decisions.md` にはテストファイル時に `// @story HXX-XX` を付与する規約が書かれているが、unit-test-designer / unit-test-logic-designer / it-test-designer のスキル定義には付与指示が含まれていない。検証ロジック `MetadataValidator.validateTest` は実装済みだが CLI dispatch に接続されておらず、`TraceabilityMetadataPolicyAdapter` も `@story` をエラー化しない（regex で読むのみ）

結果として、AIDLC フルフロー（29 スキル中 9 フェーズ）を回した投資が L4（drift-detection / dead-code / consistency-checker / doc-freshness-checker）まで到達しない。**上流ドキュメントを書いているのに、コードと突き合わせる最後の細い接続線が切れている**状態。

---

## 2026-04-19 追加調査: 真の根本原因は「wiring ギャップ」と「検証器の二重実装」

当初「メタデータ検証機能そのものが未実装」と推定したが、v0.48.0 で冗長な frontmatter 機構を追加 → v0.49.0 でロールバックした過程で、**検証ロジックは既に多層的に実装済みだが 3 つの接続線が切れている**ことが判明した。以下が 2026-04-19 時点で実地検証した結果。

### 発見 1: メタデータ検証は 2 系統で並存している

| 系統 | 実装箇所 | 検証内容 | 呼ばれ方 |
|---|---|---|---|
| **A. リッチなドメインサービス** | `scripts/harness/traceability-model/domain/services/metadata-validator.ts` | `validateImplementation` (L75): `@unit` が Unit 定義と一致するか、`@layer` が正規語彙か / `validateTest` (L196): `@story` が StoryCatalog に存在するか / `validateDesignDocument` (L133): `@story-id` インライン注釈の配置と StoryCatalog 存在 | CLI `phasegate validate-metadata` 経由のみ（`main.ts:557-567`）。**ただしこの CLI は pre-commit にも CI にも接続されていない** |
| **B. 軽量な regex アダプター** | `scripts/harness/validator-system/infrastructure/adapters/traceability-metadata-policy-adapter.ts:18-19` | `@unit` / `@layer` の存在のみ regex でチェック（`@story-id` / `@story` は regex で読みはするがエラー化していない） | `phasegate pre-commit` → `runL2ValidatorsUseCase` 経由で実行される（`scripts/harness/integrations/pre-commit.ts` + `templates/.husky/pre-commit`） |

結果、**pre-commit で実際に動いている検証は B のみ**で、`@unit` / `@layer` 欠落は検出されるが、`@story` / `@story-id` は検出されない。リッチな A 系統は「実装済みだが誰にも呼ばれない dead code 状態」になっている部分がある。

### 発見 2: 3 軸 wiring ギャップ

機能が存在しても「呼ばれない」「emit されない」「強制されない」のいずれかで失効している:

| 軸 | ギャップ内容 | 具体的な証拠 |
|---|---|---|
| **(a) Skill → emit 欠落** | スキル出力にタグ付与指示が無く、生成物にタグが付かない | `story-implementor` / `quick-implementor` に `@unit` / `@layer` 指示が無かった（Phase A / v0.47.0 で修正済）。`unit-test-logic-designer` 等に `@story` 指示が無い。`logical-designer` 等に `@story-id` インライン注釈の指示が無い |
| **(b) Validator → CLI 露出欠落** | UseCase は実装済みだが CLI に配線されていない | `ValidateMetadataCommandHandler`（`validate-metadata-command-handler.ts:23-28`）は `validateImplementationMetadataUseCase` のみ DI で受け取る。`validateTest` / `validateDesignDocument` の UseCase はファイルとしては存在するが CLI dispatch（`main.ts:557-567`）に接続されていない |
| **(c) CLI → 自動実行欠落** | CLI は存在するが pre-commit / CI で呼ばれない | `phasegate pre-commit` が呼ぶのは `runL2ValidatorsUseCase` のみで、`validate-metadata` CLI は呼ばない。L1 Biome ルール（L1-001 / L1-002）は `phasegate lint` 経由で L2 に巻き込まれて実行されるため @unit/@layer は救済されるが、@story / @story-id は救済されない |

### 発見 3: `@story-id` / initial_creation フラグは **部分実装済み**

| 機構 | 状態 |
|---|---|
| `@story-id` インライン注釈の parser / validator | `validateDesignDocument` + `markdown-story-annotation-parser` で実装済み |
| `traceability.initial_creation: true` frontmatter bool | `frontmatter-flag-parser.ts` で解釈済み（新規設計文書には `@story-id` 注釈を強制するかの分岐フラグ） |
| 設計文書の配置パス convention `docs/product/construction/{unit}/` | Unit↔ドキュメント対応を機械的に導出可能（既に運用中） |
| **スキルから上記を emit する指示** | **欠落**。どのスキルも `@story-id` も `initial_creation: true` も emit していない |

よって「新規の YAML frontmatter 機構を追加する」方向ではなく、**既存機構を emit する指示をスキルに入れる + 既存 CLI を pre-commit から呼ぶ**方向が正しい修正。

---

## 確認された問題（severity 順）

### P1-1. 実装系スキルが `@unit` / `@layer` 付与を指示していない

**影響**: 新規 PJ で story-implementor / quick-implementor を使って生成したソースファイルには @unit/@layer が付かない。L1 Biome ルールを有効化した瞬間に全ファイルが違反となり、導入初期の挫折ポイントになる。

**現状**（直接検証済み）:
- `.claude/skills/story-implementor/SKILL.md` — `@unit` / `@layer` / `@story` のいずれも本文に登場しない（`grep` 結果 0 件）
- `.claude/skills/quick-implementor/SKILL.md` — 「L1チェック: `@unit` / `@layer` コメントの**維持**を確認」としか書かれておらず、**新規生成時の付与指示がない**（既存コードには付いている前提）
- CLAUDE.md L34-35 の規約は存在するが、スキル実装指示に反映されていない
- phasegate 自身の `scripts/harness/` 配下には正しく付与されている（例: `scripts/harness/main.ts:2` に `@layer presentation`）。**これはメンテナの手作業の結果であり、スキルが emit したものではない**

**根本原因**: L1 Biome ルール (L1-001 / L1-002) を「事後的な防御網」として位置付け、スキル側に「生成時に必ず書け」という前方誘導が入っていない。phasegate 自身の運用ではメンテナが手で補完していたため問題が顕在化していなかった。

**修正案**:

#### 案 A: スキル定義にメタデータ付与を明記（推奨・最小コスト）

1. story-implementor / quick-implementor の「コード生成」ステップに以下を追加:
   ```markdown
   **必須メタデータ**: 新規ソースファイル作成時、先頭に必ず以下を記述する
   ```typescript
   // @unit <対象Unit名 — logical_design.md の Unit ID から引用>
   // @layer <domain|application|infrastructure|presentation>
   ```
   `@layer` は生成ファイルの配置パス（`domain/` / `application/` / 等）から機械的に決定できる。
   ```
2. domain-designer / unit-designer 等、コード生成に至らずとも Unit 帰属を決定するスキルの出力に Unit ID を明示する箇所を追加

#### 案 B: CLI で scaffold する方向に倒す（ISSUE-007 P1-3 との合流）

1. `npx phasegate scaffold-source --unit <id> --layer <name> --path <file>` を実装
2. テンプレに `@unit` / `@layer` を埋め込んだ状態でファイルを生成
3. スキル側は「Step X: scaffold コマンドを実行してからコード本文を書き始める」と誘導

**案 A が本命、案 B は ISSUE-007 P1-3 と共通基盤化できれば価値が二重に出る**。

**関連**:
- `.claude/skills/story-implementor/SKILL.md`
- `.claude/skills/quick-implementor/SKILL.md`
- `scripts/harness/biome-ast-engine/` — 既存 L1-001 / L1-002 ルール（修正不要、接続先）

---

### P1-2. 設計文書 frontmatter 規定（**既存実装で概ねカバー済 — 2026-04-19 調査で前提更新**）

**2026-04-19 追加調査の結論**: 当初「設計文書↔コードの機械可読トレーサビリティが存在しない」と書いたが、これは既存実装の把握不足だった。以下の機構が既に実装されている:

| 機構 | 実装箇所 | 役割 |
|---|---|---|
| コード側 `@unit` / `@layer` タグ検証 | `scripts/harness/traceability-model/domain/services/metadata-validator.ts:75` (`validateImplementation`) | `@unit` が Unit 定義に存在するか、`@layer` が正規語彙かを検証 |
| テスト側 `@story` タグ検証 | 同:196 (`validateTest`) | `@story` が `HXX-XX` 形式で StoryCatalog に存在するかを検証 |
| 設計文書の `@story-id` **インライン注釈** | 同:133 (`validateDesignDocument`) + `markdown-story-annotation-parser.ts` | 設計要素と StoryId の 1対N 対応を検証（独立行・直後要素必須・StoryCatalog 存在チェック） |
| `traceability.initial_creation` YAML frontmatter bool | `scripts/harness/traceability-model/infrastructure/parsers/frontmatter-flag-parser.ts` | 初期設計文書には `@story-id` 注釈を強制するか否かの条件分岐フラグ |
| Unit↔ドキュメント対応 | 配置パス convention `docs/product/construction/{unit}/*.md` | ディレクトリ名で機械的に導出可能 |

**つまり「設計↔コードの unit/story 単位のトレーサビリティ」は既に機械化済み**であり、当初提案した汎用 YAML frontmatter（`unit_id` / `user_story_ids` / `layer_scope` / `last_reviewed`）は以下の理由で冗長:

- `unit_id` → 配置パス `docs/product/construction/{unit}/` から既に推論可能
- `user_story_ids` → `@story-id` インライン注釈で既にストーリー紐付けが取れる
- `layer_scope` → 消費する validator / usecase が存在しない（追加しても dead data）
- `last_reviewed` → `doc-freshness-checker` は `DocumentAge`（git log mtime）を正として使っており、frontmatter 日付は参照しない

**撤回した試行**: v0.48.0 (`77546e1`) で logical-designer / domain-designer / unit-designer の SKILL.md に上記 4 フィールドの frontmatter 必須化セクションを追加したが、本調査結果に基づき v0.49.0 で **ロールバック済**。

**残存する論点（別 issue で扱うべき）**:

- 現状 `validateDesignDocument` は `traceability.initial_creation: true` の設計文書にしか `@story-id` 注釈を強制しない。**通常の設計更新でも強制するか**は運用ポリシーの再検討事項
- 設計文書の配置パス `{unit}` 部分と文書内で言及される `@unit` タグの**相互参照検証**は未実装（ただしミスマッチ発生頻度は低い想定）
- `docs/product/units/integration_contract.md` のような **Unit 横断文書** は上記 convention の対象外で、どの Unit 群を扱うかを機械的に取得する経路がない

**関連**:
- `scripts/harness/traceability-model/domain/services/metadata-validator.ts` — 主実装
- `scripts/harness/traceability-model/infrastructure/parsers/frontmatter-flag-parser.ts` — 既存 frontmatter parser（限定用途）
- `templates/` — **現在空ディレクトリ**（P2-4 で別途対応）

---

### P1-3. テストコードへの `@story` タグが emit されていない

**影響**: US↔テストの逆引きが不能。「US-H09-01 をカバーするテストはどれか」「このテストが落ちた場合、どの US のどの AC が壊れたのか」を機械的に辿れない。nyquist / test-coverage-checker が story 単位のカバレッジを集計したくても、紐付け情報が無い。

**現状**:
- `docs/inception/_shared/cross_cutting_decisions.md:22-23` — テストファイルへの `// @story HXX-XX` 付与ルールが **規約としては定義済み**
- unit-test-designer / unit-test-logic-designer / it-test-designer / scenario-test-designer 各スキルには付与指示なし
- 設計文書（unit_test_design_plan.md 等）には `対応ストーリー: H01-01, H01-02` が人間可読で書かれるが、テスト実装コードへの紐付け自動化フローがない

**根本原因**: 規約の存在が「スキル仕様」に伝わっていない。cross_cutting_decisions.md はメンテナの記憶を通じてのみ運用されている。

**修正案**:

1. 各テスト設計/実装スキルの「テストコード生成」ステップに `// @story <ID>` 付与を必須化
2. L1 ルールに `require-story-tag-in-tests` を追加（テストファイル限定、`__tests__/` 配下でのみ発火）
3. test-coverage-checker に「`@story` タグ別カバレッジ」集計を追加

**関連**:
- `.claude/skills/unit-test-designer/SKILL.md`, `unit-test-logic-designer/SKILL.md`, `it-test-designer/SKILL.md`, `scenario-test-designer/SKILL.md`
- `scripts/harness/biome-ast-engine/` — L1 新規ルール追加先
- `scripts/harness/test-coverage-checker/` — 集計機能拡張先

---

### P2-4. `templates/` ディレクトリが空（実体テンプレ無し）

**影響**: `package.json` の `files` フィールドに `templates/**` が宣言されているが、実体が 0 件。P1-1 / P1-2 で提案するテンプレ配布が物理的に成立しない。

**現状**（直接検証済み）:
- `ls /Users/jumpei/dev/PhaseGate/templates/` 結果 0 件
- しかし `package.json:36` で `"templates/**"` を npm publish 対象に含めている

**根本原因**: 「templates は将来配布する」意図だけが残り、実装が追随していない。

**修正案**: P1-1 / P1-2 / P1-3 の修正案で生成する最小 viable テンプレをここに配置し、`phasegate init` 時にコピーする仕組みを整える（ISSUE-007 P1-3 `scaffold-design` CLI と共通基盤化）。

---

## 非対象（スコープ外）

- **既存コードベースへのメタデータ一括付与スクリプト**: AI による自動推定は phasegate の「AI 非依存」原則に反する。ユーザーが手で付けるか、ISSUE-007 P1-1 baseline 機構で grandfather 扱いとする。
- **メタデータスキーマの完全仕様化**（例: unit_id の命名規則、story_id の階層構造）: 現状の運用実績から最小限の規定に留め、過剰規格化しない。
- **他の AI プラットフォーム向けスキル定義の並行整備**: Claude Code 向けスキルのみ対象。

## 受け入れ基準

**Phase A（完了 / v0.47.0）**:
- [x] story-implementor / quick-implementor のスキル定義に、新規ソース生成時の `@unit` / `@layer` 付与指示が明記される

**Phase B（設計文書 @story-id end-to-end）**:
- [~] ~~B-1: logical-designer / domain-designer / unit-designer の Phase 2 成果物指示に `@story-id` インライン注釈 + `traceability.initial_creation: true` frontmatter emit が明記される~~ — **撤回**（v0.49.0、既存機構で概ねカバー済）
- [x] B-2: `ValidateMetadataCommandHandler` に `validateDesignStoryAnnotationsUseCase` が DI され、`main.ts:557` の `validate-metadata` CLI で `.md` ファイルが `validateDesignDocument` に分岐される（v0.50.0）
- [x] B-3: `runL2ValidatorsUseCase` または `TraceabilityMetadataPolicyAdapter` 経由で、staged な `.md` 設計文書に対して `@story-id` 注釈検証が pre-commit で実行される（v0.52.0）

**Phase C（テスト @story end-to-end）**:
- [x] C-1: unit-test-logic-designer / it-test-logic-designer / scenario-test-logic-designer のテスト生成指示に `// @story HXX-XX` 付与が明記される（v0.53.0）
- [x] C-2: テスト側 `@story` 検証が CLI 経由で呼び出し可能になる（`ValidateMetadataCommandHandler` 拡張 **または** L1 Biome `require-story-tag-in-tests` 追加）（v0.53.0）
- [x] C-3: `__tests__/**/*.ts` に対して `@story` 検証が pre-commit で実行される（v0.53.0）

**Phase D（テンプレ実体化）**:
- [x] `templates/` 配下に実体テンプレ（`source.template.ts`, `logical_design.template.md`, `test.template.ts`）が配置される（v0.53.0）

**撤回分**:
- [~] ~~logical-designer / domain-designer / unit-designer のスキル定義に、汎用 YAML frontmatter（`unit_id`, `user_story_ids`, `layer_scope`）の必須化が明記される~~ — **撤回**（2026-04-19 調査で `@story-id` インライン注釈 + 配置パス convention + 既存 `MetadataValidator.validateDesignDocument` により概ねカバー済みと判明。v0.48.0 → v0.49.0 でロールバック済）
- [~] ~~pointer-validator / doc-freshness-checker が汎用 frontmatter メタデータを検証対象に含める~~ — **撤回**（上記に連動）

**総合検証**:
- [x] メンテナの別 PJ で新規実装を行い、生成物に `@unit` / `@layer` / `@story` / `@story-id` が自動で含まれ、かつ pre-commit で欠落が検出されることを確認する（ISSUE-013 ドッグフーディングで確認）

## 推奨実装順（2026-04-19 再計画）

「3 軸 wiring モデル」に基づき、Phase B / C は **emit 指示 × CLI 露出 × 自動実行** の 3 タスク構造に再設計する。

### Phase A（完了 / v0.47.0）: ソース @unit / @layer

- P1-1 — story-implementor / quick-implementor に @unit/@layer 付与指示を追記
- 結果: 新規生成コードから @unit/@layer が出るようになり、`TraceabilityMetadataPolicyAdapter` （pre-commit L2 系統 B）と L1-001/L1-002（lint 経由）の両方で検出されるようになった

### ~~Phase B（v0.48.0 で追加 → v0.49.0 で撤回）~~: 設計文書 frontmatter

- ~~P1-2 — 汎用 YAML frontmatter 機構を追加~~ — **撤回**
- 理由: 既存の `@story-id` インライン注釈 + `traceability.initial_creation` フラグ + 配置パス convention で概ねカバー済みと判明

### Phase B（再設計・次の最優先）: 設計文書 @story-id の end-to-end 完成

既存機構（`validateDesignDocument` + `markdown-story-annotation-parser`）を **emit × 露出 × 実行** の 3 軸で接続する。

| タスク | スコープ | 内容 | 接続先 |
|---|---|---|---|
| **B-1** | quick / docs | `logical-designer` / `domain-designer` / `unit-designer` の Phase 2 成果物指示に `@story-id` インライン注釈 + `traceability.initial_creation: true` frontmatter を emit させる | 発見 1 軸 (a) |
| **B-2** | story / source | `ValidateMetadataCommandHandler` に `validateDesignStoryAnnotationsUseCase` を DI 追加。`main.ts:557-567` の `validate-metadata` コマンドでファイル拡張子（`.md` / `.ts`）で分岐し、design doc には `validateDesignDocument` を呼ぶ経路を追加 | 発見 1 軸 (b) |
| **B-3** | quick / config | `scripts/harness/integrations/pre-commit.ts` または `runL2ValidatorsUseCase` に `.md` ファイル（`docs/product/construction/` 配下）を対象とする `validateDesignDocument` 呼び出しを追加。あるいは `TraceabilityMetadataPolicyAdapter` に md ファイル分岐を追加 | 発見 1 軸 (c) |

### Phase C: テスト @story の end-to-end 完成

| タスク | スコープ | 内容 | 接続先 |
|---|---|---|---|
| **C-1** | quick / docs | `unit-test-logic-designer` / `it-test-logic-designer` / `scenario-test-logic-designer` のテスト生成指示に `// @story HXX-XX` emit を追加 | 発見 1 軸 (a) |
| **C-2** | story / source | `ValidateMetadataCommandHandler` に `validateTestStoryMetadataUseCase` を DI 追加、CLI 分岐で `__tests__/**/*.ts` を対象に呼び出す。**または** L1 Biome に `require-story-tag-in-tests` を追加（テストファイル限定） | 発見 1 軸 (b) |
| **C-3** | quick / config | Phase B-3 と同一 pre-commit 経路で test ファイル検証を追加 | 発見 1 軸 (c) |

### Phase D（Phase B/C と並走可）: templates/ 実体化

- P2-4 — `templates/` 配下に実体テンプレ（`source.template.ts`, `logical_design.template.md`, `test.template.ts`）を配置
- ISSUE-007 P1-3 `scaffold-design` CLI と共通基盤化

### 修正後に成立するトレーサビリティ経路

```
設計文書 @story-id ─┐
                    ├─→ validateDesignDocument (既存) ─→ pre-commit (B-3 で接続)
テスト @story ──────┤
                    ├─→ validateTest (既存) ─→ pre-commit (C-3 で接続)
ソース @unit/@layer ┘
                    └─→ validateImplementation (既存) + TraceabilityMetadataPolicyAdapter (既存)
                         └─→ pre-commit (既存経由で接続済 / Phase A で emit 達成済)
```

## 関連

- メンテナへの外部 FB（2026-04-18）「生成コードに @unit/@layer が付いていないのでは」
- ISSUE-007（retrofit 導入、P1）と独立かつ並走関係。本 issue は「新規導入で AIDLC を回しても L4 まで繋がらない」を扱い、ISSUE-007 は「既存コードベースへの持ち込み障壁」を扱う
- ISSUE-006（Quick/Full 判定、優先度引き下げ済）と独立
- `CLAUDE.md:34-35` — @unit / @layer 規約（本 issue で「規約は存在するが emit 経路が欠落」の根拠）
- `docs/inception/_shared/cross_cutting_decisions.md:22-23` — @story 規約（同上）
- L1-001 / L1-002 既存 Biome ルール（本 issue の修正案の接続先）

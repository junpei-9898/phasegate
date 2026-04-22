# ISSUE-007: 既存プロジェクトへの後付け導入時、phase-gate が既存コードに発火しまくり、かつエラーから修正手順が読み取れない

## ステータス

- **状態**: 🟡 **IN PROGRESS**（Wave 1 = v0.65.0 / Wave 2 = v0.66.0 / Wave 3 = v0.67.0 / Wave 4 = v0.69.0 / Wave 5 = v0.70.0 / Wave 6 = v0.71.0 / Wave 7 = v0.72.0 / Wave 8 = v0.73.0 / Wave 9 = v0.74.0 着地 — Wave 8 dogfood で見つかった schema blocker と、Wave 9 dogfood で見つかった `<unit-id>` プレースホルダ未置換を解消済み。acceptance 全 8 条件成立）
- **起票日**: 2026-04-18
- **更新日**: 2026-04-22（Wave 9 scaffoldCommand の `<unit-id>` 実 unit 置換）
- **発見契機**: メンテナ自身の別 PJ への phasegate 後付け導入時。「phase-gate エラーが連発して作業が進まない」「エラー文から何をどう修正すれば解除できるかが分からない」という実地での痛み。ISSUE-006 (Quick/Full 判定) よりも優先度が高いと判断。

## 実装履歴

| Wave / 版 | 内容 |
|---|---|
| Wave 1 (v0.65.0) | H12-01: `npx phasegate baseline` CLI + `.phasegate/baseline.json` 生成 + `phasegate.config.json.baseline` schema 拡張 (ci-governance Unit) |
| Wave 2 (v0.66.0) | H12-02: pre-tool-use hook に baseline grandfather 統合 — `BaselineGrandfatherQueryPort` + `CiGovernanceBaselineGrandfatherAdapter` + `HandlePreToolUseUseCase` grandfather skip (phase-gate / full-mode / story-reflection) / PROTECTED_FILE は対象外 |
| Wave 3 (v0.67.0) | H12-03: HarnessError / ErrorDefinition / HarnessErrorContract に `suggestedSkill` / `scaffoldCommand` / `templatePath` 3 optional フィールド追加 / L2-001 registry に default 値 populate / agent-integration pre-tool-use hook のエラーメッセージに actionable 行（scaffold CLI + templatePath）を挿入 / `ErrorGuidanceQueryPort` + `HarnessErrorGuidanceAdapter` (cross-Unit port) |
| Wave 4 (v0.69.0) | H12-04: `npx phasegate scaffold-design --unit <id> --phase <name>` CLI 実装（ci-governance Unit）。`templates/*.template.md` を読み取り `{{unit}}` 置換して `docs/product/construction/{unit}/*.md` を生成。5 phase 全対応（logical/domain/uiux/unit-test/it-test）。`--force` なしでは既存保護。L2-001 `defaultTemplatePath` を `docs/templates/` → `templates/` に修正し Wave 3 の dead reference を解消 |
| Wave 5 (v0.70.0) | H12-05: `docs/guide/retrofit-adoption.md` 執筆。既存 PJ 後付け導入の end-to-end チュートリアル（init → baseline → scaffold-design の 4 ステップ、actionable phase-gate エラーの読み方、baseline 卒業手順、トラブルシュート QA） |
| Wave 6 (v0.71.0) | H12-06: Wave 5 の dogfooding で判明したコード側不整合を修正。`baseline.enabled` の default を `false` → `true` に変更（`harness-config-config-query-adapter.ts`）。`npx phasegate baseline --dry-run --json` の出力キーを `entries` → `files` に変更し `.phasegate/baseline.json` 保存形式と整合。ISSUE-007 の設計意図（retrofit の摩擦解消）を実装が正しく反映するようになった |
| Wave 7 (v0.72.0) | H12-07: v0.71.0 の挙動に合わせてドキュメント群を更新。`docs/guide/retrofit-adoption.md` の baseline.json スキーマ例を実機形式（`version: "1.0"` / `algorithm` / `files`）に修正 + 「init 後 config 手動編集」の誤記述を削除、`docs/guide/cli-reference.md` に `Scaffold Design` セクション追加、`README.md` / `README.ja.md` に `scaffold-design` コマンドと retrofit-adoption.md リンクを追加 |
| Wave 8 (v0.73.0) | H12-08: Wave 7 の end-to-end dogfood で発見した schema/code 不整合を解消。`harness-config-v2.schema.json` に `project.paths.source` / `project.paths.docs` を追加し、`src/` 配下を使う一般 Node.js プロジェクトでも phase-gate が機能するようになった（旧 schema は `additionalProperties: false` で `project.paths` 自体を拒否していたため、adapter が読む `config.project?.paths?.source` は production では常に default `['scripts/harness']` にフォールバックしていた）。`retrofit-adoption.md` に Step 1 として source path override の設定例を追加 |
| Wave 9 (v0.74.0) | H12-09: Wave 8 の acceptance #8 検証 dogfood で発覚した actionable エラーの不具合を解消。従来は L2-001 registry の `defaultScaffoldCommand` が静的文字列 `npx phasegate scaffold-design --unit <unit-id> --phase logical` のまま出力されており、ユーザーが手で `<unit-id>` を置換する必要があった。`HandlePreToolUseUseCase` 側で scaffold 行出力時に unit ID を実値に置換するよう修正（PHASE_GATE: `metadata.unitId`、FULL_MODE_REQUIRED: `WriteTargetScope.fromPath` による targetFilePaths 導出）。これで acceptance #5（実際のエラー表示に次のアクションが明示される）が実質的な actionable 状態になり、acceptance #8（retrofit 導入で実用的に動作する）も完遂した |
- **影響Unit**: phase_dependency_model（gate 判定ロジック）, harness_error（エラー情報設計）, agent_integration（pre-tool-use hook）, ci_governance（新規 CLI）
- **深刻度**: P1（OSS として retrofit 導入経路が事実上封鎖されており、採用の最大の間口が狭まっている）
- **優先度**: P1 — 新規 PJ への導入は回るが、既存 PJ への持ち込みは現状ほぼ不可能。これを放置すると phasegate は「最初から AIDLC で組む PJ 専用ツール」という強い制約のまま広がらない

## 問題の概要

`npx phasegate init` で既存プロジェクトに後付け導入した瞬間、以下の 2 つの痛みが同時に発生する:

1. **既存コード全てが phase-gate の対象になる**: 既存プロジェクトには `docs/product/construction/{unit}/logical_design.md` などの設計文書が当然存在しない。しかし pre-tool-use hook は新規ファイルと既存ファイルを区別せず、どんな Edit/Write も「設計文書が無い」で block する。結果として**通常の保守作業が 1 件もできなくなる**
2. **エラーから修正手順が読み取れない**: gate が発火した際のエラーメッセージは「何が欠けているか」までしか書かれておらず、「どのスキルで作るか」「最小テンプレはどこにあるか」「自動 scaffold できるか」が一切示されない。ユーザーは自力でドキュメントを横断して調査する必要があり、初回導入で離脱する致命的な摩擦点になっている

この 2 つが組み合わさることで、**retrofit 導入 = phase-gate を即座に disable する運用**という回避パターンが発生し、phasegate の中核価値である「phase-gate 強制」が骨抜きになる。

## 確認された問題（severity 順）

### P1-1. Baseline / Grandfather 機構が存在しない

**影響**: 既存プロジェクト導入時、設計文書の無いファイルを触るたびに gate が発火する。実際のユースケースとして、「既存バグを修正したいだけなのに logical_design.md の作成を要求される」「タイポ 1 文字修正でも block される」が頻発する。

**現状**:
- `phaseDependencies` は preset (`full` / `standard` / `minimal` / `custom`) を持つが、**いずれも「導入時点のコード」を考慮しない**
- pre-tool-use hook は変更対象ファイルの `@unit` → 該当 Unit の設計文書存在 → ブロック/許可 という判定。**新規ファイルか既存ファイルかの区別なし**
- 既存ファイルを phasegate 管理下に段階的に取り込むための scaffold/opt-in 経路が無い

**根本原因**: phase-gate の設計思想が「新規プロジェクトをゼロから AIDLC で組む」を前提にしており、**既に動いているコードベースを持ち込むシナリオの設計が抜け落ちている**。

**修正案**:

#### 案 A: `phasegate baseline` コマンド（推奨）

1. `npx phasegate baseline` を実行すると、現時点の全ソースファイルのリスト + sha1 を `.phasegate/baseline.json` に保存
2. pre-tool-use hook の phase-gate 判定を拡張:
   - 変更対象が baseline に **含まれる** ファイル → gate をスキップ（grandfather 扱い）
   - 変更対象が baseline に **含まれない** 新規ファイル → 通常通り gate 適用
   - 変更対象が baseline に含まれるが構造的変更（新規 export 追加、レイヤー変更等）を伴う場合 → warn または block（要議論）
3. `phasegate.config.json` に `baseline: { enabled: true, path: ".phasegate/baseline.json" }` を追加
4. `npx phasegate baseline --update` で選択的にファイルを baseline から外せる（設計文書を整備して phasegate 管理下に取り込む導線）

#### 案 B: `retrofit` preset

1. `phaseDependencies.preset: "retrofit"` を追加
2. retrofit preset では:
   - 既存ファイル編集 → `warn` レベル（block しない）
   - 新規ファイル作成（scripts/harness/ 配下）→ 通常通り block
   - 警告は「いずれは設計文書を整備してください」という促し
3. プロジェクトが成熟したら `standard` / `full` preset に昇格

**案 A が本命、案 B は案 A の初期段階 / 簡易版**として両立可能。案 A は「どこから適用するか」を明示的に管理でき、案 B は「とりあえず warn だけ」を選べる。

**関連コード**:
- `scripts/harness/phase-dependency-model/` — gate 判定ロジック
- `scripts/harness/agent-integration/` — pre-tool-use hook
- `phasegate.config.json` — スキーマ拡張

---

### P1-2. phase-gate エラーが actionable でない

**影響**: エラーを見たユーザーが「次に何をすべきか」を即座に判断できない。`HarnessError` の設計思想は「AI agent が self-correct できる形式」だが、**phase-gate エラーには fix 情報が欠けている**。人間ユーザーはドキュメントを漁る必要があり、AI エージェントも fix コマンドを推定できない。

**現状（再現）**:
```
成果物が不足しています: docs/product/construction/{unit}/logical_design.md
→ phase gate prerequisites are not met
```

ここから読み取れるのは「ファイルが無い」だけで、以下はユーザーが自力で調べる必要がある:
- そのファイルを作るスキル（`/logical-designer`）
- 最小構造のテンプレ（何を書けばいいのか）
- scaffold CLI の有無（手動で書かず CLI で生成できるか）
- そもそもスキル経由で作らず、`touch` で空ファイル置いたら回避できるのか

**根本原因**: `HarnessError` の phase-gate エラー定義に `suggestedSkill` / `scaffoldCommand` / `templatePath` のような fix 誘導フィールドが無い。ADR 参照はあるが、ADR は「なぜ」を説明するもので「次に何をするか」を示すものではない。

**修正案**:
1. `HarnessError` のスキーマを拡張し、phase-gate カテゴリのエラーに必須フィールドを追加:
   - `suggestedSkill`: エラー解消に使うべきスキル名（例: `/logical-designer`）
   - `scaffoldCommand`: 自動生成 CLI（例: `npx phasegate scaffold-design --unit harness-api --phase logical`）
   - `templatePath`: 既存テンプレのパス（例: `docs/templates/logical_design.template.md`）
2. phase-gate エラーメッセージのフォーマットを拡張:
   ```
   成果物が不足しています: docs/product/construction/harness-api/logical_design.md

   次にとるべき行動:
     ・スキルで作成: /logical-designer を起動して unit=harness-api を指定
     ・テンプレ生成: npx phasegate scaffold-design --unit harness-api --phase logical
     ・テンプレ参照: docs/templates/logical_design.template.md

   なぜこの gate があるか: ADR-013 (phase-gate による実装と設計の同期)
   ```
3. エラー定義自体を `HarnessError` レジストリで集中管理し、個別箇所でハードコードしない

**関連コード**:
- `scripts/harness/harness-error/` — エラー定義 / レジストリ
- `scripts/harness/phase-dependency-model/` — エラー発行箇所
- `scripts/harness/presentation/` — エラー表示フォーマッタ

---

### P1-3. 設計文書の scaffold CLI が存在しない

**影響**: P1-2 で提案した `suggestedSkill` / `scaffoldCommand` のうち、**scaffold CLI 自体が未実装**。現状ユーザーが設計文書を作るには `/logical-designer` 等のスキルを起動するか、手動で markdown を書くしかない。軽微な修正のために AIDLC フルスキルを回すのは心理的コストが高く、離脱誘因になる。

**現状**: `docs/product/construction/{unit}/` 配下の各ドキュメント（logical_design.md, domain_model.md 等）は、スキル経由 or 手書きでしか生成できない。既存の `npx phasegate init` はプロジェクト全体の初期化用で、個別 Unit の個別フェーズ文書は生成しない。

**修正案**:
1. `npx phasegate scaffold-design --unit <id> --phase <logical|domain|uiux|unit-test|it-test>` を追加
   - 該当する minimum viable template を `docs/product/construction/{unit}/` に配置
   - テンプレには「TODO: 本 unit の責務を記述」「TODO: エンティティを列挙」のような必須項目の placeholder を含める
   - 既存ファイルがある場合は **上書きせず warn**（破壊的操作を避ける）
2. テンプレは `docs/templates/` 配下に集約し、`phasegate init` 時にも配布
3. scaffold 後も phase-gate は通るが、placeholder のままだと L4 (drift-detection) で警告が出る設計にする（TODO 残存検出）

**関連コード**:
- 新規: `scripts/harness/ci-governance/application/use-cases/scaffold-design-usecase.ts` または適切な Unit
- 新規テンプレ: `docs/templates/logical_design.template.md` ほか
- 更新: CLI ルーター (`scripts/harness/main.ts`)

---

## 非対象（スコープ外）

- **Unit ごとの段階 opt-in**: 「設計済み Unit だけ gate 適用、未設計 Unit は L1/L2 metadata のみ」という案も有効だが、Baseline 機構 (P1-1) があれば実用上の痛みは解消できるため、本 issue では実装しない。将来的な別 issue として分離。
- **既存コードからの設計文書逆生成**: AI で既存コードから logical_design.md を自動生成する案は、phasegate の「AI 非依存」原則に反するため扱わない。scaffold は静的テンプレのみ。
- **Full AIDLC フェーズ数の削減**: ISSUE-006 と同じ理由で本 issue のスコープ外。

## 受け入れ基準

- [x] `npx phasegate baseline` コマンドが実装され、`.phasegate/baseline.json` に sha1 付きファイルリストを保存できる（v0.65.0 / H12-01）
- [x] pre-tool-use hook が baseline 内ファイルの編集で phase-gate をスキップする（ログに「grandfather」と明示）（v0.66.0 / H12-02）
- [x] `phasegate.config.json` に `baseline` セクションが追加され、スキーマバリデートされる（v0.65.0 / H12-01）
- [x] phase-gate エラーに `suggestedSkill` / `scaffoldCommand` / `templatePath` フィールドが追加される（v0.67.0 / H12-03）
- [x] 実際のエラー表示に次のアクション（スキル名 + scaffold CLI）が明示される（v0.67.0 / H12-03）
- [x] `npx phasegate scaffold-design --unit <id> --phase <name>` が実装され、minimum viable template を生成する（v0.69.0 / H12-04）
- [x] 既存 PJ に phasegate を後付け導入するチュートリアル（`docs/guide/retrofit-adoption.md` 相当）が追加される（v0.70.0 / H12-05）
- [ ] メンテナ自身の別 PJ で後付け導入を試し、作業が block されずに進行できることを確認する

## 推奨実装順

1. **Phase A（最優先）**: P1-1 Baseline 機構（案 A `phasegate baseline` + pre-tool-use hook 拡張）
   - これだけで「後付け導入が詰まない」状態になる
2. **Phase B**: P1-2 エラー actionability（HarnessError スキーマ拡張 + phase-gate エラーフォーマット改善）
   - P1-1 で触るファイルが明確になるので、Phase A 完了後に着手
3. **Phase C**: P1-3 scaffold CLI + retrofit-adoption ドキュメント
   - P1-2 の `scaffoldCommand` を実体化する位置付け

## 関連

- メンテナの別 PJ 後付け導入時の実地痛み 2026-04-18
- ISSUE-005（CLI / validator 機能不具合、CLOSED）と独立
- ISSUE-006（Quick/Full 判定、優先度引き下げ）と独立。本 issue が優先
- `skills/logical-designer/` — Phase B で `suggestedSkill` として参照
- `docs/ADR/ADR-013-story-reflection-gate.md` — 関連 ADR（phase-gate の意義）

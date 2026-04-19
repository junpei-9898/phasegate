# ISSUE-010: 既存設計文書 103 件への `@story-id` 注釈段階的補填

## ステータス

- **起票日**: 2026-04-19
- **発見契機**: ISSUE-008 Phase B-2 (`validate-metadata` CLI に `.md` 分岐を追加、v0.50.0) 導入後の全件検証で、`docs/product/construction/` 配下の 103 件の設計文書が `@story-id は必須です` エラーを返すことが判明
- **影響Unit**: ほぼ全 Unit の設計文書（adr-foundation, agent-integration, biome-ast-engine, ci-governance, config-foundation, fuse-hooks-engine, harness-api, harness-error, nyquist-validation, phase-dependency-model, phase2-extensions, quick-mode, regression-suite, skill-quality, traceability-model, validator-system）
- **深刻度**: P2（validator は動くが content-level の backlog。ISSUE-008 Phase B-3 で pre-commit 接続を入れるまでブロック要因にはならない）
- **優先度**: P2 — ISSUE-008 Phase B-3 より前に 100% 解消する必要はなく、文書を更新する PR ごとに段階的に解消する方針で十分

## 問題の概要

`MetadataValidator.validateDesignDocument` は以下の規則で `@story-id` 注釈の必須性を判定する:

| frontmatter 状態 | `requiresStoryIdAnnotation()` | 意味 |
|---|---|---|
| `traceability.initial_creation: true` | **false** | 初回作成文書 — 注釈は optional |
| `traceability.initial_creation: false` | true | 更新扱い文書 — 注釈必須 |
| frontmatter なし（既存文書の大半） | true | 更新扱い扱い — 注釈必須 |

現状 `docs/product/construction/` 配下の大半の文書は frontmatter 無しで作成されており、ISSUE-008 Phase B-2 で CLI が動くようになった結果、103 件が「注釈必須だが 0 件」として検出されている。

ISSUE-008 Phase B-1 で logical-designer / domain-designer / unit-designer スキルに「新規作成時は `initial_creation: true` frontmatter を emit、以降の改訂時は `@story-id HXX-XX` 注釈を付ける」指示を追加済みだが、**既に存在する 103 件については過去に遡って付与する作業が未実施**。

## 影響範囲

### 件数内訳（2026-04-19 時点）

| Unit | 件数 |
|---|---|
| validator-system | 7 |
| agent-integration, biome-ast-engine, ci-governance, fuse-hooks-engine, harness-api, harness-error, nyquist-validation, phase-dependency-model, phase2-extensions, regression-suite | 各 7（計 70） |
| adr-foundation, quick-mode, skill-quality | 各 6（計 18） |
| config-foundation | 5 |
| traceability-model | 3 |
| **合計** | **103** |

### 既存対策で済んでいる Unit

ISSUE-008 Phase B-2 付帯修正（v0.50.0）で以下 6 件の PASS を達成済:
- `adr-foundation/logical_design.md`（空行削除）
- `config-foundation/logical_design.md`（空行削除）
- `config-foundation/it_test_design.md`（空行削除）
- `traceability-model/it_test_logic.md`（standalone 注釈追加）
- `traceability-model/it_test_design.md`（standalone 注釈追加）
- `skill-quality/domain_model.md`（standalone 注釈追加）

## 推奨解決方針

### 方針 A: 段階的補填（推奨）

各文書を更新する PR で、併せて `@story-id` 注釈を追加する。具体的には:

1. 設計文書を編集する PR で、対応ストーリー ID（通常は冒頭の `> **対応ストーリー**: HXX-XX, HYY-YY` から取得可能）を standalone 行として冒頭付近に追加する
2. `@story-id` 行の直後には設計要素（H1 以外の heading / blockquote / 表など、空行ではない行）を置く
3. 複数ストーリーに跨がる場合は連続した注釈行として並べ、最後の注釈の直後に設計要素を置く

### 方針 B: 一括補填スクリプト（非推奨）

`> **対応ストーリー**: HXX-XX, HYY-YY` の人間可読メタデータから自動抽出して `@story-id` を機械的に付与するスクリプトを用意する。

- **利点**: 103 件を一度に解消できる
- **欠点**: 機械変換による誤配置（例: Unit 横断の注釈と個別の設計要素に紐づく注釈の区別がつかない）のリスク。phasegate の「AI 非依存」哲学とも整合しない
- **判断**: ISSUE-010 ではスクリプトを使わず、方針 A で運用する

### 方針 C: 既存文書すべてに `initial_creation: true` frontmatter を追加（非推奨）

`traceability.initial_creation: true` を全文書に付与すれば「初回作成」扱いとなり注釈不要になる。

- **欠点**: 「初回作成ではない文書」に false-positive で frontmatter を付けることになり、セマンティクスを偽造する。将来の真の "初回" と区別できなくなる
- **判断**: 採用しない

## 受け入れ基準

- [ ] 各 Unit の「代表的な成果物（logical_design.md / domain_model.md / 各 test_design.md）」に対応ストーリー ID の `@story-id` 注釈が付与される
- [ ] `npx phasegate validate-metadata docs/product/construction/**/*.md` の FAIL 件数が 0 になる
- [ ] ISSUE-008 Phase B-3 で pre-commit 接続を入れた時点で、新規コミットが既存の 103 件欠落によって誤ブロックされないこと（pre-commit は `git diff --cached` 対象のみチェックする設計になっているはず）

## 推奨実装順

本 issue は 1 PR で全件一括対応しない。以下の順で段階的に解消する:

1. **Wave 1（最重要）**: `traceability-model` 残 3 件 — メタデータ検証自身の Unit なので最優先
2. **Wave 2**: `adr-foundation` / `config-foundation` — ISSUE-008 の修正で一部着手済み
3. **Wave 3**: その他の Unit 文書 — 該当 Unit を触る PR で便乗対応

各 Wave は独立の PR として起票し、cascade-updater / logical-designer / domain-designer の各スキルを使って対応する。

## 非対象（スコープ外）

- **`docs/inception/` 配下の plan 文書**: 本 issue は `docs/product/construction/` 配下の成果物のみが対象。inception 配下は設計中間物で CLI validator の対象にはしない方針
- **`docs/product/units/` 配下の Unit 定義文書**: Unit 横断 integration_contract.md 等は別途検討（ISSUE-008 Phase B-1 で Unit デザイナースキルに emit 指示は追加済だが、既存文書への遡及は別 issue で扱う）

## 関連

- **ISSUE-008 Phase B-2（v0.50.0）**: 本 issue を顕在化させた変更。`validate-metadata` CLI に `.md` 分岐を追加
- **ISSUE-008 Phase B-1（v0.47.0）**: logical-designer / domain-designer / unit-designer スキルに `@story-id` emit 指示を追加。**新規**作成時の付与は確保済
- **ISSUE-008 Phase B-3（未実施）**: pre-commit に validate-metadata を接続する。本 issue の解消ペースに影響を与える可能性あり
- `MetadataValidator.validateDesignDocument`: `scripts/harness/traceability-model/domain/services/metadata-validator.ts:133`
- `frontmatter-flag-parser.ts`: `scripts/harness/traceability-model/infrastructure/parsers/frontmatter-flag-parser.ts`

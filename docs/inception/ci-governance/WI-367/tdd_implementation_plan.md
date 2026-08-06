---
traceability:
  initial_creation: true
work_item: WI-367
---

# TDD実装計画: WI-367 / WI-368 / WI-369（GitHub issue #42）

<!-- @work-item-id WI-367, WI-368, WI-369 -->

## 1. スコープ

対象: GitHub issue #42 の 3 項目。Unit は `ci-governance`（CLI dispatch のみ `main.ts`）。

- WI-367 `templates list` / `templates show <name>`
- WI-368 inception plan テンプレート実体化 + `scaffold-inception`
- WI-369 `scaffold-design` の `paths.designDocs` 配線修正

影響する層: Domain（3 VO） / Application（3 UseCase） / Infrastructure（3 Adapter） /
Presentation（2 Handler） / CLI dispatch。DB・Frontend への影響なし。

受け入れ基準は `scenario_test_design.md` の SC-01〜SC-09。

## 2. 前提条件検証

- `implementation-readiness-checker` 相当の存在確認: 2026-08-06
- 判定結果: ⚠️ 一部を本 Phase 1 で新規作成して充足

| ファイル | 状態 |
|---------|------|
| `docs/product/construction/ci-governance/logical_design.md` | ✅ 既存 |
| `docs/product/construction/ci-governance/domain_model.md` | ✅ 既存 |
| `docs/product/construction/ci-governance/unit_test_design.md` | ✅ 既存 |
| `docs/product/construction/ci-governance/it_test_design.md` | ✅ 既存 |
| `docs/product/construction/ci-governance/coverage_report.md` | ✅ 既存 |
| `docs/inception/ci-governance/WI-367/logical_design.md` | ✅ 本 Phase 1 で作成 |
| `docs/inception/ci-governance/WI-367/scenario_test_design.md` | ✅ 本 Phase 1 で作成 |
| `docs/product/environment_contract.md` | ⚠️ 未整備（本リポジトリは Node/Vitest 単一環境のため実害なし） |

## 3. TDD実装順序（テストピラミッド準拠）

### 3.1 Unitテスト（RED → GREEN → REFACTOR）

| 対象 | テスト内容 | 実装 |
|------|----------|------|
| `TemplateName` | 正常 name の受理 / `..`・`/`・空文字・大文字の拒否 | `domain/value-objects/template-name.ts` |
| `TemplateCatalogEntry` | name と fileName の対応、`.template.md` / `.template.ts` からの name 導出 | `domain/value-objects/template-catalog-entry.ts` |
| `InceptionDocKind` | 5 kind の受理 / 未知 kind の拒否 / templateFileName / paths 追従の相対パス解決 | `domain/value-objects/inception-doc-kind.ts` |

### 3.2 ITテスト（RED → GREEN → REFACTOR）

| 対象 | テスト内容 | 実装 |
|------|----------|------|
| `FileSystemTemplateCatalogAdapter` | 実 fs での readdir 一覧、catalog 不一致名の拒否、traversal 名の拒否 | infrastructure |
| `TemplatesHandler` | list / show / 未知 name / name 未指定の exit code と出力 | presentation |
| `FileSystemInceptionDocWriterAdapter` | paths 追従の書き込み先解決、存在判定、書き込み | infrastructure |
| `ScaffoldInceptionUseCase` | dry-run / apply / 既存保護 / force 上書き | application |
| `ScaffoldInceptionHandler` | exit code 契約（0 / 2）、human / json 出力 | presentation |
| **ラウンドトリップ** | scaffold → `check-phase-gate --level 2` が blockers 空（SC-05 / SC-06） | 統合 |
| `buildCiGovernance` paths | `scaffold-design` の書き込み先が `paths.designDocs` に追従（SC-08-3） | composition root |

### 3.3 E2E（`__tests__/e2e/cli-harness.test.ts`）

| 対象 | テスト内容 |
|------|----------|
| `templates list` | exit 0、既知 name が出る |
| `templates show <name>` | exit 0、本文が出る |
| `templates show ../../package.json` | exit 2、内容が漏れない |
| `templates --help` / `scaffold-inception --help` | exit 0、契約表示 |

### 3.4 conformance

`known-harness-commands-conformance.test.ts` が赤になるので、
`KNOWN_HARNESS_COMMANDS` へ `scaffold-inception` / `templates` をソート順で追加する。

## 4. 環境検証チェックリスト（事前実行結果）

- [x] `npm install` 済み（worktree 直下）
- [x] `npm run test` のベースライン取得
- [x] `npx phasegate lint` / `validate --layer L2` が実行可能
- [x] `templates/` が harnessRoot 直下に存在

## 5. QA（不明点・確認事項）

### [Question] Q1: scaffold コマンドを新設するか `scaffold-design` を拡張するか

`scaffold-design` は `--unit` 必須・construction 5 phase 前提で、
`_shared` 配下や product 直下（unit を持たない文書）を表現できない。
`DesignPhase` に混ぜると「unit 必須なのに unit を使わない phase」という
不整合な VO になる。
**推奨案:** 別コマンド `scaffold-inception --kind <doc-kind>` を新設する。
`--dry-run` / `--apply` / `--force` / `--json` の契約は `scaffold-design` と同一にする。

[Answer]
別コマンド `scaffold-inception` を新設する（推奨案を採用）。
unit 軸を持つ construction 文書と、unit 軸を持たない inception/product 文書は
書き込み先の解決規則が異なるため、VO を分離した方が不変条件が素直になる。

### [Question] Q2: `templates show <name>` の path traversal 防御をどこに置くか

**推奨案:** 二重防御。(a) `TemplateName` VO で `..` / `/` / `\` を含む入力を拒否、
(b) 解決は catalog（readdir 結果）との**完全一致照合**のみで行い、
ユーザー入力文字列を `path.join` の引数にしない。

[Answer]
二重防御を採用（推奨案どおり）。(b) が本質的な防壁であり、
(a) は早期・明示的なエラーメッセージのために置く。

### [Question] Q3: plan テンプレートに QA の [Answer] を埋めるか

planning mode `embedded-qa` は `[Question]` と `[Answer]` の個数一致を要求する。
テンプレートに answer を最初から埋めると「人間の承認が済んだ」という
虚偽の証跡を機械的に生産することになる。
**推奨案:** テンプレートは QA セクションと `[Question]` の枠だけを持ち、
`[Answer]` は空欄のまま置く。ラウンドトリップテストは既定の
`interactive`（QA セクションの存在のみ要求）で検証し、`embedded-qa` は
人間が回答を書いて初めて通る、という設計意図をテストで固定する。

[Answer]
推奨案を採用。`embedded-qa` では scaffold 直後の文書が**通らない**ことも
テストで固定し、「テンプレートが承認を偽造しない」ことを回帰から守る。

### [Question] Q4: SKILL.md の構造ブロックを削除するか

**推奨案:** 削除しない。構造ブロックはエージェントが読む文脈として機能しており、
消すと skill 単体の可読性が落ちる。代わりに各 SKILL.md の
「計画ファイルの構成」直前に、正本テンプレートの取得手段
（`phasegate templates show <name>` / `phasegate scaffold-inception --kind <kind>`）を
明記するポインタを追加する。

[Answer]
推奨案を採用。SKILL.md 変更は integrity manifest の drift を起こすため、
同一コミットに `integrity:pin` の結果を含める（ADR-030）。

## 6. 前提条件・リスク

- **競合リスク**: `main.ts` と `known-harness-commands.ts` は issue #46 のブランチも
  触る。統合時は dispatch case とコマンド一覧の**両方**をマージし、
  conformance テストで集合一致を再確認すること。
- **integrity drift**: `skills/*/SKILL.md` は pin 対象。変更したら
  `phasegate integrity:pin` の結果を同一コミットに含める。
- **後方互換**: `buildCiGovernance` の第 3 引数はオプショナル。省略時は
  `docs/product/construction` を使う現行動作を維持する。
- **Full Mode**: quickMode の許可カテゴリ外（domain/application/infrastructure/
  presentation）を変更するため、実装前に `phasegate session begin --mode full` を実行する。

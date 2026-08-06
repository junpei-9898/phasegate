---
traceability:
  initial_creation: true
work_item: WI-368
---

# WI-368 ユニット/IT テストケース設計（scaffold-inception）

<!-- @work-item-id WI-368 -->

Unit: `ci-governance`

## Unit テスト

### InceptionDocKind（`__tests__/unit/ci-governance/value-objects/inception-doc-kind.test.ts`）

| ID | 観点 | 期待 |
|----|------|------|
| UT-CG-IDK-001 | 5 kind すべて | 生成できる |
| UT-CG-IDK-002 | 未知 kind | 許容値一覧を含む例外 |
| UT-CG-IDK-003 | `isValid` | 許容値 true / 未知値 false |
| UT-CG-IDK-004 | `templateFileName` / `docFileName` | kind ごとに正しい対応 |
| UT-CG-IDK-005 | 既定 paths での解決 | plan は `_shared` 配下、overview は product 直下 |
| UT-CG-IDK-006 | 移設 paths での解決 | `mydocs/...` に追従 |
| UT-CG-IDK-007 | 末尾スラッシュ付き paths | 二重スラッシュを作らない |
| UT-CG-IDK-008 | `equals` | 同 kind で true |

## IT テスト

### ScaffoldInceptionHandler（`__tests__/integration/ci-governance/scaffold-inception-handler.test.ts`）

実テンプレート（`templates/`）と実ファイルシステムを使う。

| ID | 観点 | 期待 |
|----|------|------|
| IT-CG-SIH-001 | 既定（dry-run） | exit 0、preview のみ、ファイルを書かない |
| IT-CG-SIH-002 | `--apply` | exit 0、テンプレート本文を書き込む |
| IT-CG-SIH-003 | `--kind product-overview --apply` | designDocs の親（product ルート）に書く |
| IT-CG-SIH-004 | 既存 + `--apply` + force なし | exit 2、**ユーザー編集内容を保持** |
| IT-CG-SIH-005 | 既存 + `--force` | exit 0、上書き |
| IT-CG-SIH-006 | `--dry-run` と `--apply` 同時 | exit 2 |
| IT-CG-SIH-007 | `--kind` 空 | exit 2、許容値を案内 |
| IT-CG-SIH-008 | `--kind` 未知値 | exit 2、許容値を案内 |
| IT-CG-SIH-009 | `--json` | パース可能な JSON |

### ラウンドトリップ（`__tests__/integration/ci-governance/scaffold-inception-phase-gate-roundtrip.test.ts`）

**issue #42 の必須要件**。scaffold した文書を一切編集せずにフェーズゲートへ通す。

| ID | 前提 | 期待 |
|----|------|------|
| IT-CG-RT-001 | minimal、scaffold 前 | exit 1、product_overview(_plan).md が blocker |
| IT-CG-RT-002 | minimal、scaffold 直後 | **blockers 空 / passed / exit 0** |
| IT-CG-RT-003 | standard、範囲外の user_stories.md のみ手書き | blockers 空 |
| IT-CG-RT-004 | full、範囲外 product 成果物のみ手書き | blockers 空（plan 4 種すべて充足） |
| IT-CG-RT-005 | minimal + `embedded-qa`、scaffold 直後 | **passed=false**（承認証跡を偽造しない） |
| IT-CG-RT-006 | minimal + 移設 paths | scaffold 先とゲート検査先が一致し blockers 空 |
| IT-CG-RT-007 | 移設 paths で `scaffold-design` | `{paths.designDocs}` 配下に生成（WI-369） |

IT-CG-RT-005 は**緩めてはならない**。テンプレートに `[Answer]` 本文を置くと
このテストが落ちる。落ちたときの正しい対処はテストの変更ではなくテンプレートの修正。

## E2E（`__tests__/e2e/cli-harness.test.ts`）

| 観点 | 期待 |
|------|------|
| `scaffold-inception --help` | exit 0、dry-run/apply 契約と doc-kind |
| `scaffold-inception --kind product-overview-plan` | exit 0、dry-run preview |
| `scaffold-inception --kind logical` | exit 2、許容値を案内 |

## カバレッジ方針

kind 追加時は「UT の kind テーブル 2 本」と「ラウンドトリップの scaffold 対象一覧」の
両方を更新する。UT だけ通してラウンドトリップに載せないと、ゲートを通らない
テンプレートが混入しても検出できない。

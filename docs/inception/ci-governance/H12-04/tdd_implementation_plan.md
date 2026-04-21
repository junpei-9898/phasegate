# TDD実装計画: H12-04 scaffold-design CLI

## 1. スコープ

### 対象ストーリー / 受け入れ基準
- ISSUE-007 受け入れ基準（未達の 1 項目）:
  - `[ ] npx phasegate scaffold-design --unit <id> --phase <name>` が実装され、minimum viable template を生成する
- Wave 3 (v0.67.0) で L2-001 レジストリにハードコードした `defaultTemplatePath: 'docs/templates/logical_design.template.md'` を実体化し、pre-tool-use hook のエラー行に出る `scaffold:` / `テンプレ:` を **実際に動かせる** 状態にする

### 影響 Unit / 層
- **ci-governance**（主担当 Unit、`create-baseline-usecase` と同じパターン）
  - `application/usecases/scaffold-design-usecase.ts`（新規）
  - `application/dto/scaffold-design-input.ts`（新規）/ `scaffold-design-output.ts`（新規）
  - `domain/ports/template-repository-port.ts`（新規）— テンプレ読込ポート
  - `domain/ports/design-doc-writer-port.ts`（新規）— 設計文書書込ポート
  - `domain/value-objects/design-phase.ts`（新規）— 許容 phase 値の値オブジェクト
  - `infrastructure/adapters/file-system-template-repository-adapter.ts`（新規）
  - `infrastructure/adapters/file-system-design-doc-writer-adapter.ts`（新規）
  - `presentation/handlers/scaffold-design-handler.ts`（新規）
  - `composition-root.ts`（配線追加）
- **main.ts**（CLI ルータ）— `case 'scaffold-design'` 追加 + usage 文言更新
- **docs/templates/**（テンプレ本体の配置先）
  - Wave 3 で hardcoded された path `docs/templates/logical_design.template.md` に合わせ、`templates/logical_design.template.md`（root 既存）を `docs/templates/logical_design.template.md` に移す（または複製）
  - `docs/templates/domain_model.template.md` / `uiux_design.template.md` / `unit_test_design.template.md` / `it_test_design.template.md` を新規作成
- **package.json**（version 0.67.0 → 0.68.0）

## 2. 前提条件検証

- `implementation-readiness-checker` 未起動。story-implementor 内で下記を手動検証:
  - `docs/product/construction/ci-governance/logical_design.md` ✅ 存在（1493 行）
  - `docs/product/construction/ci-governance/domain_model.md` ✅ 存在（456 行）
  - `docs/product/environment_contract.md` → 確認（Phase 2 着手時に再確認）
- 既存テスト有: `scripts/harness/__tests__/unit/ci-governance/create-baseline-usecase.test.ts` を参照パターンとして流用
- 判定: ✅ 実装準備完了（ci-governance Unit は logical / domain_model 共に整備済み）

## 3. TDD 実装順序（テストピラミッド準拠）

### Stage 1: Unit テスト (RED → GREEN → REFACTOR)

| 対象 | テスト内容 | 実装内容 |
|------|----------|---------|
| `DesignPhase` value-object | `create('logical' / 'domain' / 'uiux' / 'unit-test' / 'it-test')` 成功、未知値で例外、equals | 値オブジェクト |
| `ScaffoldDesignUseCase` | ① phase→template path 解決 ② 既存ファイルなし→書込成功 ③ 既存ファイルあり＆force=false→`alreadyExists=true` で書き込みせず ④ 既存ファイルあり＆force=true→上書き ⑤ phase 不正→入力層で弾かれるため UseCase には到達しない ⑥ `{unit}` プレースホルダが実 unit id に置換されて書き込まれる | UseCase 本体 |

**実行方式:** メインセッションで直接実行

### Stage 2: IT テスト (RED → GREEN → REFACTOR)

| 対象 | テスト内容 | 実装内容 |
|------|----------|---------|
| `FileSystemTemplateRepositoryAdapter` | `docs/templates/*.template.md` を読み取り、存在しない phase でエラー | テンプレ読込 |
| `FileSystemDesignDocWriterAdapter` | `docs/product/construction/{unit}/{file}` に書込 (mkdir -p 相当)、既存ファイル有無判定、force 時に上書き | 設計文書書込 |
| `ScaffoldDesignHandler` | ① `--unit ci-governance --phase logical` で成功 exit=0 ② 既存ファイルあり&&no-force で exit=2 ③ `--force` で上書き exit=0 ④ 未知 phase で exit=2 ⑤ `--json` で JSON 出力 | Presentation |
| L2-001 レジストリ path 整合 | `ErrorDefinitionRegistry.getDefinition('L2-001').defaultTemplatePath` が指すファイルが **実在** することをテストで検証 | Wave 3 の dead reference を解消 |

**実行方式:** メインセッションで直接実行

### Stage 3: E2E（シナリオ相当）テスト

| 対象 | テスト内容 | 実装内容 |
|------|----------|---------|
| `npx phasegate scaffold-design --unit sample-unit --phase logical` | 実プロセスで CLI を起動し、テンポラリディレクトリ下に `docs/product/construction/sample-unit/logical_design.md` が生成されることを検証（`main.ts` 越しの配線確認） | CLI ルーター |
| pre-tool-use hook error メッセージとの end-to-end | L2-001 で報告される `scaffold:` 行をそのまま shell 実行した結果ファイルが生成されることを手動で確認（dogfooding Stage） | — |

**実行方式:** メインセッションで直接実行（`scripts/harness/__tests__/integration/` 配下に追加）

### Stage 4: ドッグフーディング

- 一時ディレクトリで `npx phasegate scaffold-design --unit demo --phase logical` を実行し、ファイル生成を目視確認
- Wave 3 の pre-tool-use hook エラーを意図的に起こし、出力された `scaffold:` コマンドをコピーして実行できることを確認

## 4. 環境検証チェックリスト（事前実行結果）

- [x] `node --version` → 18+ 確認
- [x] `pnpm typecheck` 相当（既存テスト全通過、v0.67.0 時点）
- [x] `docs/templates/` ディレクトリ存在（`ci/`, `hooks/` サブディレクトリあり）
- [x] 既存テンプレ `templates/logical_design.template.md`（root）存在

## 5. QA（不明点・確認事項）

### [Question] Q1: 対応 phase の範囲

Wave 4 で対応する `--phase` の種類を決定する必要があります。

| 選択肢 | 内容 | メリット | デメリット |
|---|---|---|---|
| A | `logical` のみ | MVP で最速、L2-001 dead reference 解消に必要な最小 | 他 phase も同じ不満が出る |
| B | `logical` / `domain` / `uiux` / `unit-test` / `it-test` 5 phase | issue L123 の要件を満たす | テンプレ 5 本を新規作成する必要あり |
| C | `logical` / `domain` の 2 phase（実装とテストの根幹） | 中庸 | uiux/test 系は Wave 5 で対応 |

**推奨案:** **B（5 phase 全対応）** — issue L123 に 5 phase が明記されており、L2-001 以外のエラーコード（L2-002 以降で domain/it-test 文書欠落を指す想定）でも同じ導線が必要になる。テンプレ本体は既存 `templates/logical_design.template.md` を雛形として 5 本複製し、minimum viable な見出し構成（TODO placeholder 付き）を合わせる。

[Answer] 推奨案 B で進める（2026-04-22）


### [Question] Q2: テンプレ配置ディレクトリの正統化

現状 `templates/logical_design.template.md`（root）と `docs/templates/`（`ci`/`hooks` サブディレクトリのみ）が併存。Wave 3 は後者の `docs/templates/logical_design.template.md` を参照するハードコードを仕込んでいる。

| 選択肢 | 内容 | メリット | デメリット |
|---|---|---|---|
| A | `templates/` を正とし、Wave 3 の path を `templates/logical_design.template.md` に修正 | 既存ファイル移動なし | `docs/` 配下に集約する issue L127 方針に反する |
| B | `docs/templates/` を正とし、`templates/logical_design.template.md` を移動 + `docs/templates/*.template.md` を新規追加 | issue L127 方針に沿う。`docs/` は配布物 | 移動は破壊的変更、`templates/`（root）を参照する他コードがないか確認必要 |
| C | 両方に置く（シンボリックリンクまたは複製） | 後方互換 | 二重管理、updatability 下がる |

**推奨案:** **B（docs/templates/ に集約）** — issue L127 明言 + `package.json` `files` に `docs/**` が含まれるため npm publish 時にも配布される（既確認）。移動前に `templates/logical_design.template.md` への参照がないか全文 grep し、あれば追従修正。

[Answer] 推奨案 B で進める（2026-04-22）


### [Question] Q3: `{unit}` プレースホルダ置換の有無

scaffold 時にテンプレ内の `<Unit名>` / `<UNIT_NAME>` を `--unit` で指定された値に自動置換するか？

| 選択肢 | 内容 | メリット | デメリット |
|---|---|---|---|
| A | 置換する | scaffold 直後から unit id が入り、ユーザーの編集負荷が下がる | テンプレ記法（`<Unit名>` vs `<UNIT_NAME>` vs `{{unit}}`）の統一が必要 |
| B | 置換しない（コピーのみ） | 実装最小、テンプレ記法自由 | ユーザーが手動で書き換え |

**推奨案:** **A（置換する）** — 記法は `{{unit}}` と `{{story_ids}}`（任意）を採用。Wave 4 では `{{unit}}` のみ実装し、他プレースホルダは未定義のまま残す（TODO 扱い）。既存 `<Unit名>` 表記は `{{unit}}` に書き換える。

[Answer] 推奨案 A で進める（2026-04-22）


### [Question] Q4: 既存ファイル保護挙動

生成先にファイルが既存の場合の挙動。baseline handler は `--force` 無しなら exit=2 で拒否する。

| 選択肢 | 内容 |
|---|---|
| A | `--force` 無し & 既存ファイル有 → exit=2、何も書かない（baseline と揃える） |
| B | `--force` 無しでも warning 付きで書く |

**推奨案:** **A（baseline と同挙動）** — データ損失リスクを回避。CLI 出力は「既に存在します: path。上書きするには --force を指定してください」の日本語メッセージ。

[Answer] 推奨案 A で進める（2026-04-22）


### [Question] Q5: L4 drift-detection との連携は Wave 4 で扱うか

issue L128 に「placeholder のままだと L4 (drift-detection) で警告が出る設計にする（TODO 残存検出）」とあるが、L4 自体の実装状況と合わせてスコープ判断が必要。

| 選択肢 | 内容 |
|---|---|
| A | Wave 4 ではスコープ外。TODO マーカー（`TODO: <unit> の責務を記述`）をテンプレに含めるに留める | 
| B | L4 drift-detection に TODO 残存検出ルールを追加 |

**推奨案:** **A（スコープ外）** — L4 は現状 `phasegate.config.json` で `enabled: false`（main config 参照）。L4 実装自体が別 issue 領域。Wave 4 は「scaffold する」「TODO マーカーをテンプレに入れる」までとし、検出は将来波に回す。

[Answer] 推奨案 A で進める（2026-04-22）


## 6. 前提条件・リスク

### 前提
- Wave 3 (v0.67.0) の L2-001 レジストリは `defaultScaffoldCommand: 'npx phasegate scaffold-design --unit <unit-id> --phase logical'` を保持。Wave 4 で CLI を実装することで、この文字列が実際に動くようになる
- `ci-governance` Unit の既存コードは `create-baseline-usecase.ts` がほぼ同じパターン（domain ports → adapters → use case → handler → composition-root → main.ts）のため、構造を流用

### リスク
- **テンプレ移動の副作用**: `templates/logical_design.template.md`（root）を `docs/templates/` に移動した場合、既存の `story-implementor` スキル等が root を参照している可能性。Phase 2 冒頭で全 grep 検証（`rg "templates/logical_design"` 等）し、他参照があれば追従修正する
- **自己ブロック**: Wave 1-3 と同じく、`scripts/harness/ci-governance/` 配下に新規ファイル追加で phase-gate 自己ブロックが発生する可能性。`ci-governance` Unit は baseline 対象に含まれるため baseline.json 経由の grandfather で大抵スキップされるが、新規ファイルは grandfather 対象外。Wave 1/2 と同じく `fullModeRequiredWhen` 一時フリップで対応（ISSUE-006 既知の trade-off）
- **CLI サブコマンド名の命名**: `scaffold-design` を採用（issue L123 に明記）。将来 `scaffold-test` / `scaffold-adr` 等を追加する余地を残すため `scaffold` prefix を付けない案も検討したが、issue の表記を尊重

### 完了条件
- 全テスト green（既存 + 新規 Unit/IT/E2E）
- `npx phasegate lint` で L1 違反ゼロ
- L2-001 の `defaultTemplatePath` が指すファイルが実在
- pre-tool-use hook エラーメッセージから copy-paste した `scaffold:` コマンドが実際に動作
- `package.json` v0.68.0、`CHANGELOG.md` 更新、ISSUE-007 受け入れ基準 6/8 ✅

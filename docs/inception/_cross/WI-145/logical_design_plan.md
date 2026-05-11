---
traceability:
  initial_creation: true
---

# 論理設計計画: WI-145 (Deployment Manifest + Silent-Failure Doctor)

> 起票元: `docs/inception/_cross/WI-145/description.md`
> 関連: WI-144 (umbrella), WI-146 / WI-147 / WI-148 (sub-WI sibling)

## 1. スコープ

### 対象 WI
`WI-145: Deployment manifest と silent-failure doctor — install/uninstall idempotency の土台`

### 設計対象の機能（WI-145 description より）
- **F3-1**: `.phasegate/manifest.json` schema 定義 (domain layer)
- **F3-2**: Manifest I/O (load / save / addEntry / removeEntry, infrastructure layer)
- **F3-3**: Heuristic detectors 9 種 (`.claude/settings.json` / `.codex/hooks.json` / `.husky/*` / `.github/workflows` / `package.json` / skill symlinks への phasegate 設定有無検出, application layer)
- **F2-1**: `phasegate doctor` CLI (presentation layer)
- **F2-2**: doctor の test fixtures (4 種: `inert-install` / `partial-install` / `full-install` / `no-phasegate`)
- 既存 `init` / `update-skills` の最小改修 (manifest 書き出し追加のみ)

### 設計対象の層
- **Domain**: `DeploymentManifest`, `DeploymentEntry`, `DiagnosticReport`, `DiagnosticFinding`, `DiagnosticSeverity` value objects
- **Application**: `ManifestRepository` port, `DoctorDiagnosticService` use case, 9 種 heuristic check service interface
- **Infrastructure**: file-system manifest adapter (atomic write), heuristic check adapters (file-system access for `.claude/settings.json` 等)
- **Presentation**: `phasegate doctor` CLI handler (human / json output, exit code mapping)

### 設計対象 **外**（本 WI 非スコープ）
- F1 (install with merge) / F4 (uninstall) / F5 (reconcile) / F6 (init deprecation) — それぞれ WI-146 / WI-147 / WI-148
- doctor が検出した問題の自動修復（hint コマンド出力のみ）
- 既存 `init` の deploy 挙動変更（manifest 書き出しの追加のみ、deploy 結果自体は変えない）

## 2. 設計方針

### 2.1 アーキテクチャ層の定義

phasegate.config.json の `architecture.preset: "clean"` に従い、4 層 Clean Architecture:

| Layer | 責務 | 依存方向 |
|---|---|---|
| domain | 値オブジェクト・ドメインルール（pure functions / no IO） | (外向き禁止) |
| application | use case / port / domain service interface | → domain |
| infrastructure | port の adapter（file-system / process / git access） | → application, → domain |
| presentation | CLI handler / formatter | → application, → domain |

`infrastructure` と `presentation` 間の依存は禁止。両者は application port 経由で疎結合。

### 2.2 技術スタックの前提

- TypeScript (既存 phasegate ハーネスに従う)
- Vitest (テストフレームワーク、phasegate の testing-rules.md に従う)
- Node.js fs/promises (atomic write 用に tmp → rename)
- 既存の `tsx` ベース CLI 起動 (`bin/phasegate` 経由)

### 2.3 設計原則

- **Pure domain**: `DeploymentManifest` / `DiagnosticReport` 等の value object は IO を持たない pure data + 純粋関数のみ
- **Port driven**: file-system / process / git は全て application port で抽象化。infrastructure adapter は port を実装する
- **テストダブル**: domain 層は mock 禁止 (CLAUDE.md), application は port mock OK, infrastructure adapter は integration test で real fs 使用 (memfs / tmpdir fixture)
- **冪等性**: `saveManifest` は atomic (tmp → rename)、`doctor` は side-effect free
- **Doctor の back-compat**: manifest が無い既存 PJ にも動く heuristic-only モードを domain レベルで第一級対応（manifest があれば結果を絞り込むだけ）
- **AI 委譲経路の domain 第一級対応**: 機械的にやり切れない判断 (例: 既存 husky に user 高度 custom logic がある時の merge 位置決定、user 改変済み `.claude/settings.json` の保持/破棄、deploy 先と既存設計の意味的整合性チェック) は、doctor / install / uninstall / reconcile が **自動判断せず**、`RepairMode` value object で「AI 委譲推奨」flag を立てて user に skill 起動を促す経路を domain レベルで持つ。本 WI で `RepairMode` / `SuggestedSkill` の domain 構造を確定し、WI-146/147/148 がこれを再利用する。

### 2.4 既存コード改修の最小化

`scripts/harness/setup/skill-deployer.ts` の既存 `init` / `update-skills` 関数群は **deploy 結果を返した直後に manifest 書き出しを 1 行追加する** だけの差分にとどめる。deploy 挙動自体は触らない（WI-146 で structured merge を入れる時に書き換える）。

## 3. 設計内容サマリー（各層の設計概要）

### 3.1 Domain 層 — Value Objects

- **`DeploymentManifest`** (root aggregate)
  - `version: string` (semver, deploy 時の phasegate version)
  - `installedAt: ISO8601 string`
  - `entries: readonly DeploymentEntry[]`
  - Pure constructor + JSON schema validator
- **`DeploymentEntry`**
  - `path: string` (project root からの relative path)
  - `mode: "created" | "merged"`
  - `block: string | null` (merged 時の block 識別子、created なら null)
  - `hash: string` (sha256 hex of content at deploy time)
- **`DiagnosticReport`** (aggregate)
  - `findings: readonly DiagnosticFinding[]`
  - `hasRedFlag(): boolean` / `hasWarning(): boolean`
- **`DiagnosticFinding`**
  - `checkId: string` (e.g. `claude-hook-missing`)
  - `severity: "red" | "warn" | "info"`
  - `target: string` (e.g. `.claude/settings.json`)
  - `message: string`
  - `repairMode: RepairMode` (機械修復可否の判定、後述)
  - `repairHint: string | null` (copy-paste 可能な復旧コマンド hint、mechanical 時のみ非 null)
  - `suggestedSkill: SuggestedSkill | null` (ai-assisted 時のみ非 null)
- **`RepairMode`** (新規)
  - `"mechanical"`: `phasegate install --apply` 等で安全に自動修復可（user 改変無し / template と完全一致）
  - `"ai-assisted"`: user 改変あり / 意味的判断が必要なため AI と人間の協議が必要
  - `"manual"`: phasegate の知識外で人間が判断（例: 既存 CI workflow との依存関係解決）
- **`SuggestedSkill`** (新規)
  - `skillName: string` (e.g. `phasegate-config-doctor`, `skill-creator`, `implementation-planner`)
  - `rationale: string` (なぜこの skill を推奨するか、user に提示する根拠文)
  - `invokeCommand: string` (Claude Code での起動形式、e.g. `invoke /phasegate-config-doctor`)

### 3.2 Application 層 — Ports & Use Cases

**Ports**:
- `ManifestRepositoryPort`
  - `load(projectRoot: string): Promise<DeploymentManifest | null>`
  - `save(projectRoot: string, manifest: DeploymentManifest): Promise<void>` (atomic)
- `FileInspectorPort`
  - `readJson<T>(path: string): Promise<T | null>` (parse 失敗時 null)
  - `readText(path: string): Promise<string | null>`
  - `readSymlink(path: string): Promise<string | null>`
  - `exists(path: string): Promise<boolean>`

**Use cases**:
- `RunDoctorDiagnosticsUseCase`
  - input: `{ projectRoot: string, strict: boolean }`
  - 内部で 9 種の `HeuristicCheck` を並列実行 → `DiagnosticReport` を構築
  - manifest があれば「manifest 記録された entry が現存するか」も追加 check
  - output: `DiagnosticReport`

**Heuristic check abstraction**:
```typescript
interface HeuristicCheck {
  id: string;
  severity: "red" | "warn";
  run(ctx: { projectRoot: string; fs: FileInspectorPort }): Promise<DiagnosticFinding | null>;
}
```
9 種の具体 check は application 層の plain objects として実装（domain 知識依存無し、port のみ依存）。

**RepairMode 判定ロジック**:
各 check 内で finding 構築時に `repairMode` を判定する。判定基準:
- target file が存在しない → `mechanical` (install で新規配置可)
- target file が存在し、phasegate 設定が無い、かつ既存 content が template 互換 (e.g. settings.json が空の `{ "hooks": {} }`) → `mechanical` (install で安全に merge 可)
- target file が存在し、phasegate 設定が無い、かつ既存 content に user customization あり → `ai-assisted` (merge 位置・既存 logic との依存関係を user/AI で判定)
- target が JSON parse 失敗 / 権限欠如 / symlink 循環 → `manual` (phasegate 自動判断不可)

判定は **domain pure function** として実装 (application 層から call、test 容易)。

### 3.3 Infrastructure 層 — Adapters

- `FileSystemManifestRepositoryAdapter` — `.phasegate/manifest.json` の atomic read/write (tmp → rename)
- `NodeFsFileInspectorAdapter` — Node.js fs/promises を使った `FileInspectorPort` 実装
- 既存 `skill-deployer.ts` の改修:
  - `deploySkills` / `deployHookScripts` / `deployHuskyHook` / `deployHuskyCommitMsgHook` / `deployHuskyPrePushHook` / `deployCodexHooks` / `deployCiWorkflows` / `deployAgentSkillLinks` / `initHarnessConfig` の各関数末尾で、deploy された file path と mode (`"created"` または既存 skip の `null`) を caller に return
  - caller (`main.ts:init` / `main.ts:update-skills`) で結果を集約 → `DeploymentManifest` を構築 → `ManifestRepositoryPort.save` を呼ぶ
  - 既存 skip された file (`mode: null`) は manifest に entry を作らない (back-compat 維持)

### 3.4 Presentation 層 — CLI Handler

- `npx phasegate doctor` (新規 subcommand)
  - args: `--strict` (warn を red 扱い), `--json` (構造化出力), `--help`, `--repair-mode <mode>` (filter)
  - 内部で `RunDoctorDiagnosticsUseCase` を起動
  - 出力 (human format): 各 finding を `[repairMode]` ラベル付きで表示。`ai-assisted` には `suggestedSkill.invokeCommand` を skill 起動 hint として表示
  - 出力例:
    ```
    [red][mechanical]   .claude/settings.json: phasegate hook 未登録
      → 修復: npx phasegate install --apply
    [red][ai-assisted]  .husky/pre-commit: 既存 custom logic と要協議
      → AI 委譲: invoke /phasegate-config-doctor  (理由: user 改変済み hook の merge 位置判定)
    [warn][manual]      .github/workflows/ci.yml: phasegate workflow と意味的競合の可能性
      → 人間判断: docs/guide/ci-coexistence.md を参照
    ```
  - exit code: red 1 件以上 → 1, warn のみ → 0 (strict 時は 1), all clear → 0
- `main.ts` の switch に `case "doctor":` を追加

### 3.5 Test 設計サマリー

- **Unit tests** (`scripts/harness/__tests__/unit/installation/...` or `harness-api/...`)
  - 各 value object の constructor / validator
  - 各 heuristic check の判定ロジック (FileInspectorPort mock)
  - `RunDoctorDiagnosticsUseCase` のレポート構築ロジック
- **Integration tests** (`scripts/harness/__tests__/integration/installation/...` or `harness-api/...`)
  - `FileSystemManifestRepositoryAdapter` の atomic write 確認 (tmp dir fixture)
  - 4 種 fixture (`inert-install` / `partial-install` / `full-install` / `no-phasegate`) に対する end-to-end doctor 出力 golden test
- **Negative tests**: 壊れた manifest JSON / 権限欠如 / symlink ループ 等

## 4. QA（不明点・確認事項）

### [Question] Q1: Unit placement — 新規 unit `installation` を作るか、`harness-api` に統合するか

WI-145 で導入する domain model (`DeploymentManifest` / `DiagnosticReport` / `HeuristicCheck`) と application use case (`RunDoctorDiagnosticsUseCase`) を、どの unit に配置するか:

**選択肢 A**: 新規 unit `installation` として独立
- `scripts/harness/installation/{domain,application,infrastructure,presentation}/` を新設
- `docs/product/construction/installation/` 配下に logical_design.md / domain_model.md / unit_test_design.md / it_test_design.md / unit_test_logic.md / it_test_logic.md / coverage_report.md の 7 ファイルを新規作成
- 既存 `scripts/harness/setup/skill-deployer.ts` は `@unit harness-api` のまま残し、manifest 書き出しの呼び出し側のみ追加
- WI-146/147/148 の `install` / `uninstall` / `reconcile` も同 unit に集約していく

**選択肢 B**: 既存 `harness-api` unit に統合
- `scripts/harness/harness-api/` 配下に新規 sub-directory を作って配置
- 既存 `docs/product/construction/harness-api/logical_design.md` / `domain_model.md` を **改訂** (差分追記)
- 新規 unit を増やさず、construction docs 新規作成も最小化
- ただし harness-api が「CLI presentation + manifest domain + heuristic checks」と責務肥大化

**推奨案**: **A (新規 unit `installation`)**
- 理由 1: manifest / doctor / install / uninstall / reconcile は十分独立したドメイン (deploy 状態の管理 + 構造健全性検査) で、CLI 群を統括する `harness-api` とは責務が異なる。
- 理由 2: WI-146/147/148 でも同じドメインが拡張されるため、最初から独立 unit に切ったほうが logical_design.md の進化が追いやすい。
- 理由 3: Clean Architecture の Bounded Context として manifest / diagnostics は1つのコンテキストを形成する。`harness-api` に同居させると複数文脈混在になる。
- 反対理由: docs 7 ファイルの新規作成コスト。ただし WI-146/147/148 でも継続使用するため後で生きてくる。

[Answer]
（人間が回答を記入）

### [Question] Q2: Manifest 書き出しの enable 条件

既存 `init` / `update-skills` から manifest を書き出すようにするが、これは:

**選択肢 a**: 無条件 (常に `.phasegate/manifest.json` を作成・更新)
**選択肢 b**: `--manifest` flag opt-in (既存挙動を完全保持、明示時のみ manifest 作成)
**選択肢 c**: phasegate.config.json の `installation.manifest: true` で opt-in

**推奨案**: **a (無条件)**
- 理由: manifest は doctor / WI-146 install / WI-147 uninstall / WI-148 reconcile の前提。opt-in にすると「manifest 無しユーザーが doctor では heuristic でしか動かず install 後も整合性が取れない」状態が残り、本 WI のゴールである「土台の整備」が達成されない。
- 既存挙動への影響: `.phasegate/manifest.json` という新 file が追加されるだけ。既存 deploy 先には touch しない。
- リスク: gitignore 未設定の PJ で manifest が commit されるが、これは「phasegate がいつ何を deploy したか」の audit log としてむしろ有用。.gitignore 推奨は README / doctor の hint で案内。

[Answer]
（人間が回答を記入）

### [Question] Q3: Heuristic check の hash 比較範囲

WI-145 では「ファイル存在 + 内容に phasegate command 文字列が含まれるか」で検出する heuristic を 9 種定義した。これに加えて:

**選択肢 a**: 文字列 substring 検出のみ (`"npx phasegate hook" を含むか`)
**選択肢 b**: + JSON 構造 parse (`.claude/settings.json` の `hooks.PreToolUse[].hooks[].command` を見て一致を判定)
**選択肢 c**: + template との hash 比較 (現バージョンの template と完全一致するか)

**推奨案**: **b (JSON 構造 parse まで)**
- 理由: substring (a) は false positive を生む (コメント内に "npx phasegate hook" と書かれただけで pass する)。hash 比較 (c) は WI-148 reconcile の責任範囲で、本 WI でやると user customization を全部 red flag にしてしまう。
- shell script (`.husky/*`) は parse できないので、`# === phasegate managed (BEGIN) ===` block と本体コマンド両方の存在を見る regex 検出にする。
- `package.json` は JSON parse して `devDependencies.phasegate` の存在を確認。

[Answer]
（人間が回答を記入）

### [Question] Q5: AI 委譲経路 — doctor が skill を自動起動するか、hint 出力だけに留めるか

`RepairMode = "ai-assisted"` finding に対する doctor の責任範囲:

**選択肢 a**: hint 出力のみ (`suggestedSkill.invokeCommand` を表示、user が手動起動)
**選択肢 b**: `phasegate doctor --invoke <finding-id>` で対象 skill を子プロセスで自動起動
**選択肢 c**: `phasegate doctor --invoke-all` で全 ai-assisted finding に対し順次 skill 起動

**推奨案**: **a (hint 出力のみ)**
- 理由 1: skill 起動は Claude Code / Codex の agent context で行われるべき動作で、CLI 子プロセスから起動すると context が分離して AI の判断材料 (会話履歴・現在の編集状態) が失われる。
- 理由 2: ai-assisted finding は **「人間と AI が協議すべき判断」** を意味するため、CLI が自動 dispatch すると user の意図確認が抜ける。hint を見て user が judgement した上で skill 起動する経路が安全。
- 理由 3: phasegate skill は SKILL.md ベースの「読んで動く」設計で、外部から forced invocation する protocol を持たない。
- 別案 b/c の課題: skill 内対話 (例: phasegate-config-doctor が `[Question]` で user に問うフロー) を CLI 子プロセスでハンドルするのは非現実的。

将来の補強案 (本 WI 非スコープ): `phasegate doctor --json` の出力を Claude Code skill ecosystem (e.g. 新規 `phasegate-doctor-resolver` skill) に渡し、AI が finding 単位で resolve plan を提案するパイプラインを別 WI で検討。

[Answer]
（人間が回答を記入）

### [Question] Q6: AI 委譲先 skill のマッピング — どの finding にどの skill を推奨するか

`SuggestedSkill` の具体マッピングを domain layer の **静的テーブル** として持つか、**動的判定** にするか:

**選択肢 a**: 静的テーブル (domain layer に `checkId → SuggestedSkill` の Map を hard-code)
**選択肢 b**: 動的判定 (application layer で finding 内容を見て skill を選ぶ rule engine)
**選択肢 c**: config 化 (`phasegate.config.json` の `installation.skillMapping` で user 上書き可能)

**推奨案**: **a (静的テーブル)** を WI-145 で導入、c (config 化) を将来オプションとして WI-148 で検討
- 理由: WI-145 段階での finding は 9 種限定で、各 finding に対する best-fit skill は phasegate 開発側が知っている。動的判定は overkill。
- 暫定マッピング案:
  - `claude-hook-missing` (user 改変あり) → `phasegate-config-doctor`
  - `codex-hook-missing` (user 改変あり) → `phasegate-config-doctor`
  - `husky-pre-commit-missing` (既存 custom logic あり) → `phasegate-config-doctor`
  - `package-json-devdep-missing` → mechanical で自動修復可、ai-assisted には基本ならない
  - `ci-workflow-missing` (既存 workflow と意味的競合可能性) → `phasegate-toolkit-guide` (人間に CI 共存戦略を提示)
  - skill symlink 関連 → mechanical
- domain layer の `RepairTable` value object として実装し、test fixture でカバー。

[Answer]
（人間が回答を記入）

### [Question] Q4: doctor の出力先 (stdout vs report file)

**選択肢 a**: stdout のみ (`--json` で structured)
**選択肢 b**: stdout + `.phasegate/doctor-report-{timestamp}.json` を常に保存
**選択肢 c**: `--report-out <path>` 指定時のみ file 保存

**推奨案**: **c (`--report-out` opt-in)**
- 理由: 既存 phasegate コマンド (e.g. `validate-metadata`) の慣行と一致。CI で artifact として保存したい場合のみ flag を指定するパターン。
- デフォルトで report file を吐かないことで、`.phasegate/` ディレクトリ汚染を避ける。

[Answer]
（人間が回答を記入）

## 5. 前提条件・リスク

### 前提条件
- WI-144 (umbrella) / WI-146 / WI-147 / WI-148 が起票済み（status=drafted）— **確認済み (2026-05-11)**
- phasegate.config.json の `architecture.preset: "clean"` を維持
- Vitest / tsx の dependency は既存通り

### リスク

| リスク | 影響 | 緩和策 |
|---|---|---|
| Q1 で A 採用 → 新 unit `installation` の construction docs 7 件作成が後続作業を膨らませる | logical_design 完了までの所要時間が +N サイクル | 各 docs は最小内容で start し、WI-146/147/148 で漸進的に拡張 |
| heuristic check が false positive (settings.json のコメントだけで pass) | doctor が green を返すが実際は inert | Q3 で b 採用 → JSON 構造 parse |
| 既存 `init` の挙動変更で既存ユーザーに影響 | regression | manifest 書き出しは追加のみ。deploy 挙動は触らない (本 WI 非スコープ) |
| `.phasegate/manifest.json` が git に commit される | 個人 deploy 履歴が repo に混入 | `.gitignore` 推奨を README に記載、doctor 起動時に hint 出力 |
| heuristic check の symlink ループで stack overflow | doctor crash | `readSymlink` は深さ 1 のみ追跡、循環検出は port 側で対応 |
| **AI 委譲 hint が出ても user が skill を起動せず silent failure が残る** | gate が再び素通り | doctor exit code を `repairMode != mechanical` 1 件で warn 扱い (strict 時 fail)。さらに `phasegate doctor --strict` を `.husky/pre-push` に乗せる選択肢を WI-148 で検討 |
| AI 委譲推奨 skill が既存 phasegate skill では足りない | skill 起動 hint が hollow | `SuggestedSkill.skillName` に `skill-creator` を含め、必要な skill を新規生成する経路を hint に組み込む |

### 既知の依存

- WI-145 完了後でないと WI-146 (install) / WI-147 (uninstall) / WI-148 (reconcile) は manifest 基盤を持てない
- WI-145 単独で完結する成果: doctor CLI による silent-failure 即時可視化（既存ユーザーに対する quick win）

---

## Phase 1 完了宣言

本計画書を出力した時点で Phase 1 は完了。**人間にレビューと QA 回答を依頼する**。Q1〜Q4 への `[Answer]` 記入後、Phase 2 (本論理設計 = `docs/inception/_cross/WI-145/logical_design.md` + 必要なら `docs/product/construction/installation/logical_design.md` 等の作成) に移行する。

**Phase 2 開始前に、Q1 (unit placement) の回答に応じて以下の追加スキル起動判断が発生する**:
- Q1 = A: 先に `domain-designer` を `installation` unit に対して起動し、`docs/product/construction/installation/domain_model.md` を作成する必要あり (logical-designer 横断モードの前提条件)
- Q1 = B: 既存 `harness-api` 横断 logical_design / domain_model を改訂する Phase 2 を本スキルで継続実行

Phase 2 では成果物 (logical_design.md 本体) はまだ作成しない。

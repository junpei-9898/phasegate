# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.72.0] - 2026-04-22

### Changed

- ISSUE-007 Wave 7 — v0.71.0 で修正した挙動（`baseline.enabled` default=`true` / `baseline --dry-run --json` の `files` キー）に合わせて以下ドキュメントを更新:
  - `docs/guide/retrofit-adoption.md` — baseline.json スキーマ例を実機形式に修正、default glob の範囲（TS/JS だけでなく md も含む）を明記、「init 後に config を手で書く」記述を削除
  - `docs/guide/cli-reference.md` — `Scaffold Design` セクション追加（Wave 4 で導入した CLI が未記載だった）、baseline セクションに v0.71.0 の変更点を追補
  - `README.md` — Command Reference に `scaffold-design` 追加、baseline 段落に v0.71.0 変更点と retrofit-adoption.md リンクを追加、Documentation セクションに retrofit-adoption.md を追加
  - `README.ja.md` — 同上（baseline / `scaffold-design` 行を CLI テーブルに追加、retrofit-adoption.md リンクを含む段落に更新）

## [0.71.0] - 2026-04-22

### Changed (breaking-ish)

- ISSUE-007 Wave 6 — `baseline.enabled` の default を `false` → **`true`** に変更。ISSUE-007 の趣旨（retrofit 導入時の摩擦解消）と整合させるため。`.phasegate/baseline.json` が存在しないプロジェクトでは従来通り何も grandfather されない（`ci-governance-baseline-grandfather-adapter.ts` が defensive に early-return する）ため、新規プロジェクトへの影響なし。`baseline` をオフにしたい場合は `phasegate.config.json` に `baseline.enabled: false` を明示。
- `npx phasegate baseline --dry-run --json` の出力キーを `entries` → `files` に変更（保存ファイル `.phasegate/baseline.json` のキー `files` と整合）。同時に `CreateBaselineOutput.entries` → `CreateBaselineOutput.files` にリネーム。`.phasegate/baseline.json` 自体のオンディスク形式は変更なし。

### Fixed

- dogfooding で判明していた「`npx phasegate init` → `npx phasegate baseline` の 2 手を踏んでも pre-tool-use hook で grandfather が効かない」問題を解消（上記の `enabled` default 変更により）。

## [0.70.0] - 2026-04-22

### Added

- ISSUE-007 Wave 5 — `docs/guide/retrofit-adoption.md` を追加。既存プロジェクトへの phasegate 後付け導入チュートリアル（`init` → `baseline` → `scaffold-design` の 4 ステップ、phase-gate エラーの読み方、baseline 卒業手順、よくある詰まり方の QA）。

## [0.69.0] - 2026-04-22

### Added

- ISSUE-007 Wave 4 / Phase C — `npx phasegate scaffold-design --unit <id> --phase <logical|domain|uiux|unit-test|it-test> [--force] [--json]` CLI を追加。`templates/*.template.md` を読み取り `{{unit}}` プレースホルダを置換して `docs/product/construction/{unit}/*.md` に書き込む。既存ファイルは `--force` なしでは保護。Wave 3 の pre-tool-use hook エラーで emit される `scaffold:` 行が実動作するようになった。
- `templates/{domain_model,uiux_design,unit_test_design,it_test_design}.template.md` を追加（5 phase すべてに minimum viable template）。

### Changed

- Wave 3 の L2-001 `defaultTemplatePath` を `docs/templates/logical_design.template.md` → `templates/logical_design.template.md` に修正（配布物と整合）。

## [0.68.0] - 2026-04-22

### Changed

- `skills/` 同梱物のクリーンアップ — skill-creator の `scripts/__pycache__/` Python バイトコンパイルキャッシュが npm 配布物に混入していたため除去。`.gitignore` / `.npmignore` に `__pycache__/` と `*.pyc` を追加。skill-creator の使用例パスを Anthropic 原本の `skills/public` / `skills/private` から PhaseGate レイアウトに合わせた `skills` に統一。

## [0.67.0] - 2026-04-22

### Changed

- ISSUE-007 Wave 3 / Phase B — `phase-gate` の HarnessError をアクショナブル化（足りない設計文書のパスと推奨アクションを `fix_example` に明示）。

## [0.66.0] - 2026-04-22

### Added

- ISSUE-007 Wave 2 / Phase A-2 — `.phasegate/baseline.json` に登録済みかつ sha1 が一致するファイルを `phase-gate` 対象から除外する **baseline grandfather** を pre-tool-use hook に統合。レガシーリポジトリへの後付け導入時の摩擦を解消する。

## [0.65.0] - 2026-04-21

### Added

- ISSUE-007 Wave 1 / Phase A-1 — `npx phasegate baseline [--dry-run|--force|--paths|--json]` CLI を追加。`.phasegate/baseline.json` スナップショットを生成し、phasegate.config.json に `baseline.{enabled, path}` スキーマを追加。

## [0.64.0] - 2026-04-21

### Added

- ISSUE-006 Story B — `quickMode.fullModeRequiredWhen` の判定を pre-tool-use hook に統合。`mixedCategories` / `newDomainFile` / `apiContractChange` のいずれかが立つと書き込み時点で同期的に Full Mode へエスカレートしブロックする（block reason: `FULL_MODE_REQUIRED`）。

## [0.63.0] - 2026-04-21

### Added

- ISSUE-006 Story A — `quickMode.fullModeRequiredWhen` 設定キー（`mixedCategories` / `newDomainFile` / `apiContractChange`、いずれもデフォルト `true`）を導入し、Quick Mode → Full Mode のエスカレート条件を設定駆動化。
- `npx phasegate check-change-category --paths <csv> [--format json] [--fail-on-full-required]` CLI — 任意のファイルリストを Quick Mode カテゴリに分類し、Full Mode が必要かを返す。CI gate での使用を想定。

## [0.62.0] - 2026-04-21

### Added

- ISSUE-013 C-6（軽量版）— UserPromptSubmit hook に violation detection を追加。

## [0.61.0] - 2026-04-21

### Added

- ISSUE-013 C-5 — UserPromptSubmit hook で動的状態（現在の Quick/Full モード等）をプロンプトに注入。

## [0.60.0] - 2026-04-21

### Added

- ISSUE-013 C-4 — SessionStart hook を追加し、セッション開始時に静的ルール（CLAUDE.md 等）を注入する仕組みを実装。

## [0.59.0] - 2026-04-21

### Added

- ISSUE-013 A-1 / A-2 / B-3 — `phasegate init --agent <claude|codex|both>` オプションで Codex CLI 向けの `.codex/hooks.json` を自動配置。Codex dogfood セットアップを README に追記。

## [0.58.0] - 2026-04-21

### Added

- ISSUE-013 Wave 2 — Codex CLI 統合の本体実装。`PreToolUse(Bash)` / `PostToolUse(Bash)` / `Stop` フックを Codex 向けに配線。

## [0.57.0] - 2026-04-20

### Added

- ISSUE-013 Wave 1 — `BashWriteTargetExtractor` が Bash 経由 `apply_patch <<'PATCH'` heredoc の書き込み先パスを抽出するよう拡張。Codex の Bash ルートを pre-tool-use hook で押さえられるようになる。

## [0.56.0] - 2026-04-20

### Fixed

- ISSUE-011 Wave 3 / P3-4 / HF2-04 — `initial-creation-expiration-checker` バリデータを修正。

## [0.55.0] - 2026-04-20

### Fixed

- ISSUE-011 Wave 2 — Markdown parser の code-span / code-fence 内に書かれた `@unit` / `@layer` 等のメタタグを誤検出していたバグを修正（コードフェンス内をスキップするよう変更）。

## [0.54.0] - 2026-04-20

### Fixed

- ISSUE-011 Wave 1 / P2-2 — CLI のエラー伝播を修正（内部エラーが exit code 0 で握り潰されていた問題）。
- ISSUE-011 Wave 1 / P2-3 — `.mdx` / `.markdown` 拡張子を Markdown ドキュメント検証の対象に追加。

## [0.53.0] - 2026-04-19

### Added

- ISSUE-008 Phase C-1〜C-3 + D — テストファイルへの `@story` メタデータ end-to-end 検証を完成。`templates/` 配下のサンプルファイルを実体化し、生成コードへのメタデータ付与を保証する経路を確立。

## [0.52.0] - 2026-04-19

### Changed

- ISSUE-008 Phase B-3 — pre-commit フローに `.md` 設計文書の検証を接続。`logical_design.md` 等の frontmatter / メタデータが欠けたままコミットされるのを防ぐ。

## [0.51.0] - 2026-04-19

### Added

- ISSUE-011 起票（`validate-metadata` UX / parser / drift 検出に関する改善集）。

## [0.50.0] - 2026-04-19

### Added

- ISSUE-008 Phase B-2 — `validate-metadata` CLI に `.md` 分岐を追加。Markdown 設計文書のメタデータ（frontmatter）も検証対象になる。

## [0.49.0] - 2026-04-19

### Changed

- ISSUE-008 Phase B-1 撤回 + P1-2 前提更新 — 設計文書 frontmatter 必須化（v0.48.0）の方針を再検討し前提を更新。

## [0.48.0] - 2026-04-19

### Added

- ISSUE-008 Phase B-1 / P1-2 — 設計文書（`logical_design.md` / `domain_model.md` 等）の frontmatter を必須化。

## [0.47.0] - 2026-04-18

### Added

- ISSUE-008 Phase A / P1-1 — 生成コードに `@unit` / `@layer` メタデータを必ず付与するよう、各実装スキル（`story-implementor` / `quick-implementor`）に指示を追加。

## [0.46.0] - 2026-04-18

### Added

- ISSUE-007 起票（リトロフィット導入障壁 — レガシーリポジトリでの初回 phase-gate ブロック問題）。
- ISSUE-008 起票（メタデータ emit 欠落 — 生成コードに `@unit` / `@layer` が付かないケース）。

## [0.45.0] - 2026-04-18

### Added

- ISSUE-006 起票 + Phase P2-3 — `docs/guide/quick-vs-full-mode.md`（Quick Mode と Full Mode の選択ガイド）を新設。

## [0.44.0] - 2026-04-18

### Fixed

- ISSUE-005 Phase D / P3-8 — Markdown のメタ見出し（`---` で囲まれた frontmatter 等）をパース時に正しくスキップするよう修正。
- ISSUE-005 Phase D / P3-9 — ファイルパスから `@unit` を推定するロジックを改善。
- ISSUE-005 Phase D / P3-10 — `list-errors` と `render-errors` の境界をドキュメント化（`list-errors` は定義駆動 / `render-errors` はランタイム駆動）。

## [0.43.0] - 2026-04-18

### Fixed

- ISSUE-005 Phase C / P2-6 — `phasegate:check-phase` の `--help` / `--json` フラグが positional 引数として食われ unit 名扱いされていたバグを修正。
- ISSUE-005 Phase C / P2-7 — `regression:*` 系コマンドの出力先を整理。

## [0.42.0] - 2026-04-18

### Fixed

- ISSUE-005 Phase B-2 / P1-5 — `detect-drift` と L4-001 バリデータを統合し、設計-コード乖離検出の経路を一本化。

## [0.41.0] - 2026-04-18

### Fixed

- ISSUE-005 Phase B-1 / P1-3 — fresh repo（履歴がない初期化直後のリポジトリ）での git 解析が失敗するバグを fallback 経路で修正。
- ISSUE-005 Phase B-1 / P1-4 — `validate --layer` フィルタが効かないケースを修正。

## [0.40.0] - 2026-04-18

### Fixed

- ISSUE-005 Phase A / P0-1 — pre-commit 経路の復旧（一部バリデータが pre-commit から呼ばれていなかった問題）。
- ISSUE-005 Phase A / P0-2 — `ci:generate-template` の UX 改善（`--preset` 省略時のエラーメッセージを実用的に）。

## [0.39.0] - 2026-04-18

### Fixed

- `main.ts` の `loadStoryReflectionProvider` (scripts/harness/main.ts:271) と `loadResolvedConfig` (scripts/harness/main.ts:326) の `catch` が広すぎ、`phasegate.config.json` の `SyntaxError`（JSON パース失敗）や I/O エラーを silent に握り潰していた問題を修正。`ENOENT`（ファイル未作成）は従来どおり silent return、それ以外は stderr に `Warning: phasegate.config.json is not valid JSON: ...` 等を出してから null/undefined を返す。CLI の後続処理は続行する（`ConfigValidationError` の exit(2) 挙動は維持）。
- `scripts/harness/__tests__/e2e/cli-harness.test.ts` に回帰テストを2件追加（壊れた JSON 警告・ENOENT silent）

### Migration Notes

利用者側の対応は不要。`phasegate.config.json` が壊れていた場合、これまで静かに storyReflection 関連表示・preset 解決だけが消えていたのが、stderr に警告が出るようになる。JSON 消費側（CI スクリプト等）は stdout のみパースしている限り影響なし。

## [0.38.0] - 2026-04-18

### Fixed

- `phasegate:status --json` 出力が JSON.parse 不可だったバグを修正。`storyReflection: ...` という非 JSON 行が JSON 出力の後ろに無条件で追記されていた（`scripts/harness/main.ts:709` で `printStoryReflectionStatusLine` を `--json` フラグに関わらず呼び出していたため）。修正後は `--json` 時のみ抑止する。利用者からの FB により発覚。

### Migration Notes

利用者側の対応は不要。`phasegate:status` を JSON 消費する側（CI スクリプト等）で `JSON.parse(stdout)` が成功するようになる。人間向け（フラグなし）出力には引き続き `storyReflection` 行が表示される。

## [0.37.0] - 2026-04-17

### Removed

- `templates/phasegate.config.json` を削除（ISSUE-004 Phase D / P2-6）。`initHarnessConfig()` は `skill-deployer.ts` 内でインライン構築しており、テンプレートファイルは `npm publish` に含まれるのみで誰にも読まれない dead code だった。

### Fixed

- 6 スキル本文の `docs/principles/testing_rules.md`（アンダースコア）参照を正しい `docs/principles/testing-rules.md`（ハイフン）に修正（ISSUE-004 Phase D / 観察事項）。対象: unit-test-designer, it-test-designer, scenario-test-designer, unit-test-logic-designer, it-test-logic-designer, scenario-test-logic-designer

### Migration Notes

利用者側の対応は不要。`templates/phasegate.config.json` は v0.33.0〜v0.36.0 時点でも実際の `init` 生成物とは内容が異なり、参照されていなかった。スキル本文のリンク切れ修正は純粋なドキュメント修正で、動作への影響なし。

## [0.36.0] - 2026-04-17

### Added

- `phasegate init` が設計原則ドキュメント（`docs/principles/*.md`、`docs/folder_management_rules.md`）を導入PJの `docs/` 配下に自動配置するように（ISSUE-004 Phase C / P1-4）
- `phasegate init --with-husky` オプション — `.husky/pre-commit` フック（`npx phasegate pre-commit` 呼び出し）を任意配置（ISSUE-004 Phase C / P1-5）
- `setup/skill-deployer.ts` に `deployDesignDocs()` `deployHuskyHook()` 関数を追加
- `__tests__/integration/setup/init-design-docs.integration.test.ts` — `init` の docs/husky 配置を検証する IT テスト（8 ケース）

### Changed

- README.md / README.ja.md の Quick Start から手動 `cp` 手順（旧 §3）を削除し、§2 の `init` 説明に「設計原則ドキュメントも配置される」旨を追記
- `phasegate --help` の Setup セクション `init` 行に `--with-husky` を追記、説明を「deploy skills + design docs + phasegate.config.json」に更新

### Migration Notes

既に `init` を実行済みのプロジェクトでも、もう一度 `npx phasegate init` を実行すれば不足している設計原則ドキュメントだけが追加配置されます（既存ファイルは上書きされません）。`.husky/pre-commit` を追加したい場合は `npx phasegate init --with-husky` を実行してください。

## [0.35.0] - 2026-04-17

### Added

- `phasegate hook <pre-tool-use|post-tool-use|stop>` サブコマンド — Claude Code hook を CLI 経由で起動（ISSUE-004 Phase B）
- `phasegate pre-commit` サブコマンド — L2 pre-commit バリデータを CLI 経由で起動
- `phasegate delegate-sonnet [...args]` サブコマンド — Sonnet 4.6 委任スクリプトを CLI 経由で起動

### Changed

- `templates/.claude/settings.json` の hook command を `npx tsx node_modules/phasegate/scripts/...` から `npx phasegate hook X` 形式に変更（パッケージ内部レイアウトに依存しない安定 API へ）
- `templates/.husky/pre-commit` を `npx phasegate pre-commit` 呼び出しに変更
- 12 スキル本文の `scripts/delegate-sonnet.sh` 直接参照を `npx phasegate delegate-sonnet` に統一（story-writer, story-mapper, environment-designer, unit-designer, mock-designer, unit-test-designer, unit-test-logic-designer, scenario-test-designer, scenario-test-logic-designer, it-test-designer, it-test-logic-designer, implementation-planner）

### Migration Notes

既存の `.claude/settings.json`（`init` 既存スキップ仕様により旧形式が残る）を v0.35.0 形式に更新する場合、3 箇所の hook command を以下に書き換えてください:

```diff
- "npx tsx node_modules/phasegate/scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts"
+ "npx phasegate hook pre-tool-use"
- "npx tsx node_modules/phasegate/scripts/harness/agent-integration/presentation/post-tool-use-hook.ts"
+ "npx phasegate hook post-tool-use"
- "npx tsx node_modules/phasegate/scripts/harness/agent-integration/presentation/stop-hook.ts"
+ "npx phasegate hook stop"
```

旧形式は引き続き動作しますが、パッケージ内部パスに依存するため将来非推奨化する可能性があります。

## [0.10.0] - 2026-04-02

### Removed

- fuse-hooks-engine Unit を完全削除し yaml 依存を除去

## [0.9.0] - 2026-03-29

### Changed

- PreToolUseフックのエラーメッセージをアクショナブル化 (agent-integration)

## [0.8.0] - 2026-03-29

### Removed

- FUSE実装を完全に削除し hooks-only 構成に簡素化

## [0.7.0] - 2026-03-29

### Added

- FUSEモードにフェーズゲート強制を追加 (fuse-hooks-engine)

## [0.6.0] - 2026-03-28

### Added

- E2E検証完了
- init hookテンプレート追加

### Fixed

- PostToolUseフック修正

## [0.5.0] - 2026-03-28

### Fixed

- pre-tool-use hookのfile_path対応と絶対パス変換を修正

## [0.4.0] - 2026-03-28

### Added

- inception側フェーズゲート整備 (ISSUE-001)

## [0.3.0] - 2026-03-28

### Changed

- バージョンを v0.3.0 にリセット（v2.2.0 系から再出発）

## [0.2.0] - 2026-03-28

Pre-reset era (formerly v2.1.0 - v2.2.0). Major features delivered before the version reset:

### Added

- FUSE/Hooks モード切替配線 -- guardMode による条件分岐
- L0層バリデータ統合 -- 5層防御モデル完成
- Future A アダプタ実装完了 -- 5アダプタ+43テスト (fuse-hooks-engine)
- フェーズゲート統合拡張 -- TDD実装完了 (agent-integration)
- L0スキーマ定義追加

### Fixed

- Readツール等がフェーズゲートで誤ブロックされるバグを修正 (BUG-03)
- フルスイート全Green化 -- emptyフィクスチャ復元+タイムアウト緩和
- harness.config.json スキーマ準拠

## [0.1.0] - 2026-03-21

Pre-reset era (formerly v1.0.0 - v1.1.1). Initial release and early bug fixes:

### Added

- GSDLC Harness Engineering Toolkit 初期リリース (v1.0.0)
- v1 MVH完成 + Future A/B + 全バグ修正 (v2.1.0)

### Fixed

- skill:validate-structureのセクション検出を完全修正 (BUG-02)
- check-phase-gate --level 2/3でexit code 2になるバグを修正 (INV-01)
- ajv v8互換対応
- 3件のバグ修正

[Unreleased]: https://github.com/junpei-9898/phasegate/compare/v0.67.0...HEAD
[0.67.0]: https://github.com/junpei-9898/phasegate/compare/v0.66.0...v0.67.0
[0.66.0]: https://github.com/junpei-9898/phasegate/compare/v0.65.0...v0.66.0
[0.65.0]: https://github.com/junpei-9898/phasegate/compare/v0.64.0...v0.65.0
[0.64.0]: https://github.com/junpei-9898/phasegate/compare/v0.63.0...v0.64.0
[0.63.0]: https://github.com/junpei-9898/phasegate/compare/v0.62.0...v0.63.0
[0.62.0]: https://github.com/junpei-9898/phasegate/compare/v0.61.0...v0.62.0
[0.61.0]: https://github.com/junpei-9898/phasegate/compare/v0.60.0...v0.61.0
[0.60.0]: https://github.com/junpei-9898/phasegate/compare/v0.59.0...v0.60.0
[0.59.0]: https://github.com/junpei-9898/phasegate/compare/v0.58.0...v0.59.0
[0.58.0]: https://github.com/junpei-9898/phasegate/compare/v0.57.0...v0.58.0
[0.57.0]: https://github.com/junpei-9898/phasegate/compare/v0.56.0...v0.57.0
[0.56.0]: https://github.com/junpei-9898/phasegate/compare/v0.55.0...v0.56.0
[0.55.0]: https://github.com/junpei-9898/phasegate/compare/v0.54.0...v0.55.0
[0.54.0]: https://github.com/junpei-9898/phasegate/compare/v0.53.0...v0.54.0
[0.53.0]: https://github.com/junpei-9898/phasegate/compare/v0.52.0...v0.53.0
[0.52.0]: https://github.com/junpei-9898/phasegate/compare/v0.51.0...v0.52.0
[0.51.0]: https://github.com/junpei-9898/phasegate/compare/v0.50.0...v0.51.0
[0.50.0]: https://github.com/junpei-9898/phasegate/compare/v0.49.0...v0.50.0
[0.49.0]: https://github.com/junpei-9898/phasegate/compare/v0.48.0...v0.49.0
[0.48.0]: https://github.com/junpei-9898/phasegate/compare/v0.47.0...v0.48.0
[0.47.0]: https://github.com/junpei-9898/phasegate/compare/v0.46.0...v0.47.0
[0.46.0]: https://github.com/junpei-9898/phasegate/compare/v0.45.0...v0.46.0
[0.45.0]: https://github.com/junpei-9898/phasegate/compare/v0.44.0...v0.45.0
[0.44.0]: https://github.com/junpei-9898/phasegate/compare/v0.43.0...v0.44.0
[0.43.0]: https://github.com/junpei-9898/phasegate/compare/v0.42.0...v0.43.0
[0.42.0]: https://github.com/junpei-9898/phasegate/compare/v0.41.0...v0.42.0
[0.41.0]: https://github.com/junpei-9898/phasegate/compare/v0.40.0...v0.41.0
[0.40.0]: https://github.com/junpei-9898/phasegate/compare/v0.39.0...v0.40.0
[0.39.0]: https://github.com/junpei-9898/phasegate/compare/v0.38.0...v0.39.0
[0.38.0]: https://github.com/junpei-9898/phasegate/compare/v0.37.0...v0.38.0
[0.37.0]: https://github.com/junpei-9898/phasegate/compare/v0.36.0...v0.37.0
[0.36.0]: https://github.com/junpei-9898/phasegate/compare/v0.35.0...v0.36.0
[0.35.0]: https://github.com/junpei-9898/phasegate/compare/v0.10.0...v0.35.0
[0.10.0]: https://github.com/junpei-9898/phasegate/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/junpei-9898/phasegate/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/junpei-9898/phasegate/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/junpei-9898/phasegate/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/junpei-9898/phasegate/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/junpei-9898/phasegate/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/junpei-9898/phasegate/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/junpei-9898/phasegate/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/junpei-9898/phasegate/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/junpei-9898/phasegate/releases/tag/v0.1.0

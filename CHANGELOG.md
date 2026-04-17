# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/junpei-9898/phasegate/compare/v0.10.0...HEAD
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

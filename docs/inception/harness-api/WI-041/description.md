---
id: WI-041
type: story
severity: normal
status: tested
legacy_id: H03-02
---

# H03-02

## 状態

- **状態**: TESTED
- **実装証跡**: `scripts/harness/integrations/pre-commit.ts` が staged Markdown を `ValidateMetadataCommandHandler` に渡し、実装ファイル検証と設計文書 metadata 検証を同一 pre-commit 経路で実行する。
- **テスト証跡**: `scripts/harness/__tests__/unit/harness-api/pre-commit.test.ts` / `scripts/harness/__tests__/integration/harness-api/pre-commit-cli.integration.test.ts`

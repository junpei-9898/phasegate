# 論理設計: H03-06 WorkItem 物理レイアウト移行 dry-run

@story-id H03-06
設計要素: 旧 issue レイアウトから WI レイアウトへの移行計画を生成する pure service と、CLI 接続前提の application usecase。

- **対応ストーリー**: H03-06
- **対応 Issue**: ISSUE-026 (Phase B-1)
- **Unit**: traceability-model
- **作成日**: 2026-04-24

## 1. 設計方針

Phase B は破壊的なファイル移動を含むため、最初のストーリーでは **plan only** に限定する。実ファイル更新は後続 H03-07 以降で `--apply` 明示時にのみ実行する。

### 1.1 移行対象

| 旧レイアウト | 新レイアウト | 種別 |
|-------------|-------------|------|
| `docs/inception/issues/{ISSUE-XXX}/` | `docs/inception/_cross/{WI-XXX}/` | cross-unit WI |
| `docs/inception/{unit}/issues/{ISSUE-XXX}/` | `docs/inception/{unit}/{WI-XXX}/` | unit-owned WI |

既存 `docs/inception/{unit}/{HXX-XX}/` は本ストーリーでは移行しない。Phase B の primary risk は issue 経路の gate 穴であり、story ID の WI 化は別ステップで扱う。

### 1.2 ドメイン値

```ts
export interface WorkItemMigrationCandidate {
  readonly legacyId: string;
  readonly nextId: string;
  readonly sourcePath: string;
  readonly targetPath: string;
  readonly scope: "cross" | "unit";
  readonly unitName?: string;
  readonly descriptionFileName: "description.md" | "issue_description.md";
  readonly conflict: boolean;
}
```

### 1.3 ID 変換

- `ISSUE-026` → `WI-026`
- `ISSUE-7` → `WI-007`
- 既に `WI-XXX` の場合はそのまま
- 変換不能なディレクトリ名は candidate から除外し、warning として返す

### 1.4 frontmatter 追記計画

`issue_description.md` しかない旧 issue は、後続 apply 時に `description.md` へ rename する。dry-run では以下を計画として返すだけにする。

```yaml
---
id: WI-026
type: issue
severity: high
status: drafted
legacy_id: ISSUE-026
---
```

severity は旧文書から抽出できる場合のみ利用し、抽出不能なら `normal` を既定値とする。cross-unit の場合は `affects` が必須だが、Phase B-1 では旧文書の「影響Unit」行を候補値として抽出し、抽出不能なら warning を出す。

## 2. Application Usecase

```ts
export interface PlanWorkItemMigrationInput {
  readonly rootDir: string;
}

export interface PlanWorkItemMigrationOutput {
  readonly candidates: readonly WorkItemMigrationCandidate[];
  readonly warnings: readonly string[];
}
```

Usecase は filesystem port を通じて旧レイアウトを読み、migration plan を返す。CLI 表示や JSON 化は presentation 層の責務とする。

## 3. テスト方針

- unit-owned issue と cross-unit issue の両方を fixture で検証する
- `ISSUE-026` から `WI-026` への変換を検証する
- target path が既に存在する場合は `conflict: true` になることを検証する
- 実ファイルが変更されないことを dry-run の不変条件として検証する

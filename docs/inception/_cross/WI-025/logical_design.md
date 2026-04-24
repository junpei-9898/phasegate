# ISSUE-025 論理設計: Codex / Claude 間で共有される project skills 導線の整備

@story-id WI-025

## 1. 問題の本質

現状の `phasegate init` は skill 実体の配置先を **`.claude/skills` に固定**しており、Codex 向けには `.codex/hooks.json` だけを追加している。

その結果、Codex セットアップは hooks だけが有効化され、project-local skills を参照するための導線が作られない。`skills/README.md` が説明する「`skills/` を単一ソースとし `.claude/skills` / `.codex/skills` から参照する構成」とも一致していない。

## 2. 対策方針

### 2.1 shared source-of-truth 方式に統一する

skill の実体は project root の `skills/` に配置し、各 agent 向けディレクトリには **symlink を置く**。

```text
skills/                  # 実体
.claude/skills -> ../skills   # Claude 利用時のみ
.codex/skills  -> ../skills   # Codex 利用時のみ
```

この構成により:

- skill の更新対象が `skills/` に一本化される
- Claude / Codex が同じ skill 実体を参照できる
- `skills/README.md` の説明と実装を一致させられる

### 2.2 agent ごとに必要な導線だけを作る

`--agent` ごとの成果物は以下とする。

| agent | skill 実体 | Claude 導線 | Codex 導線 | hooks/settings |
|---|---|---|---|---|
| `claude` | `skills/` | `.claude/skills` | なし | `.claude/settings.json` + `.claude/scripts/*` |
| `codex` | `skills/` | なし | `.codex/skills` | `.codex/hooks.json` |
| `both` | `skills/` | `.claude/skills` | `.codex/skills` | 両方 |

これにより `--agent codex` で不要な `.claude/settings.json` を作らずに済み、既存の挙動とも整合する。

## 3. 変更対象と設計

### 3.1 `deploySkills` の責務を「実体配置」に限定する

**対象**: `scripts/harness/setup/skill-deployer.ts`

現状の `deploySkills()` は `.claude/skills` に直接 skill をコピーしている。

これを以下に変更する:

- skill 実体の配置先を `skills/` に変更
- `.harness-version` も `skills/` 配下に配置
- `deploySkills()` 自体は agent を意識しない

```typescript
const SKILLS_TARGET_DIR = 'skills';
```

### 3.2 agent 向け symlink 作成を別責務に分離する

**新規関数案**:

```typescript
deployAgentSkillLinks(projectRoot, {
  claude: boolean,
  codex: boolean,
}): Promise<...>
```

責務:

- `skills/` 実体に対する symlink を `.claude/skills` / `.codex/skills` に作成
- 既に正しい symlink が存在する場合は skip
- 既存の通常ディレクトリ/ファイルがある場合は上書きしない

#### 3.2.1 symlink の仕様

- link target は相対パス `../skills`
- 親ディレクトリ（`.claude`, `.codex`）は必要時のみ作成
- Windows は Codex hooks 自体が対象外だが、Node の `symlink(..., 'junction')` 互換を用いる実装にしておく

#### 3.2.2 既存ファイルがある場合の扱い

安全性を優先し、以下のルールとする:

| 状態 | 挙動 |
|---|---|
| 正しい symlink が既に存在 | skip |
| 別リンク先の symlink が存在 | skip（壊さない） |
| 通常ディレクトリ/通常ファイルが存在 | skip（壊さない） |
| 何もない | symlink 作成 |

本 issue では **既存 `.claude/skills` 実ディレクトリを自動移行しない**。既存利用者のローカル編集を破壊しないためであり、必要なら別 issue で migration を扱う。

### 3.3 `init` / `update-skills` で symlink 作成を呼び出す

**対象**: `scripts/harness/main.ts`

`init`:

1. `deploySkills(...)`
2. `deployAgentSkillLinks(...)`
3. `deployHookScripts(...)` / `deployCodexHooks(...)`

`update-skills`:

- skill 実体の再配置に加えて、`.claude/skills` / `.codex/skills` の導線も再検証する
- 実際の link 作成可否はプロジェクト状態依存のため、少なくとも `init` と同じヘルパーを呼んで整合性を維持する

### 3.4 統合テストの期待値を更新する

**対象**: `scripts/harness/__tests__/integration/setup/init-codex-agent.integration.test.ts`

追加する確認:

- `--agent claude`: `skills/` と `.claude/skills` が存在し、`.codex/skills` は存在しない
- `--agent codex`: `skills/` と `.codex/skills` が存在し、`.claude/settings.json` は存在しない
- `--agent both`: `skills/` と両方の symlink が存在する

テスト方法:

- `lstat()` で symlink 判定
- `readlink()` で link target が `../skills` であることを確認

### 3.5 ドキュメントを shared source-of-truth 方式へ揃える

**対象**:

- `README.md`
- `README.ja.md`
- `docs/guide/installation.md`
- `docs/guide/skills-overview.md`

修正内容:

- 「skills は `.claude/skills` に配置される」という表現を「`skills/` に配置され、agent ディレクトリから参照される」に更新
- Codex セットアップの成果物として `.codex/skills` を明記

## 4. 変更しないもの

| 項目 | 理由 |
|---|---|
| `.codex/hooks.json` の hook 内容 | 本 issue の論点は skill 導線であり、hooks の動作自体は別 issue で完了済み |
| `.claude/settings.json` / `.claude/scripts/*` の配置ロジック | Claude 固有 hook セットアップは現状のままで問題ない |
| 既存プロジェクトの `.claude/skills` 実ディレクトリ自動移行 | 破壊的変更になり得るため、本 issue では行わない |

## 5. 期待される動作変更

| 操作 | 変更前 | 変更後 |
|---|---|---|
| `init --agent codex` | `.codex/hooks.json` のみ Codex 固有で配置 | `.codex/hooks.json` + `.codex/skills -> ../skills` |
| `init --agent both` | `.claude/skills` 実ディレクトリ + `.codex/hooks.json` | `skills/` 実体 + `.claude/skills` / `.codex/skills` |
| `init --agent claude` | `.claude/skills` 実ディレクトリ | `skills/` 実体 + `.claude/skills` |

## 6. QA

### [Question] Q1: `skills/` 実体を project root に置くと、既存 README と競合しないか？

**[Answer]** 競合しない。むしろ `skills/README.md` が既にその構成を前提にしており、実装側をそちらへ寄せるのが自然。

### [Question] Q2: symlink ではなく copy にすべきではないか？

**[Answer]** copy だと Claude/Codex 間で skill 実体が二重化し、更新漏れや差分ずれの原因になる。shared source-of-truth を維持するには symlink が適切。

### [Question] Q3: 既存 `.claude/skills` 実ディレクトリを自動で `skills/` に移すべきか？

**[Answer]** 本 issue では行わない。既存利用者が skill をローカル編集している可能性を排除できないため、まずは新規 init と非破壊 update の整合化を優先する。

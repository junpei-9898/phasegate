# X ポスト下書き — Mini Shai-Hulud 安全調査プロンプト

> 各セクションをそのままスレッドにできる形で並べてあります。プロンプト本体は最後に丸ごと貼ってあるので Gist にアップして 5/6 からリンクするのが楽。

---

## 1/6 — フック

5/11 発覚: npm/PyPI 大規模サプライチェーン攻撃「Mini Shai-Hulud」第2波。
`@tanstack/react-router`（週 1,200 万 DL）など **172 パッケージ** が汚染。

AI に依存解決させてる Vibe Coder ほど被害がデカいので、AI に "安全に" 調査させるプロンプトを置いとく 🧵

---

## 2/6 — 何がヤバいか

ペイロードの挙動:
- AWS / GCP / GitHub / npm / Vault / K8s のクレデンシャル窃取
- `gh-token-monitor` デーモンが常駐、token revoke を検知すると **24h 後に `rm -rf ~/`**
- → 「とりあえずトークン無効化」が wiper のトリガーになる罠
- GitHub Actions の OIDC トークンを `/proc/<pid>/mem` から直接抜く

---

## 3/6 — 手元で 30 秒チェック（install 不要）

```bash
cd /your/repo

# 1. lockfile に侵害スコープが入っていないか（172 パッケージの主要 14 scope を網羅）
grep -E "@tanstack/|@uipath/|@mistralai/|@squawk/|@tallyui/|@beproduct/|@draftauth/|@draftlab/|@supersurkhet/|@taskflow-corp/|@tolka/|@mesadev/|@ml-toolkit-ts/|@dirigible-ai/|@opensearch-project/opensearch|\"mistralai\"|guardrails-ai|cmux-agent-mcp|nextmove-mcp|ts-dna|cross-stitch|git-git-git|wot-api|safe-action|agentwork-cli|git-branch-selector" \
  package*.json *lock* pnpm-lock.yaml requirements*.txt poetry.lock uv.lock pyproject.toml 2>/dev/null

# 2. リポ全文に IoC 文字列が無いか
grep -rnE "git-tanstack\.com|getsession\.org|83\.142\.209\.194|gh-token-monitor|router_init\.js|router_runtime\.js|transformers\.pyz" \
  . --exclude-dir=node_modules --exclude-dir=.git

# 3. 永続化デーモンが端末に居ないか（macOS）
ls ~/Library/LaunchAgents/com.user.gh-token-monitor.plist 2>&1

# 4. 永続化デーモンが端末に居ないか（Linux）
ls ~/.config/systemd/user/gh-token-monitor.service 2>&1

# 5. リポに勝手にドロップされたファイルが無いか（重要: ある場合は触る前に user に報告）
ls -la .claude/router_runtime.js .claude/setup.mjs .vscode/setup.mjs /tmp/transformers.pyz 2>&1
```

全部ヒット 0 ならとりあえずクリーン。

---

## 4/6 — AI に任せる時の罠

ここで AI に「調査して」と雑投げすると事故る:

- 興奮した AI が `npm install` を打って侵害版を引く
- 「トークン revoke しましょう」を即提案 → **wiper 起動**
- IoC ドメインに curl/dig でビーコン送信 → 標的化
- 発見した daemon を勝手に `kill` / `launchctl unload` → 24h 後発火

**順序固定 + 禁則のプロンプト縛り** が必須。

---

## 5/6 — 安全調査プロンプト（使い回し可）

書きました。**29 項目 / 6 Phase 構成**:

- `install` / `execute` / 外部ネットワーク **全部禁止**、副作用ゼロ
- 「**永続化除去 → トークン revoke**」の順序を AI に強制（wiper 起動防止）
- Phase 1-3: lockfile / 実体 / IoC（「今クリーン」の確認）
- Phase 4-5: ホスト永続化 / CI 攻撃面
- **Phase 6: 過去感染フォレンジック**（npm logs / git log / 自パッケージ republish / secrets 流出ウィンドウ）
- 全 Phase 通過しないと "クリーン" 判定しない明示ゲート付き

プロンプト全文 ↓（または Gist リンク）

---

## 6/6 — 締め

僕のリポは `@tanstack/*` 系の依存なくクリーンでしたが、Vibe Coder の生成コードは依存が肥大化しがち。
最低限これは徹底を:

- `pnpm install --frozen-lockfile`（CI でも手元でも）
- lockfile を commit する
- GitHub Actions で `pull_request_target` を使わない
- npm publish アカウントは security key で 2FA

---

## 付録: プロンプト全文（Gist 等にコピペして使う）

````markdown
# npm/PyPI サプライチェーン攻撃 安全調査プロンプト

あなたはこのリポジトリのセキュリティ静的解析を担当する。以下の制約と手順を厳守すること。

## 絶対禁止事項（破ったら即停止）
- `npm install` / `pnpm install` / `yarn` / `pip install` / `uv` 等、依存解決を伴うコマンドの実行
- `node` / `tsx` / `python` 等でリポ内コードを実行すること
- 怪しいプロセス・デーモンへの `kill` / `launchctl unload` / `systemctl` / `pkill` 操作
- **GitHub / npm / クラウドのトークン revoke を提案する前に永続化デーモンの所在を必ず特定すること**（Mini Shai-Hulud 系は revoke を検知すると 24h 後に `rm -rf ~/` を発火する）
- ファイル書き換え・削除（read-only に徹する）
- 外部ネットワークアクセス（IoC ドメインへの curl/dig/host/nslookup も禁止 — beaconing 扱いされ得る）
- `gh api` 等で侵害リポへの問い合わせ（標的化リスク）

## 許可される読み取り専用コマンド（明示）
以下は副作用ゼロなので積極的に活用する:
- `find` / `ls` / `stat` / `file` / `head` / `tail` / `grep` / `rg`
- `ps aux` / `ps -ef` / `lsof -i -n -P`（接続状態の確認）
- `launchctl list` / `systemctl --user list-units`（プロセス列挙、unload はしない）
- `crontab -l`（一覧表示のみ）
- `git log` / `git diff` / `git blame`（ローカルリポ内のみ）
- `npm view <自分のパッケージ名> time`（自パッケージの publish 履歴確認、第三者パッケージへは行わない）

## 入力（Mini Shai-Hulud 第2波 / 2026-05-11 公表時点）

### 侵害された npm スコープ（170 パッケージ / 404 バージョン — 該当スコープ全体を対象とせよ）
- `@tanstack/*` — 42 パッケージ（react-router 含む、いずれも 1.16x 系の特定 2 バージョン）
- `@uipath/*` — 65 パッケージ
- `@squawk/*` — 22 パッケージ
- `@tallyui/*` — 10 パッケージ
- `@beproduct/*` — 1 パッケージ（多数バージョン）
- `@mistralai/*` — 3 パッケージ（mistralai, mistralai-azure, mistralai-gcp）
- `@draftauth/*`, `@draftlab/*`, `@supersurkhet/*`, `@taskflow-corp/*`, `@tolka/*`
- `@mesadev/*`, `@ml-toolkit-ts/*`, `@dirigible-ai/*`, `@opensearch-project/opensearch`

### 侵害された npm スコープなしパッケージ
- `agentwork-cli`, `cmux-agent-mcp`, `cross-stitch`, `git-branch-selector`, `git-git-git`
- `ml-toolkit-ts`, `nextmove-mcp`, `safe-action`, `ts-dna`, `wot-api`

### 侵害された PyPI パッケージ
- `guardrails-ai` (0.10.1)
- `mistralai` (2.4.6)

### 代表的な侵害バージョン（pinning 確認の参考）
- `@tanstack/react-router`: 1.169.5, 1.169.8
- `@mistralai/mistralai`: 2.2.2, 2.2.3, 2.2.4
- `@mistralai/mistralai-azure`: 1.7.1, 1.7.2, 1.7.3
- `@mistralai/mistralai-gcp`: 1.7.1, 1.7.2, 1.7.3
- `@opensearch-project/opensearch`: 3.5.3, 3.6.2, 3.7.0, 3.8.0
- 完全リストは safedep 記事を参照

### IoC ドメイン / IP
- `git-tanstack.com`（タイポスクワット、Cloudflare がフィッシング判定済み）
- `filev2.getsession.org`（Session メッセンジャー経由の C2）
- `seed1.getsession.org`, `seed2.getsession.org`, `seed3.getsession.org`
- `83.142.209.194`
- 配下パスの例: `https://git-tanstack.com/transformers.pyz`

### 永続化・ドロップアーティファクト
- macOS: `~/Library/LaunchAgents/com.user.gh-token-monitor.plist`
- Linux: `~/.config/systemd/user/gh-token-monitor.service`
- リポ内に作られるファイル:
  - `.claude/settings.json`, `.claude/setup.mjs`, `.claude/router_runtime.js`
  - `.vscode/tasks.json`, `.vscode/setup.mjs`
- 一時ファイル: `/tmp/transformers.pyz`（PyPI 経由感染）
- `router_init.js`（npm 経由感染、`prepare` script から実行される ~2.3MB の難読化バンドル）

### ファイルハッシュ
- `router_init.js` MD5: `ab4fcadaec49c03278063dd269ea5eef`
- `@mistralai/mistralai@2.2.2` tarball SHA-256: `ce7e4199506959fd7a71b64209b2c07b9c82e53a946aa7d78298dc9249230d01`

### 窃取対象クレデンシャル（grep ターゲット）
- `ghp_`, `gho_`, `ghs_`, `ghu_`（GitHub トークン各種）
- `npm_`（npm publish トークン）
- AWS IMDS (`169.254.169.254/latest/meta-data/iam/security-credentials/`)
- Vault (`127.0.0.1:8200`)
- GCP / Azure メタデータエンドポイント

### 攻撃の入口
- GitHub Actions の `pull_request_target` ワークフロー + Actions キャッシュ汚染
- フォークをリネームして検知回避 → PR で `pull_request_target` をトリガー
- ランナーの `/proc/<pid>/mem` から OIDC トークンを直接抽出
- 盗んだトークンで maintainer 権限を持つアカウントとして悪性版を publish（アカウント乗っ取りではない）

### 関連リポジトリ（参考）
- 悪意あるコミット: `tanstack/router#79ac49eedf774dd4b0cfa308722bc463cfe5885c`

## 調査手順（この順序で）

### Phase 1 — マニフェスト層（モノレポ対応・再帰必須）
1. **再帰列挙**: `find . -name "package.json" -not -path "*/node_modules/*"` 等で **全 manifest を列挙**。モノレポのサブパッケージ取りこぼし厳禁
2. 全 lockfile (`pnpm-lock.yaml` / `package-lock.json` / `yarn.lock` / `requirements*.txt` / `pyproject.toml` / `poetry.lock` / `uv.lock`) を Read し、侵害パッケージ名を grep。一致 0 を「侵害無し（install 対象）」と確定
3. lockfile と manifest の日付乖離を確認し、`--frozen-lockfile` 運用かを示唆
4. **lifecycle scripts 監査**: 全 `package.json` の `scripts.preinstall` / `scripts.postinstall` / `scripts.prepare` を抽出し、IoC ドメインや不審な curl/wget/node -e を含まないか確認（本攻撃の感染トリガー）
5. **コンテナ/CI スクリプト**: `Dockerfile` / `docker-compose.yml` / `.devcontainer/devcontainer.json` / シェルスクリプト内の `npm install` 系コマンドを列挙。lockfile を無視する `npm install --no-package-lock` や `npm i` 単発実行は要警戒
6. **`optionalDependencies` の特別注意**: 本攻撃は optional 経由で侵害版を差し込んでいたため、全 `package.json` の `optionalDependencies` キーを目視レビュー

### Phase 2 — 実体層（lockfile と install 状態の突合）
7. `node_modules` / `.venv` / `site-packages` / `~/.npm/_cacache/` / `~/.local/share/pnpm/store/v3/files/` 配下を read-only な find で侵害パッケージのディレクトリ名のみ照合
8. install 状態が lockfile から乖離していないかチェック（乖離があれば手動混入リスクを警告）
9. **node_modules 内の lifecycle scripts**: `find node_modules -name "package.json" -path "*/node_modules/*" | xargs grep -l "preinstall\|postinstall\|prepare"` のリストから、侵害スコープに該当する package.json があれば内容を Read
10. **PyPI ハッシュ照合**: `poetry.lock` / `uv.lock` に記録された `sha256` 値と既知の侵害ハッシュ（`ce7e4199506959fd7a71b64209b2c07b9c82e53a946aa7d78298dc9249230d01` 等）を突合
11. **npm tarball ハッシュ**: `package-lock.json` の `integrity` (sha512) や `pnpm-lock.yaml` の `resolution.integrity` に既知侵害版が含まれていないか確認

### Phase 3 — IoC 全文検索
12. リポジトリ全文に対し IoC ドメイン / IP / アーティファクト名 / ハッシュを grep（`--exclude-dir=node_modules --exclude-dir=.git`）
13. node_modules 配下も別途 grep（攻撃公表後に install されたパッケージにペイロードが残存する可能性）
14. 添付バイナリ（.tgz / .whl 等）が自前リリース物か外部由来かを区別

### Phase 4 — ホスト永続化（このリポを clone した端末の調査）
**ベースライン日付**: 攻撃公表日 = **2026-05-11**。これ以降に変更されたファイルを高優先で調査。

15. 永続化サービスの存在チェック（kill/unload はしない、`ls` / `launchctl list` / `systemctl --user list-units` のみ）:
    - macOS: `~/Library/LaunchAgents/com.user.gh-token-monitor.plist`, `~/Library/LaunchDaemons/` 配下の不審 plist
    - Linux: `~/.config/systemd/user/gh-token-monitor.service`, `~/.config/autostart/`, `crontab -l`
16. **クレデンシャル/設定ファイルの mtime 監査**（ベースライン超え検出）:
    ```bash
    find ~/.aws ~/.config/gh ~/.npmrc ~/.pypirc ~/.ssh ~/.docker/config.json \
      -type f -newermt "2026-05-09" 2>/dev/null
    ```
    ヒットがあれば中身を Read し改変痕跡を確認（追記された exfil コード等）
17. **稼働中プロセスの確認**（kill しない、grep のみ）:
    ```bash
    ps aux | grep -iE "gh-token-monitor|router_init|router_runtime|transformers\.pyz"
    ```
18. **アクティブな C2 接続**:
    ```bash
    lsof -i -n -P 2>/dev/null | grep -E "83\.142\.209\.194|getsession\.org|git-tanstack"
    ```
19. **VS Code 拡張**: `~/.vscode/extensions/` を ls し、攻撃公表日以降に追加された拡張が無いか確認（Shai-Hulud 系の常套手段）
20. **Claude Code / Cursor 等の AI ツール設定**: `~/.claude/`, `~/.cursor/`, `~/.continue/` 配下の `settings.json` / `mcp.json` に攻撃で言及された IoC ドメインや改変痕跡が無いか
21. **発見した場合は user に報告のみ。除去手順は提案するが実行しない。** トークン revoke の前に必ず永続化を除去する順序を案内

### Phase 5 — CI/CD 攻撃面
22. `.github/workflows/*.yml` を Read し、以下を判定:
    - `pull_request_target` の有無（最大リスク・本攻撃の入口）
    - `workflow_run` の有無
    - フォークから書き込み可能な `permissions:` 設定
    - 外部 action の SHA pinning 状況
    - GitHub Actions cache を有効化している箇所（キャッシュ汚染の媒介）
23. **過去の workflow run 履歴を user に確認**（直接 gh CLI を叩いて標的化されないため、user に依頼する形式で）:
    - 2026-05-01〜公表日の間に走った workflow run の有無
    - 該当期間に走っていた場合、その run で `secrets.*` が参照されていれば **流出済みとみなす**
24. リポが publisher（npm publish 等）の場合、`secrets.NPM_TOKEN` の使用箇所と保護ブランチ条件を確認

### Phase 6 — 過去感染フォレンジック（「今クリーン」≠「過去にも安全」を検証）
**目的**: 攻撃公表前後（2026-05-09〜現在）に侵害版が install されたことが無いかを、副作用ゼロで検出する。

25. **npm/pnpm/yarn のログ調査**:
    ```bash
    # npm: 直近の install ログを侵害スコープで grep
    grep -rE "@tanstack/|@uipath/|@mistralai/|@squawk/|@tallyui/|@beproduct/|@opensearch-project/opensearch|mistralai|guardrails-ai" \
      ~/.npm/_logs/ 2>/dev/null | head -20

    # pnpm: store 内に侵害版が残存していないか
    find ~/.local/share/pnpm/store ~/Library/pnpm/store -type d -name "*tanstack*" -o -name "*mistralai*" 2>/dev/null
    ```
26. **git log で依存変更履歴を追う**:
    ```bash
    # 公表前後で lockfile が動いていないか
    git log --since="2026-05-01" --oneline -- package*.json pnpm-lock.yaml yarn.lock poetry.lock uv.lock requirements*.txt
    # 攻撃公表日前後に PR/merge があれば、その時点の lockfile を git show で確認
    ```
27. **`pip`/`uv` のキャッシュ**:
    ```bash
    find ~/.cache/pip ~/.cache/uv -type d \( -name "*guardrails*" -o -name "*mistralai*" \) 2>/dev/null
    ```
28. **Publisher 向け: 自パッケージの予期せぬ publish 検出** (publisher の場合のみ):
    ```bash
    # 自分の npm パッケージ名で、攻撃公表日前後に身に覚えのない publish が無いか
    npm view <your-package-name> time --json | jq 'to_entries[] | select(.value > "2026-05-01")'
    ```
    身に覚えのないバージョンがあれば、トークンを使わず publish された可能性 → **OIDC で publish された痕跡を npm support に確認依頼**
29. **Secrets 流出ウィンドウの確定**: Phase 5-23 で「該当期間に走った workflow run」が見つかった場合:
    - その run でアクセスした全 secret を **侵害済み** として列挙
    - 当該 secret を使う全ての外部システム（クラウド・SaaS・registry）の監査ログを user に確認依頼

## 報告フォーマット
```
## 結論
[侵害あり / クリーン / 要追加調査] を一行で。
**「クリーン」と判定できる条件: Phase 1〜6 の全 29 項目で陰性確認かつ未実行項目ゼロ。** 1 つでも未実行ならば "要追加調査"。

## 検査マトリクス
| Phase | # | 検査項目 | 実行結果 | 判定 |
|-------|---|---------|---------|------|
| 1 | 1 | manifest 再帰列挙 | ... | ✅/⚠️/❌/未実行 |
| ...（29 項目すべて行を立てる）

## 検出された懸念事項
- 各懸念について「何が」「どこに」「いつから」を明示

## 残リスク
- 静的解析の射程外（例: メモリのみで動作する 0-day、未公表 IoC）

## 推奨アクション（順序厳守）
1. **永続化デーモン除去**（trust されたツールで）— トークン revoke より先
2. **クレデンシャル rotate** — GitHub → npm → クラウド → Vault の順
3. **流出ウィンドウ内に動いた CI run の secret 全件監査**
4. lockfile を Git 履歴から既知クリーン版に rollback
5. Socket.dev / Snyk / Aikido / safedep vet 等で深掘り検証
```

## 判断指針
- **「全 Phase 通過 = クリーン」のみが安全な結論**。一つでも未実行・権限拒否・部分実行があれば "要追加調査" にエスカレーション
- grep 0 ヒットは陰性証拠として強い（lockfile は install 対象の唯一の真実）。ただし「lockfile に無い = 実体にも無い」とは断定しない（手動配置・過去 install リスクは Phase 2 / Phase 6 で潰す）
- 不明点は実行ではなく user への質問で解決する
- 権限拒否されたコマンドを別経路で迂回しない（ユーザーの権限設計を尊重）
- **このプロンプトは初期トリアージ用**。商用ツール (Socket.dev / Snyk / Aikido / safedep vet / GitHub Dependabot Alert) と併用すること
````

---

## 参考ソース（ポストに含めるなら）
- Wiz: Mini Shai-Hulud Strikes Again
- Orca Security: TanStack and 160+ npm/PyPI Packages Compromised
- safedep: Mass Supply Chain Attack Hits TanStack, Mistral AI
- NHS England Digital: cc-4781

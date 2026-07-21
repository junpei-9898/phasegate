---
id: WI-329
type: fix
source: exocortex-review P7
---

# WI-329: 実分布リリースゲート — tarball クリーンインストール smoke + 週次 canary

<!-- @work-item-id WI-329 -->

## 問題

単体テストが全 green でも、以下の「実分布欠陥」がリリースをすり抜けた実績がある:

- github#34: npm pack した tarball の新規インストールで CLI が即クラッシュ
- github#37 / #39: 純 Python リポジトリ（package.json なし相当）で validator が
  fail-closed し config エラーになる
- github#36: `install --with-husky` / `--with-ci` が dead flag

いずれも「source tree 上の tsx 直実行」では再現せず、「配布 tarball を
実ユーザー相当の環境にクリーンインストールして主要コマンドを実走」して
初めて露見する欠陥クラスである。既存 CI にはこの検証がゼロだった
（pack job は 5MB サイズチェックのみ）。

## 修正

### 1. release-smoke E2E（リリースゲート・凍結解決）

- fixture リポ 3 種を checked-in:
  `scripts/harness/__tests__/fixtures/release-smoke/{pure-python,go-monorepo,docs-only}/`
- `scripts/harness/__tests__/e2e/release-smoke.e2e.test.ts`:
  - `PHASEGATE_RELEASE_SMOKE=1` ガード（無ければ全 skip、通常 suite の hermetic 性維持）
  - tarball は `PHASEGATE_TARBALL` で注入、未指定なら `npm pack` を自走
  - 各 fixture で実走: `npm install <tarball>`（#34 検知）→
    `install --apply --agent claude`（デフォルトで Husky/CI を書かない = #36 型検知）→
    `doctor --json`（クラッシュ検知）→ `validate --layer L2 --json`
    （exit 2 fail-closed = #37/#39 型検知、pure-python は skip ≥ 1）→
    `uninstall --apply` / `--apply --force`（撤去確認）
  - `install --apply --with-husky` で `.husky/pre-commit` が作られること（dead flag 検知）
- ci.yml: pack job に tarball artifact upload を追加し、新 job `release-smoke`
  （needs: pack, Node 22）がその実バイト列に対して上記テストを実行

### 2. release-canary（週次・最新解決）

- `.github/workflows/release-canary.yml`: cron 週次（月曜 03:00 UTC）+ workflow_dispatch
- lockfile を使わず最新解決でインストールして同じ release-smoke テストを実行
  （release gate = 凍結解決で出荷物を検証 / canary = 最新解決で upstream ドリフト検知の 2 層分離）
- 失敗時は `[canary]` prefix の issue を作成（既存 open の同種 issue があれば
  コメント追記）。required check には入れず、リリースは止めない

## Acceptance Criteria

- [x] ガードなし実行で release-smoke テストが全 skip されること
- [x] `PHASEGATE_RELEASE_SMOKE=1` で 3 fixture × 主要コマンド実走が全 green
- [x] tarball インストール失敗（exit ≠ 0 / bin 欠落）を fail として検知できること
- [x] pure-python で `validate --layer L2` が exit 2 にならず TS 系 validator が SKIP されること
- [x] `--with-husky` フラグの有効性が assert されること
- [x] ci.yml は既存 job の内容・順序を変えず追加のみ
- [ ] release-canary.yml の配置（pre-tool-use hook が新規 workflow ファイル作成を
      feature 分類でブロックするため、レビュー後に正規手順で配置する）

## 検証

```bash
# skip 確認
npx vitest run --config scripts/harness/__tests__/vitest.config.ts \
  scripts/harness/__tests__/e2e/release-smoke.e2e.test.ts

# 実走（ネットワーク使用）
PHASEGATE_RELEASE_SMOKE=1 npx vitest run \
  --config scripts/harness/__tests__/vitest.config.ts \
  scripts/harness/__tests__/e2e/release-smoke.e2e.test.ts
```

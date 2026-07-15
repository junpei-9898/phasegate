---
name: release-publisher
kind: advisory
description: phasegate のリリース手順（version bump / git tag / npm publish）の厳格ガイド。この npm アカウントは security key (FIDO/WebAuthn) 認証のため publish は必ず `npm publish --auth-type=web`。使用タイミング:「リリースして」「publish して」「npm に上げて」「バージョンを上げてタグを打って」「EOTP エラーが出た」「npm publish が認証で失敗する」など、version bump・タグ付与・npm publish・publish 認証トラブルに関わる場面。
model: sonnet
review: opus
languages: [typescript]
---

# Release Publisher

## 目的

phasegate パッケージのリリース（version bump → git tag → npm publish）を、誤操作・認証事故なしに完遂するための厳格手順ガイド（advisory）。正となる規範は `CLAUDE.md` の「バージョニングルール」「npm publish ルール」節、および `DEVELOPMENT.md` の「Versioning and Release」「Troubleshooting npm publish authentication」節。本スキルはそれらを実行手順として展開する。

## 絶対ルール（違反禁止）

1. **この npm アカウントは security key (FIDO/WebAuthn) 認証**。publish は必ず:

   ```bash
   npm publish --auth-type=web   # ブラウザで security key 認証 → publish
   ```

2. **禁止事項**:
   - `npm publish --otp=<code>` を実行すること（`--otp` フラグは TOTP 専用。security key 認証では拒否される）
   - ユーザーに OTP を尋ねること
   - authenticator アプリの参照を提案すること
3. **EOTP エラーが出たら、OTP を聞き返さずに直ちに `--auth-type=web` に切り替える。**
4. **コミットごとに `package.json` の minor バージョンを上げる**（`"0.X.0"` → `"0.(X+1).0"`）。タグ `vX.Y.Z` を付与して push する。

## リリース手順

### Step 1: 事前クロスチェック（3点照合）

local の `package.json` は npm registry と乖離しうる（過去に registry v0.32.0 / local v0.38.0 の乖離事例あり）。publish 前に必ず 3 つを照合する:

```bash
npm view phasegate version       # registry latest
git tag --list | tail -5         # local tags
grep '"version"' package.json    # local version
```

乖離があれば原因（publish 漏れ / tag 漏れ）を特定してから進む。

### Step 2: version bump と CHANGELOG

1. `package.json` の `version` を minor bump（例: `0.5.0` → `0.6.0`）
2. `CHANGELOG.md` にエントリを追加

### Step 3: commit / tag / push

```bash
git add package.json CHANGELOG.md
git commit -m "fix: vX.Y.Z — description"
git tag vX.Y.Z
git push origin main --tags
```

### Step 4: 認証確認と dry-run

```bash
npm whoami                # 未ログインなら: npm login --auth-type=web
npm publish --dry-run     # tarball の内容を確認
```

### Step 5: publish

```bash
npm publish --auth-type=web
```

ブラウザが開くので security key で認証すると publish が完了する。

## 認証トラブルシューティング

`npm publish` の挙動はアカウントの 2FA モードに依存する:

| 2FA モード | publish の挙動 | 対処 |
|---|---|---|
| 無効 | そのまま通る | `npm publish` |
| TOTP (authenticator アプリ) | `EOTP` エラー → OTP 要求 | `npm publish --otp=<6桁>` |
| Email OTP (Enhanced Login Verification) | `EOTP` エラー → メールでコード送付 | 受信箱を確認して `--otp=<6桁>` |
| **Security key / Passkey (FIDO/WebAuthn)** ← このアカウント | `EOTP` エラー（`--otp` は TOTP 専用のため使用不可） | **`npm publish --auth-type=web`** — ブラウザが開き、キーで認証して publish 完了 |

**security key アカウントの鉄則**: 常に `--auth-type=web` を使う。`--otp` フラグは TOTP 専用であり拒否される。EOTP エラーを見たら OTP を探しに行かず、直ちに `--auth-type=web` で再実行する。

**CI / 自動化**: https://www.npmjs.com/settings/&lt;username&gt;/tokens から **Granular Access Token**（scope: 対象パッケージ、permissions: Read and write、Bypass 2FA: enabled）を発行し、`.npmrc` の `//registry.npmjs.org/:_authToken=<TOKEN>` または `NPM_TOKEN` 環境変数で注入する。

## よくある失敗と回避

| 症状 | 原因 | 回避 |
|------|------|------|
| `EOTP` エラーで停止し OTP を探し始める | `--otp` が TOTP 専用であることを知らない | 直ちに `--auth-type=web` に切替（OTP を聞き返さない） |
| registry と local version の乖離 | publish 漏れ・tag 漏れの蓄積 | Step 1 の 3 点照合を必ず実施 |
| tag なしで publish | 手順の省略 | Step 3 の tag + `--tags` push を省略しない |
| CHANGELOG 未更新のまま publish | version bump のみ実施 | Step 2 で CHANGELOG エントリ追加を必ずセットで行う |

## 参照

- `CLAUDE.md` — 「バージョニングルール（必須）」「npm publish ルール（必須）」
- `DEVELOPMENT.md` — 「Versioning and Release」「Troubleshooting npm publish authentication」「Cross-check before publishing」

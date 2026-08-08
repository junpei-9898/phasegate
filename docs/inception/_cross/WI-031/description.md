---
id: WI-031
type: story
severity: normal
status: reflected
affects: [ci-governance]
---

# WI-031: CI template の二系統統一 + `phasegate init --with-ci` による自動配置

> 起票日: 2026-04-25
> 親 audit: WI-030

## 背景

phasegate には CI/CD ワークフロー template を生成する 2 つの経路が存在し、出力 YAML が一致しない:

| 経路 | 生成内容 | cron 設定 | GitHub Issue 自動作成 |
|---|---|---|---|
| **bundled template** (`scripts/harness/templates/.github/workflows/consistency-check.yml`) | static YAML | `0 4 * * 1` (月曜 04:00 UTC) | ✅ あり (`github.rest.issues.create`) |
| **CLI generator** (`ci:generate-template --type consistency-check --render`) | `yaml-template-renderer-adapter.ts` 内の文字列構築 | `0 2 * * *` (毎日 02:00 UTC) | ❌ 無し |

これにより:

1. README.ja.md は両者の挙動を区別せず「毎週月曜 09:00 UTC + GitHub Issue 自動作成」と記述（実態とも一致しない）
2. user が CLI 経由で生成すると issue 自動作成が抜ける
3. `phasegate init` は workflows を**配置しない**ため、user が手動で template を git に commit しないと L4 が走らない

## 本 WI でやること

### Phase 1: template 経路の統一（`ci-governance` unit）

1. `yaml-template-renderer-adapter.ts` を **bundled template ファイル読み込み + 変数置換**方式に切り替え
   - cron 値を preset 由来 (`triggerSchedule` 等) で differentiate しつつ、bundled YAML を template として使う
2. `aidlc-gate.yml` / `consistency-check.yml` / `pre-commit` の 3 type すべてが bundled template と一致する
3. unit test で「bundled YAML と CLI 生成 YAML が同等」であることを保証

### Phase 2: `phasegate init --with-ci` オプション追加（`harness-api` unit）

1. `init` コマンドに `--with-ci` フラグを追加
2. flag 指定時は `.github/workflows/consistency-check.yml` と `aidlc-gate.yml` を deploy
3. `--agent` / `--with-husky` と同じテンプレートデプロイロジックを流用
4. `phasegate.config.json` に `ci.enabled: true` 等のメタ情報を残す（再 `update` 時の参考に）

### Phase 3: README / docs 更新

1. README.md / README.ja.md の「CI/CD」節に `--with-ci` の使い方を追加
2. 統一された cron 時刻（提案: 月曜 04:00 UTC）を明記

## 受け入れ基準

- [x] CLI generator と bundled template の YAML が **byte-for-byte または semantic equivalent** で一致
- [x] `npx phasegate init --with-ci` で `.github/workflows/{aidlc-gate,consistency-check}.yml` が配置される
- [x] CLI 生成 / bundled の双方で GitHub Issue 自動作成 logic が含まれる
- [x] cron 時刻が 1 箇所で定義され、両経路で一致する
- [x] unit test で 3 type 全 template の生成内容を回帰
- [x] README に `--with-ci` オプションの使い方が追加される

## 完了メモ

- `ci:generate-template --render` は `docs/templates/ci/*.yml` / `docs/templates/hooks/pre-commit` を正本として stdout に出力する。
- `phasegate init --with-ci` は `.github/workflows/aidlc-gate.yml` と `.github/workflows/consistency-check.yml` を opt-in 配置する。
- 既存 workflow は上書きせず skipped として扱う。

## スコープ外

- 既存 `phasegate init` 利用者への migrate path（後方互換 break しない）
- `pre-commit` template の Husky 統合（既存 `--with-husky` で対応済み）

## 関連

- 親 audit: WI-030
- 関連実装: `scripts/harness/ci-governance/infrastructure/adapters/yaml-template-renderer-adapter.ts`、`scripts/harness/templates/.github/workflows/`、`scripts/harness/main.ts:530`（init handler）

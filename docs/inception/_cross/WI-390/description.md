---
id: WI-390
type: issue
severity: high
status: tested
affects: [agent-integration, installation, quick-mode, harness-api]
source: GitHub issues #47, #48, #49, #50
---

# WI-390: open issue #47〜#50 の防御・分類・診断不整合を解消して公開する

<!-- @work-item-id WI-390 -->

## 背景

2026-08-10 時点の `main`（v0.339.0）には GitHub issue #47〜#50 の中核症状が残っている。

| Issue | 現行の観測 | 必要な是正 |
|---|---|---|
| #47 | PostToolUse formatter が既存 single quote ファイルを全面変換し、analyze hook は素の `biome lint` を実行する | repository の formatter 契約を明示し、分析を PhaseGate lint 契約へ統一する |
| #48 | doctor は `.husky/*` の本文だけを読み、`core.hooksPath` と v9 shim を検証しない | Git が実際に参照する hook runtime を診断する |
| #49 | `docs/` 外の `.md` / `.mdx` CREATE が `feature`、単一カテゴリ拒否も `MIXED_CHANGES` | 拡張子分類と拒否語彙を分離し、instruction surface は protected route で守る |
| #50 | agent が `phasegate.config.json` を直接編集でき、block 文面が `protectedFiles.exclude` の回避レシピを返す | config と防御 trust root を非除外 protected とし、managed command / human out-of-band recovery のみにする |

加えて npm `latest` は v0.335.0 で main v0.339.0 より遅れており、GitHub Releases が存在しない。
修正は packed tarball と registry からの fresh install で検証し、v0.340.0 として npm / GitHub に公開する。

## 受け入れ基準

- [ ] `biome.json` が repository の single quote 契約を明示し、PostToolUse format が quote churn を起こさない。
- [ ] `analyze-errors-hook.sh` は project 全体を `phasegate lint` で検査し、素の Biome ruleや単一-file参照解析による偽陽性 block を返さない。
- [ ] doctor は project install で `core.hooksPath` unset、`.husky` / `.husky/_` 以外、v9 shim 欠落を red finding として報告する。
- [ ] personal install の `.git/hooks` 契約は Husky project finding の対象外のまま維持する。
- [ ] `.md` / `.mdx` は配置場所にかかわらず `docs` に分類される。ただし agent instruction / config / L0 runtime は protected-file 判定が先に発火する。
- [ ] 単一カテゴリが allowedCategories 外の場合は `CATEGORY_NOT_ALLOWED`、複数カテゴリの場合だけ `MIXED_CHANGES` を返す。
- [ ] project / personal の `phasegate.config.json`、baseline、Husky runtime、root agent instruction は `protectedFiles.exclude` で除外できない。
- [ ] config の direct Write/Edit は valid / missing / invalid-json / invalid-schema の全状態で block される。hook / doctor の fail-open と無関係操作は維持する。
- [ ] protected-file block 文面は `protectedFiles.exclude` の具体的回避手順を返さず、managed CLI と人間の out-of-band 編集を案内する。
- [ ] ADR-038 の許可表を実装と同時に改訂し、ADR-041 で非除外 trust root を決定する。
- [ ] targeted tests、full tests、lint、typecheck、PhaseGate readiness、`npm pack` release-smoke が green になる。
- [ ] v0.340.0 を tag / push し、`npm publish --auth-type=web` と GitHub Release を完了する。
- [ ] registry の `phasegate@0.340.0` を空 temp project に install し、4 issue の公開物挙動を再検証する。
- [ ] GitHub issue #47〜#50 に公開版の証跡を記録して close する。

## 非目標

- Biome の全ルールを PhaseGate L1 に取り込むこと。
- agent identity / skill 名を authorization 入力に戻すこと。
- `protectedFiles.exclude` 自体を廃止すること。通常の config / dependency file 向け除外用途は維持する。
- npm publish の認証方式を変更すること。

## 設計判断

1. #47 は formatter の正本を `biome.json` に置き、analysis は project 全体の `phasegate lint` に統一する。
2. #48 は Git CLI と filesystem を読む infrastructure probe を Port 越しに doctor check へ注入する。
3. #49 は拡張子を contents type として扱い、instruction files のリスクは分類語彙を歪めず protected trust root で処理する。
4. #50 は diff 内容を hook が信頼して判定せず、observable path に基づいて direct mutation を一律 block する。正式変更は managed CLI、未対応 intent は人間の hook 外編集とする。
5. 既存 `protectedFiles.exclude` が防御基盤を外せないよう、trust-root patterns と通常 default patterns を分離する。

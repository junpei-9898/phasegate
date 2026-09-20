# WI-223 検証報告

<!-- @work-item-id WI-223 -->
2026-09-20。配布構成の限定改善であり、全スキルの言語非依存化・agent性能の改善を完了した報告ではない。

## 実装

- 配布カテゴリ/選択をinstallationの既存モジュールに集約。setup公開APIは委譲で維持し、カタログ重複45行を削減した。
- 明示選択consumer=27件（旧allからrelease-publisher/skill-creatorのみ除外）。core=7/all=29/省略allを維持。
- init/installのCLI、doctor、reconcile、agent contextのセット表示を接続。reconcileがcoreもallへ戻していた問題を修正。
- 本体用2スキルのdescriptionを本体作業に限定し、skill-creatorの重複カタログ更新指示・古い件数を整理。
- 新registry、plugin基盤、技術別スキル群、移行設定は追加しない。既存配置物を自動削除しない。

## 検証結果

| 検証 | 結果 |
|---|---|
| 追加テストの変更前 | 15件中12件失敗。consumer選択、記録解決、core再配置の問題を観測 |
| 初期対象回帰 | 5ファイル107件成功（2.71秒） |
| CLI追加後の関連回帰 | 65ファイル537件成功（31.98秒）。installation Unit/IT、setup、harness-api Unit/IT、実skills corpusを含む |
| 新規consumer試験 | 上記に19件を含む。project/personal、core/all、preview、ユーザースキル保持、実CLI init/install、未知値拒否 |
| TypeScript | `tsc --noEmit` exit 0 |
| lint | `phasegate:lint --json` pass |
| readiness | `phasegate:check-ready --json` allPassed=true。全ACや意味的承認の証拠とは別 |
| metadata | WI3文書・product6文書 valid。新規テストの@story不足を検出しH11-01を付与後valid |
| integrity | 編集した2スキルのmismatchを検出。正規integrity:pin後ok=true/drifts=[]。更新差分は当該2エントリのみ |
| whitespace | `git diff --check -- . ':!docs/folder_management_rules.md'` 指摘なし（既存のユーザー編集規約は対象外） |
| 汎用skill validator | Phasegate独自のkind/languages/model/reviewを未対応として拒否。削除で合わせず、PJの実corpus検査の成功と区別する |

配布物のrelease/upgrade初回は20件のassertが成功したが、Vitest workerの`Timeout calling onTaskUpdate`が1件ありexit 1。`--pool forks --maxWorkers 1`で同時に再実行しても20件成功・同じ通知エラーでexit 1だった。この2回は実行全体の成功とは扱わない。

同一archive・同一assertのまま、releaseを単独プロセス、upgradeを`-t`で1ケースずつ別プロセスに分けて再確認した。最終的に全20件を網羅し、5プロセスすべてexit 0、未処理エラーなし。判定の緩和やエラーの無視は行っていない。一括実行時の実行器エラー自体は未修正であり、一括suite成功とは区別する。

| 個別配布検証 | 結果 |
|---|---|
| release-smoke（Python / Go / docs-only / Husky明示選択） | 16件成功、41.05秒、exit 0 |
| 既存coverage設定で更新後だけ拒否を増やさない | 1件成功、19.55秒、exit 0 |
| 設定の正規変更で編集再開・直接書込み保護 | 1件成功、19.92秒、exit 0 |
| 利用者変更の保持・明示更新バックアップ | 1件成功、14.06秒、exit 0 |
| runtime更新・再配置・旧版復旧で設定/文書保持 | 1件成功、30.72秒、exit 0 |

再現時は`PHASEGATE_TARBALL`を下記候補、`PHASEGATE_OLD_TARBALL`を`/tmp/phasegate-wi220-artifacts.6fQqAv/old/phasegate-0.340.0.tgz`に設定する。releaseは`PHASEGATE_RELEASE_SMOKE=1`で`vitest run scripts/harness/__tests__/e2e/release-smoke.e2e.test.ts --pool forks --maxWorkers 1`を実行する。upgradeは`PHASEGATE_UPGRADE_SMOKE=1`で`vitest run scripts/harness/__tests__/e2e/package-upgrade-compatibility.e2e.test.ts --pool forks --maxWorkers 1 -t '<対象名>'`を4回実行する。対象名は順に`既存のcoverage設定`、`設定の正規変更`、`利用者が変更した管理ファイル`、`runtime更新・再配置・旧版復旧`。各回の3件skipは選択対象外であり、4回で全4件を網羅する。一時archiveは永続成果物ではない。

## 配布候補

- `/tmp/phasegate-wi223-final.ZzNVd6/phasegate-0.341.0.tgz`
- SHA-256: `88b498ec339d9493751f038bbabdb912ae1ee49847b4669264e57902f8ac1f01`
- 2,103,919 bytes / 3,684 entries。現在のローカルpackage versionを使用し、本WIではversion変更なし。
- ビルド: `npm run --silent pack:runtime -- --pack-destination <空の一時directory>`。

## 制限と残件

- skill-doctorの正式診断は対象と主実行者tierが未回答のため未実施。skill-creatorの「固有情報と必要な境界に絞る」方針を本体用descriptionとカタログ指示に適用したが、実agent A/Bは行っていない。
- 29件のlanguages宣言やVitest/Playwright前提の全面見直し、重複スキル統合、厳密な本文文字列置換の廃止は未実施。本WIでこの全体課題を解消済みとはしない。
- consumerは新規配置では27件。既存allから切替えても旧スキルを削除しない。既定allは互換のため維持する。
- 選択metadataが欠落/不正/未知なら旧allへfallbackする。これは選択記録を失ってもconsumerを復元できるという保証ではない。
- 全体suite、全OS/全Node、全配布agentのconsumer個別試験は未実施。実CLI consumerはClaude、handler lifecycleはshared/personalを確認した範囲。
- WI-220/221の未達や状態を変更しない。commit/push/publish、このPJへのinstall/reconcileは未実施。

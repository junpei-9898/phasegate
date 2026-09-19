# B0 互換性インベントリ

<!-- @work-item-id WI-220 -->

## 基準と検証環境

- 実装開始時HEAD: `c63e06694c4b56d0fd67893652a20fc94cfa8200`、package version `0.340.0`。
- `v0.340.0` tag object: `c267ae2cc65b8d4e50400f83bed2bb7d668ce86e`。annotated tagの可能性があるため配布比較時はpeeled commitとtarball hashも記録する。HEADと同じと推定しない。
- `v0.339.0` tag object: `38b5c95f3dd6945177053bd3c58949e669b73515`。
- `git rev-parse '<tag>^{commit}'`で確認したcommit: v0.340.0=`c63e06694c4b56d0fd67893652a20fc94cfa8200`（開始時HEADと一致）、v0.339.0=`38b5c95f3dd6945177053bd3c58949e669b73515`。tarball同一性は未確認。
- ローカルNode `v24.13.0`、Vitest `3.2.4`。pnpmはPATH上にない。既存node_modulesの実行ファイルを使い、依存追加・lock変更はしない。
- package契約: Node `>=18.0.0`、TypeScript peer `>=5.0.0 <7.0.0`。Node24だけの実測を全対応環境の証明にしない。
- 開始前からの変更: `.phasegate/hook-skip-events.jsonl`、`.codex/config.toml`、`docs/inception/_shared/artifact.md`。本WIの計画文書も未追跡。無関係な変更は維持する。

## 公開境界と変更制約

### 最終runtime候補 B5a（2026-09-19、未公開）

`pack:runtime` で生成した2,101,996 bytesのarchive。SHA-256 `39b7bcc5f788fef782e386d50327beec88188a41a0f3a783932af6c73146417c`、一時パス `/tmp/phasegate-wi220-b5a.kCIAUM/phasegate-0.340.0.tgz`。Node24/macOSで旧0.340.0/0.335.0との更新・復旧、Node18.20.8/22.23.2/24でrelease-smokeを確認した。TS/bin/assetsを残し、一時pack内だけにJS/mapを追加する。開発checkoutと通常source packはTS入口を維持する。

D08により互換比較対象は実公開0.335.0と0.340.0で確定。最古サポート版一般の保守方針を確定したものではない。歴史的候補を下記に残すが、最新の集計はvalidation_report.md冒頭とvalidation_evidence.jsonを参照する。各agent課題は事前固定した別候補を含むため、すべてをB5a実行と呼ばない。

### 2026-09-19 配布比較用アーカイブ

`npm pack --ignore-scripts`で取得。両方versionは0.340.0だが異なる実体であり、候補版は未公開。

| 実体 | SHA-256 | bytes |
|---|---|---|
| npm公開版 | `a34db8b647f17264b612dd00814facd7503db09a1624c550e2b7b66582a501d6` | 1105490 |
| B3bまでの候補版 | `1abce8548f234779fdb00482cac7cda747db3ecac71ec20f342ef8a611718867` | 1109933 |

一時保存先は `/tmp/phasegate-wi220-artifacts.6fQqAv/{old,candidate}/phasegate-0.340.0.tgz`。一時領域なので永続的な配布URLではない。以降runtimeを変更した場合は再pack・hash記録・再検証が必要。

B4a/B4b反映後の再pack: `/tmp/phasegate-wi220-b4-package.remKos/phasegate-0.340.0.tgz`、1111383 bytes、SHA-256 `8f7cec4643c1bee6e8e0372f09933f6a7ce46ecde904fdb7b05746a475761404`。こちらも未公開候補であり、旧B3b候補の検証結果を自動的に引き継がない。

B2h（CLI遅延読込）候補: `/tmp/phasegate-wi220-b2h.kkWS6M/phasegate-0.340.0.tgz`、1111380 bytes、SHA-256 `9fb4ee4949f0292e72b801a7642595bd2cee3fc5adbc3f36aacce0f835cb4139`。B4候補でのT21未合格を解消した証拠はまだなく、公開不可のまま再評価する。

### 契約一覧

| 境界 | 確認した現状 | 本WIの互換方針 |
|---|---|---|
| npm bin | `bin/phasegate` | 維持 |
| runtime TS | `scripts/harness/**/*.ts` はtestsを除きpackage files対象 | repo内に呼出元がなくてもdeep import可能性がある。名前の単純削除をしない |
| PlanChecker | `createSkillQualityHandlers` の戻り値にhandlerあり。repo内の実呼出は検索で未発見 | factoryの返却キー・handler入口を維持。実本文読取りと反復停止の契約をテスト |
| PlanCheckExecutorPort | historyを受け取り評価結果を返す。外部実装の更新可能性は否定できない | 既定の決定的評価器とカスタムexecutorを区別し、同一入力の無意味反復だけ除去 |
| TDD CLI | `skill:execute-tdd-cycle` は公開。passedは入力値で実テスト実行ではない | CLIを削除せず、申告と実測を区別。通常git hookを維持 |
| pre hook設定 | `agentLessonCollection ?? true` | 新独立キーがない旧環境で有効値を保持 |
| post hook設定 | `cascadeUpdate ?? true` | false/true/不在の既定trueを保持 |
| skipログ | 正常HOOK_DISABLEDも追記。記録失敗はbest-effort | 新規の正常反復記録だけ削減。既存ファイルを削除せず異常記録を維持 |
| 配布skill/template | package filesに含む | 旧配置物＋新runtime、更新後配置物＋復旧runtimeの組合せを検証 |
| 外部共通hook | pluginとは別に直接起動するadapterあり | Phasegate自身の設定と混同しない。ユーザーによるPJ除外で文書保存復旧を確認済み |

## 変更前の比較テスト

ローカルVitestで次の5ファイル、63件が成功（exit 0）。これは旧挙動の基準であり、移行・配布・性能・実agent比較の合格ではない。

- `integration/skill-quality/run-plan-checker-loop-usecase.test.ts`: 4件
- `integration/skill-quality/execute-tdd-cycle-usecase.test.ts`: 6件
- `integration/agent-integration/harness-config-config-query-adapter.test.ts`: 20件
- `integration/agent-integration/handle-post-tool-use-usecase.test.ts`: 7件
- `unit/agent-integration/hook-to-cli-translator.test.ts`: 26件

実行入口: `./node_modules/.bin/vitest run --config scripts/harness/__tests__/vitest.config.ts` に上記のrepo内完全相対パスを渡す。

## 未完の固定項目

### 公開版とGit tagの区別（追加確認）

2026-09-19、`npm pack phasegate@0.339.0 --ignore-scripts`はETARGETで失敗した。`npm view phasegate versions --json`でも0.339.0は含まれず、取得できた公開版一覧の末尾は0.315.0／0.335.0／0.340.0だった。Git tag v0.339.0の存在はnpm公開の証拠ではない。0.339.0を公開旧版として比較する前提を撤回し、追加配布比較の候補を直前の実公開版0.335.0とする。

これは最古サポート版の保守方針を確定するものではない。tagから手元でpackしたものを「既存利用者が受け取った公開物」と偽って代用しない。

実公開0.335.0のarchive: 1086920 bytes、SHA-256 `1791745f2dd970ac06a583c1b748da01a707bd7c256e4a619e2f7241065bd9d8`。B2j候補は1111493 bytes、SHA-256 `a9926d8ccb57e55563aa949e1f8b24f055d205d727209651b048f21af4f22c71`。両archiveは一時保存先 `/tmp/phasegate-wi220-b2j.pjrcv7/` にある。

この組で既存package-upgrade-compatibility suiteの2ケースが成功（25.39秒）。runtime更新／再配置／旧版復旧、および管理workflowの編集競合／同状態再実行／明示更新のbackup／後続編集保全を確認した。0.335.0の全設定・全hook判定・全OS互換の証明ではない。

追加のpre hook比較では0.335.0の設定直接Writeがallow、公開0.340.0とB4d候補が保護理由付きblockになった。0.335.0→公開0.340.0も同じ差で1件失敗（27.82秒）、0.335.0→候補も1件失敗（25.97秒）。差分はWI-220で新設したものではないが、0.335.0との「全allow不変」を証明したとは扱わない。最初の試行は旧版も拒否するというfixture期待の誤りで停止したため、旧版の実判断を観測して候補と比較する形に直した。

B4d候補archiveは `/tmp/phasegate-wi220-b4d.rNZNt4/phasegate-0.340.0.tgz`、1111998 bytes、SHA-256 `8f7933651ed23406a9755f14adbad5b167d2b24b2e70febcb22cbd53bea6c8e7`。この版にはタグ完全一致・重複対象除去・JS/TSコメント追記を含む。

B2k/B1b候補: `/tmp/phasegate-wi220-b2k-b1b.a3zbrM/phasegate-0.340.0.tgz`、1112578 bytes、SHA-256 `3ef8dda05d636422cb89d629714a18fcef9877b0937e9c198a82bdb4427167d8`。設定復旧時の原文保全とStopの死蔵依存削減を含む。過去候補の検証結果をそのまま引き継がず再検証する。

- 最古サポート版・設定形式の境界版、tarballとhash、インストール済みfixture。
- 各runtime／OSの試験可能性、agent A/B比較の実行方法。
- 全allow/block期待値、設定状態別復旧fixture、性能ノイズ床。

これらは実装と並行して埋める。未確定を理由に公開境界を削除したり、リリースを許可したりしない。

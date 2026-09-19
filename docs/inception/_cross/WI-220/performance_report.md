# WI-220 性能比較

<!-- @work-item-id WI-220 -->

## B5a 最終runtime候補の本測定（2026-09-19）

候補SHA-256 `39b7bcc5f788fef782e386d50327beec88188a41a0f3a783932af6c73146417c`、2,101,996 bytes。旧0.340.0・Node24/macOS・計測器・cache定義・交互順序はB2oと同じ。各条件30回×2run、全720標本は [B5a CSV](performance_samples_b5a.csv)、元JSONは `/tmp/phasegate-wi220-b5a.kCIAUM/perf-run1.json` / `perf-run2.json`。機能assertは両run成功（194.01/196.88秒）。

| 条件 | run1中央値/p95 ms | run2中央値/p95 ms | 旧比中央値 run1/run2 | 旧比p95 run1/run2 |
|---|---:|---:|---:|---:|
| warm Read | 421.1 / 495.7 | 427.6 / 504.1 | -54.22% / -53.67% | -51.58% / -48.79% |
| warm OFF | 421.8 / 499.3 | 411.0 / 494.5 | +1.07% / +1.17% | -9.73% / -7.81% |
| warm Write | 808.5 / 896.2 | 862.8 / 1108.3 | -11.25% / -10.16% | -9.88% / +0.06% |
| cold Read | 151.5 / 173.3 | 145.9 / 167.9 | -76.93% / -77.46% | -74.54% / -75.31% |
| cold OFF | 152.6 / 158.0 | 139.9 / 154.3 | +1.72% / +2.10% | +2.24% / +2.97% |
| cold Write | 542.9 / 585.9 | 548.3 / 578.9 | -16.37% / -15.30% | -11.49% / -13.95% |

全条件・両runで中央値+10%／p95+20%以内。Read/OFFはlint要求・ログ0、Write120件すべて診断到達・timeout0。旧Write120件はtimeoutであり、同じ検証完了品質とはしない。CPU/RSS/Node起動・spawnをCSVに保持。通常全体suite終了後に開始したが、追加テスト・agent比較は併走しており専有CPUの比較ではない。

**B5aも当環境のT21相対基準を満たす。** 上位H11-03の絶対500msは未達。未計測OSや全体AC・agent品質の合格へ拡張しない。

## B2o 配布生成方式の本測定（2026-09-19）

`pack:runtime` で生成した候補SHA-256 `05b793d21117cdf169baa18cfffec348c5cb638cd1c190d61bd44ae2ab55dd9a`、2,100,973 bytes。旧版hash・Node24/macOS・cache定義・交互順序・計測器は従来と同じ。各条件30回×2run、計720標本を [B2o CSV](performance_samples_b2o.csv) に保存。元JSONは `/tmp/phasegate-wi220-b2o.3CiBTi/perf-run1.json` / `perf-run2.json`。測定器exit 0（191.58秒／189.15秒）。

| 条件 | run1中央値/p95 ms | run2中央値/p95 ms | 旧比中央値 run1/run2 | 旧比p95 run1/run2 |
|---|---:|---:|---:|---:|
| warm Read | 421.7 / 519.2 | 403.8 / 476.9 | -54.67% / -55.80% | -48.21% / -50.75% |
| warm OFF | 404.6 / 478.2 | 383.5 / 468.4 | +2.71% / +0.86% | -1.79% / +10.53% |
| warm Write | 793.8 / 883.3 | 795.1 / 909.1 | -7.83% / -10.35% | -10.04% / -5.71% |
| cold Read | 152.7 / 177.5 | 153.4 / 163.9 | -76.56% / -76.52% | -73.70% / -75.33% |
| cold OFF | 157.1 / 177.2 | 150.1 / 162.3 | +4.97% / +2.93% | +10.94% / +0.68% |
| cold Write | 572.4 / 613.2 | 548.0 / 577.1 | -12.17% / -15.46% | -8.65% / -13.56% |

全条件・両runでT21の中央値+10%／p95+20%以内。候補Read/OFFのlint・ログは0、Write120試行は診断到達・timeout 0。旧Write120試行はtimeout。CPU/RSS/子起動数をCSVで併記する。配布試験・agent試験との併走負荷があり、時間差の完全な因果分離や未実測OSへの一般化はしない。

**当環境・本archiveではT21の比較基準を満たす。** ただし上位H11-03の500ms絶対応答目標を満たしたとは主張しない。性能の比較基準合格と全AC完了／公開承認は別である。

## B2n compiled試作の本測定（2026-09-19）

候補SHA-256 `3084c2dd82258b256c87c5d6411f967a7adf43d345eb32cd978bae62634f26dc`。旧0.340.0は以下の既存hashと同一。各条件30回×2run（計720標本）、測定器exit 0。元JSONは `/tmp/phasegate-wi220-compiled-b2n.5F9r7e/perf-run1.json` と `perf-run2.json`、永続化した全標本は [B2n CSV](performance_samples_b2n.csv)。

| 条件 | run1中央値/p95 ms | run2中央値/p95 ms | 旧比中央値 run1/run2 |
|---|---:|---:|---:|
| warm Read | 333 / 344 | 343 / 360 | -60.04% / -59.39% |
| warm OFF | 336 / 355 | 343 / 361 | +1.55% / +1.60% |
| warm Write | 744 / 838 | 745 / 789 | -12.15% / -11.81% |
| cold Read | 150 / 159 | 149 / 174 | -77.01% / -77.07% |
| cold OFF | 148 / 158 | 152 / 172 | +1.43% / +3.14% |
| cold Write | 542 / 567 | 541 / 595 | -16.15% / -16.15% |

全条件・両runで中央値+10%／p95+20%以内。候補Read/OFFはlint・ログ0、Write120試行は検査到達・timeout 0、旧Write120試行はtimeout。CPU/RSSはCSVに保存し、旧孤児回収の計測外負荷を含まない点を維持する。別agent比較と同時実行したため専有CPU環境ではなく、因果の完全分離や他OSの性能保証ではない。

この試作archiveに限ってT21の遅延基準を満たした。通常配布にはまだ生成が接続されておらず、後続B2oのTypeScript生成archiveの結果を本数値で代替しない。過去の基準未達記録も保持する。

## 計測条件

- macOS / Node v24.13.0、同一Node・tsx・node_modules、一つのTSファイルを持つ同一fixture。
- 公開0.340.0 SHA-256 `a34db8b647f17264b612dd00814facd7503db09a1624c550e2b7b66582a501d6` とB4候補 `8f7cec4643c1bee6e8e0372f09933f6a7ce46ecde904fdb7b05746a475761404`。
- warm＝tsx変換cacheを事前起動で準備、cold＝TSX_DISABLE_CACHE=1。いずれも毎回新規process。OS page cacheを消去したcoldではない。
- Read／旧cascadeUpdate=falseでのWrite／通常Writeの3条件、新旧を交互に各30回。順序もペアごとに反転する。
- wall timeはprocess起動から終了まで。/usr/bin/time -lでuser/system CPUとRSSを取得。共通preloadでNode起動とspawnを記録するため、その計測負荷を含む。lintRequestsはhookが発行したlint起動要求、observedSpawnsはNodeのspawnで観測した子起動であり、OS全processの網羅数ではない。
- 旧timeout後の子孫回収は各試験専用process groupだけに行い、次試行へ残さない。回収は測定区間外であり、旧版の逃れた子孫CPUをtimeの集計が網羅するとは限らない。CPU値をそのまま完全な資源総量比較としない。
- 30標本の中央値/p95はnearest-rankの50/95パーセンタイル。粗いCPU時間のゼロ値や小差から有意差を主張しない。

## 実行方法

通常suiteでは実行しない。macOS上で未使用のreportパスを指定する。

```sh
PHASEGATE_PERF=1 \
PHASEGATE_OLD_TARBALL=<old.tgzの絶対パス> \
PHASEGATE_TARBALL=<candidate.tgzの絶対パス> \
PHASEGATE_PERF_REPORT=<未使用のreport.json絶対パス> \
./node_modules/.bin/vitest run --config scripts/harness/__tests__/vitest.config.ts \
scripts/harness/__tests__/e2e/post-hook-performance.e2e.test.ts
```

PHASEGATE_PERF_ROUNDS=1は計測器smoke専用であり、性能合格に使わない。候補版のread/OFFでlint起動0・skipログ増分0、通常編集で診断到達をassertする。速度の公開判定はtest_plan.mdの閾値に照らして別に行う。

## 判定上の注意

旧版がtimeoutして候補版だけ検証完了する条件では、検証品質と待ち時間を併記する。旧版の未完了を正常な高速実行とは扱わず、候補版の待ち時間増を隠して高速化したとも主張しない。T21の閾値を測定結果に合わせて緩めない。T24の実agent課題評価はこのhook単体計測では代替できない。
## Run 1（各条件30回、計360測定）

実行215.90秒、測定器の機能assert成功。raw数値は [performance_samples_run1.csv](performance_samples_run1.csv)。診断到達／timeoutはCSVのoutcome列。未丸め値を保存し、下表のみ丸める。

| 条件 | wall中央値 ms | p95 ms | CPU中央値 s | RSS中央値 MiB | lint要求合計 | ログ増分 bytes | timeout回数 |
|---|---:|---:|---:|---:|---:|---:|---:|
| warm/read/old | 656.6 | 668.3 | 0.20 | 109.7 | 30 | 3420 | 30 |
| warm/read/candidate | 151.7 | 162.5 | 0.20 | 109.1 | 0 | 0 | 0 |
| warm/disabled/old | 152.5 | 164.8 | 0.20 | 109.7 | 0 | 3330 | 0 |
| warm/disabled/candidate | 152.6 | 166.1 | 0.20 | 109.2 | 0 | 0 | 0 |
| warm/write/old | 655.9 | 662.3 | 0.20 | 110.4 | 30 | 3420 | 30 |
| warm/write/candidate | 1619.9 | 1722.4 | 2.22 | 434.2 | 30 | 0 | 0 |
| cold/read/old | 649.3 | 654.4 | 0.17 | 95.1 | 30 | 3420 | 30 |
| cold/read/candidate | 147.9 | 154.6 | 0.17 | 94.4 | 0 | 0 | 0 |
| cold/disabled/old | 146.2 | 150.2 | 0.17 | 94.9 | 0 | 3330 | 0 |
| cold/disabled/candidate | 149.4 | 154.8 | 0.17 | 94.5 | 0 | 0 | 0 |
| cold/write/old | 646.8 | 653.0 | 0.17 | 95.1 | 30 | 3420 | 30 |
| cold/write/candidate | 1893.9 | 1961.5 | 2.83 | 456.8 | 30 | 0 | 0 |

readはlint要求とtimeout・ログが0になり、OFFは起動0を維持してログだけを削減した。writeは旧版が全件timeoutで候補版が全件診断到達する一方、候補の中央値・p95が計画閾値を超えて増加した。機能assert成功をT21性能合格としない。独立した再測定と待ち時間対策が必要。
## Run 2（別fixtureで各条件30回、計360測定）

実行214.84秒、機能assert成功。rawは [performance_samples_run2.csv](performance_samples_run2.csv)。版・依存・条件はRun 1と同じ。

| 条件 | wall中央値 ms | p95 ms | CPU中央値 s | RSS中央値 MiB | lint要求合計 | ログ増分 bytes | timeout回数 |
|---|---:|---:|---:|---:|---:|---:|---:|
| warm/read/old | 659.1 | 668.1 | 0.20 | 110.5 | 30 | 3420 | 30 |
| warm/read/candidate | 154.7 | 170.3 | 0.20 | 110.1 | 0 | 0 | 0 |
| warm/disabled/old | 154.6 | 161.4 | 0.20 | 112.0 | 0 | 3330 | 0 |
| warm/disabled/candidate | 154.1 | 158.7 | 0.20 | 109.9 | 0 | 0 | 0 |
| warm/write/old | 653.4 | 667.8 | 0.20 | 113.8 | 30 | 3420 | 30 |
| warm/write/candidate | 1613.1 | 1625.9 | 2.22 | 434.7 | 30 | 0 | 0 |
| cold/read/old | 647.0 | 665.7 | 0.17 | 95.1 | 30 | 3420 | 30 |
| cold/read/candidate | 148.2 | 152.0 | 0.17 | 94.5 | 0 | 0 | 0 |
| cold/disabled/old | 146.9 | 149.8 | 0.17 | 94.9 | 0 | 3330 | 0 |
| cold/disabled/candidate | 147.6 | 154.7 | 0.17 | 94.5 | 0 | 0 | 0 |
| cold/write/old | 646.7 | 654.3 | 0.17 | 95.1 | 30 | 3420 | 30 |
| cold/write/candidate | 1872.8 | 1901.4 | 2.81 | 456.8 | 30 | 0 | 0 |

## 現時点の判定

2runともwrite条件で中央値+10%／p95+20%の公開停止基準を超えた。**T21は未合格、候補版の公開は不可**。旧版全件timeoutに対する候補版全件診断到達は品質改善だが、待ち時間増の免除理由として閾値を変更しない。次はCLI起動時の不要module読込みなどを測定し、検証範囲を維持したまま遅延を削減して再評価する。

read/OFFでは2runとも候補のlint要求・skipログ増分は0。小規模fixtureでの結果であり、大規模graph・他OS・実agentの性能維持は未証明。
## B2h遅延読込の予備測定（各条件3回）

候補SHA-256 `9fb4ee4949f0292e72b801a7642595bd2cee3fc5adbc3f36aacce0f835cb4139`。同じ計測器、36測定、24.11秒、機能assert成功。rawは [performance_samples_b2h_probe.csv](performance_samples_b2h_probe.csv)。

通常編集の候補中央値warm 1473.9ms／cold 1558.3ms、p95 1495.2ms／1569.4ms。前候補の本測定より小さいが、標本数が異なり30回×2runの性能合格証拠ではない。旧版は今回も全件timeoutで約646–656ms。公開停止の判断は維持する。

## B2i構文読込削減の予備測定（各条件3回）

候補SHA-256 `1c8ce2d2e079308cca3b610069ddb3d8a373ff34e7ec7838006870fa2385d3e2`（1111478 bytes）。同じ計測器、36測定、22.81秒、機能assert成功。rawは [performance_samples_b2i_probe.csv](performance_samples_b2i_probe.csv)。

通常編集の候補中央値warm 1244.3ms／cold 1360.8ms、p95 1325.5ms／1401.3ms。旧版中央値675.0ms／645.4ms、p95 680.9ms／647.5msで全件timeout、候補は全件診断到達。read/OFFは候補lint要求0・正常skipログ増分0を維持した。

B2h予備測定より待ち時間は短くなったが、少数測定でありT21合格証拠ではない。公開停止判断を維持し、検証範囲を削らず起動経路を引き続き調べる。

## B2j起動依存分離の予備測定（各条件3回）

候補SHA-256 `a9926d8ccb57e55563aa949e1f8b24f055d205d727209651b048f21af4f22c71`（1111493 bytes）。36測定、21.85秒、機能assert成功。rawは [performance_samples_b2j_probe.csv](performance_samples_b2j_probe.csv)。

通常編集の候補中央値warm 1159.3ms／cold 1188.9ms、p95 1244.5ms／1190.8ms。旧版中央値680.5ms／643.5ms、p95 681.5ms／645.9msで全件timeout、候補は全件診断到達。read/OFFは候補lint要求0・正常skipログ増分0を維持。改善傾向はあるがT21未合格・公開停止は変えない。

## T20a後の起動方式調査（採用変更なし）

同じcheckout・Nodeで `main.ts --help` を各5回交互起動し、既存の `node <tsx/cli>` と `node --import <tsx>` を比較した。前者772/842/858/786/789ms（中央値789ms）、後者758/779/730/722/726ms（中央値730ms）。全件exit 0、stdoutは同じ8,682文字。ソース・設定は変更していない。

これはCLI起動だけの小標本であり、同一内容の診断完了やhook全体のT21を測ったものではない。中央値差59msを全体遅延の解決と扱わない。packageのNode契約は>=18.0.0で、現在のtsx CLI実装はruntimeに応じて--import／--loaderを選択する。この互換分岐・preflightを独自に再実装する変更は本調査では採用しなかった。検査省略や閾値緩和も行っていない。

## B2l スキーマ必要時compile後の予備測定

候補SHA-256 `4f4bf85f1b7636356d066eee5e8d8d3e81c37228c75359c81e387c6ddd19326a`（1116165 bytes）。各条件3回、計36測定、25.30秒。rawは [performance_samples_b2l_probe.csv](performance_samples_b2l_probe.csv)、詳細JSONは一時保存先 `/tmp/phasegate-wi220-b2l.IFFZyg/perf-probe.json`。

通常編集は候補中央値warm 1425.5ms／cold 1153.1ms、p95 1436.4ms／1206.6ms。旧版中央値784.4ms／647.8msで全件timeout、候補は全件診断到達。read/OFFは候補lint要求0・正常skipログ0を維持。機能assertは成功したがT21未合格。

今回warmは旧版Read/OFFでも約280ms以上で、coldの約140–150msより遅く、前回と環境・cacheノイズを含めて単純に差分帰属できない。両schemaの不要compile削減はI/O試験で証明したが、これだけで全体性能改善を証明したとはしない。独立30回×2runの合格や閾値変更は宣言しない。

## B2l後の残存起動依存の確認（変更なし）

mainに残るharness-apiとbiome-ast-engineのstatic composition importを確認した。対象hookが呼ぶ`phasegate:lint`自体がharness-apiを使い、そのlint adapterはbiome-ast-engineの実解析を使う。この2つをmainで単にdynamic importへ移すだけでは、今回のWrite計測で不要依存を除いたことにならない。helpの改善とWriteの改善を混同せず、この理由だけの追加変更は行わなかった。

周辺のValidatorSystemExecutionAdapterとNyquistValidationImpactAnalysisAdapterは、他Unitの重いcompositionを既に実行メソッド内でimportしている。setup/skill-deployerの直接importはNode標準I/Oのみであり、ここを遅延化すればTypeScript解析器の読み込み全体を省ける、という根拠もない。

これは静的依存確認であって、全起動コストの最適化完了や改善不能の証明ではない。次の性能変更には、実Write経路で残る費用の計測と、診断・timeout回収・対応Nodeの互換試験が必要。検査を省く、短いtimeoutで診断前に終了する、性能基準を緩める変更を合格策にしない。

## 配布済みJavaScript経路の有無と変更境界

現行package.jsonにはbuild/prepack/prepublish処理がなく、filesはruntime TypeScriptとJSONを配布する。tsconfigはnoEmit=true、bin/phasegateはtsx経由でmain.tsを起動する。したがって「既存のコンパイル済み入口へ切り替える」だけで使える配布物はない。

事前コンパイルを検討する場合は、新しい配布成果物と生成・検証経路が必要になる。単なる不要import削除とは別の設計判断として扱う。特に、schema/presetのimport.meta.url相対参照、mainのパッケージルート解決、executorのmain.ts参照、公開runtime TS呼出互換、Node>=18契約、install/update/rollbackでの資産保全を同時に維持しなければならない。現在のNode一環境でhelpが速くなるだけでは採用できない。

この調査ではpackage.json・bin・配布形式・対応Node・検査内容を変更していない。性能要件を守るための次候補としては検討可能だが、成果物増加とのトレードオフと配布境界変更を保守者に示してから設計を確定する。新経路が既に実装済み、あるいはT21を解消すると確定したとは扱わない。

## D08承認後の事前コンパイル予備試験

opt-in `compiled-runtime-probe.e2e.test.ts` で1170 runtime TSを隔離rootへ非bundle ESMとして生成した。JSON資産とpackage metadataを同位置へコピーし、依存はcheckoutへのsymlinkを使う。公開bin/配布方式はまだ変更していない。helpと実lintのstdout/stderr/exitが既存tsxと一致することを全試行でassertし、warm各5回を交互計測した。生値は [performance_samples_compiled_probe.csv](performance_samples_compiled_probe.csv)。

最初の試行ではmacOSのtmpdir別名とimport.meta.urlの実体パス差によりmainのentry判定が一致せず、exit 0・無出力を検出した。公開binと同様にfixtureパスをrealpathへ揃えた後に出力一致を確認した。無出力を高速成功として計上していない。

| 予備条件 | help中央値 tsx/compiled ms | lint中央値 tsx/compiled ms | 入力hash |
|---|---:|---:|---|
| 初回、project local node_modulesなし | 878.1 / 286.4 | 1444.7 / 844.7 | bc765ee2ef2bc6532f59b7b2c08823d6ab3e8754100e5eea47ca3c7fc9785694 |
| B2m、projectにも依存symlink配置 | 890.4 / 295.3 | 979.0 / 412.6 | 6c6687534e2717998b046a8b827a2ae592f6e0dcfb8fc602708ad8be152f89bd |

Node v24.13.0/macOS。後者はBiomeのローカルbin起動とfixture依存配置も変わるため、初回との差を事前コンパイルだけへ帰属しない。同じ行のtsx/compiledは同じfixture/実装で出力が一致した。lintが短縮する見込みは確認できたが、hook全体・実配布・Node 18・T21の30回×2runは未検証。公開停止は維持する。

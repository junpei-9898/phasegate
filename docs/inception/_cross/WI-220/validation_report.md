# 検証・進捗報告

## 今回の実施終了時点

<!-- @work-item-id WI-220 -->

予定した実agent全8課題（本比較36試行、予備/中止は別）の実行とレビューまで終了。更新4件成功、中断復旧は旧0/2に対しB5a2/2、別cloneの後続利用者編集保全4件も成功。原回答・失敗・訂正・選択証跡をWI配下へ保存した。通常回帰・配布・性能・設定比較の結果は以下を参照。実装用Full Mode sessionは正規CLIで終了済み。commit/push/publish・実利用者設定変更は行っていない。

**実行終了とWI完了は別**。絶対500ms/fast-path要求、T20意味分類、T24読取候補1誤認の3点は未達として残る。受け入れ範囲変更は承認されておらず、現在の条件ではWI未完了・公開不可。詳細は [最終監査](acceptance_audit.md) と [D09](decision_log.md)。検証を合格まで繰り返したり、基準を下げたりしていない。

## 最新の全体回帰（2026-09-19、B5a）

<!-- @work-item-id WI-220 -->

集計と選択した試験名・結果・元JSON hashは [validation_evidence.json](validation_evidence.json) に保存した。全ログの代替ではなく、別実行には重複があるため件数を合算しない。

最終archive照合では元ファイル1,342件を現在checkoutと比較し、不在0、差分はpackage.jsonのpack専用files追加だけだった（JS/mapとtests除外）。他1,341件はbyte一致。runtime TS 1,171件も同じTypeScript設定でメモリ上に再変換し、配布JSと全件一致。比較用展開先は `/tmp/phasegate-wi220-final-source-audit.Cz43XV`。archive hashもB5aと一致した。

通常suiteは723ファイル中718成功・5skip、5,595件成功・失敗0・23skip（577.08秒、exit0）。追加TDD4件とPost復旧2件を含む。`/tmp/phasegate-wi220-b5a.kCIAUM/full-regression-final.json` に保存。forksは別実行3ファイル20件成功（974ms）。型検査exit0、lintは1,910ファイル・違反0、変更product29文書のmetadata成功、readiness全成功、integrityはok=true/drifts=[]。

収集開始後に追加したroot/local設定のopt-in4件はこの全体集計に含まない。旧0.340.0/0.335.0それぞれとの別実行で各4件成功した。通常skipのrelease/upgrade/performanceも同一B5a archiveで別途検証済み。歴史的compiled probeは通常skipのまま。下記の古い件数・「実行中」は当時の経過記録であり、この結果で更新する。これは実agent比較や未達の上位要求を含むWI全体完了の判定ではない。

### 再検証の入口

通常/forksはそれぞれ `./node_modules/.bin/vitest run --config scripts/harness/__tests__/vitest.config.ts` と同じコマンドの `vitest.config.forks.ts` 指定。型は `./node_modules/.bin/tsc --noEmit`。配布物は未使用の一時directoryを指定して `npm run --silent pack:runtime -- --pack-destination <directory>` で生成し、hashを固定してから次を実行する。既存archiveを上書きしない。

```sh
PHASEGATE_RELEASE_SMOKE=1 PHASEGATE_TARBALL=<候補tgz絶対パス> \
  ./node_modules/.bin/vitest run --config scripts/harness/__tests__/vitest.config.ts \
  scripts/harness/__tests__/e2e/release-smoke.e2e.test.ts

PHASEGATE_UPGRADE_SMOKE=1 PHASEGATE_OLD_TARBALL=<旧tgz絶対パス> PHASEGATE_TARBALL=<候補tgz絶対パス> \
  ./node_modules/.bin/vitest run --config scripts/harness/__tests__/vitest.config.ts \
  scripts/harness/__tests__/e2e/package-upgrade-compatibility.e2e.test.ts \
  scripts/harness/__tests__/e2e/package-hook-settings.e2e.test.ts
```

山括弧は置換用であり、そのままshellへ貼らない。旧版2種類は別実行する。hook-settingsはPOSIX限定で共有依存を使う補助比較、release/upgradeは実npm installの配布検証であり同じ証明ではない。性能の2run手順はperformance_report.md。これらの検証は公開や実利用者設定の変更を伴わない。

## B5a 中断後の台帳復旧（2026-09-19）

<!-- @work-item-id WI-220 -->

- 設定更新のbackup/temp/renameの直前/直後で実CLI子processを強制終了し、6状態とも有効設定、原文backup、後続ユーザー追記の保持と正規再開を確認（6件成功、22.50秒）。試験preloadは一時rootへ限定し製品にfault設定を追加していない。初回はmacOSのrealpath差により注入できず試験失敗、fixture rootを正規化して注入exit86を厳密assertした。
- reconcileの本文書込直後中断→再実行で古いmanifest hashが残る問題を実filesystemで再現。修正前は最初のwrite後ケースがhash不一致で失敗した。canonical template全文一致、またはpackage管理version差だけを旧hashから再構成できる場合に限る台帳同期を実装。利用者編集のno-opは再承認しない。
- 最小template fixtureの6書込境界×前後12状態で再開、hash整合、後続更新を確認。previewの台帳不変、利用者のdocs/package追記を再承認しないこと、次の不明な競合拒否維持を別試験で確認。installation周辺20ファイル183件成功、型・lint・設計4文書metadata成功。
- B2o変更後の通常全体suiteは716ファイル成功＋5skip、5,581件成功・失敗0・23skip（515.52秒、exit0）。この結果は後から追加した中断2ファイル8件とB5a runtime修正を含まない。最新配布物と全体回帰で再確認する。
- 全ファイル構成・全OS・電源断を証明したとは扱わない。試験は明記した操作境界とfixtureに限定する。
- B5a runtime archive: `/tmp/phasegate-wi220-b5a.kCIAUM/phasegate-0.340.0.tgz`、2,101,996 bytes、SHA-256 `39b7bcc5f788fef782e386d50327beec88188a41a0f3a783932af6c73146417c`。Node24でrelease16＋旧0.340.0更新4＝20件成功（103.51秒）、旧0.335.0更新4件成功（97.83秒）。Node18.20.8のrelease16件成功（62.37秒）、Node22.23.2のrelease16件成功（63.09秒）。各JSONは同rootに保存。いずれもmacOSであり、他OSでの実行成功とは扱わない。
- 変更product文書27件のmetadata検査成功。Worldの2文書に変更前HEADから存在した注釈直後空行20件を除去し、本文・注釈・validatorは変更していない。
- B5a通常全体回帰: 723ファイル中718成功・5skip、5,589件成功・失敗0・23skip（583.40秒、exit0）。追加中断8件とB5a runtime修正を含む。skipはrelease16/upgrade4/performance1/歴史的compiled probe2。release/upgradeは同archiveの別実行で成功済み、B5a性能2runは測定開始。JSONは同rootの`full-regression.json`。
- 全体実行後、TDD CLIにWorld ON/OFF × configured有無の4ケースを追加。custom product rootだけの重複fragmentをconfigured/ONでL3-008拒否し、重複解消後は同じ設定でcommit再開。legacyやOFFでは新拒否なし。既存を含む2ファイル17件成功（12.55秒）。初回はpreset既定coverageのfixture不足で2件失敗し、統制用coverage reportを全4条件へ同一追加した。製品閾値/検査は変更していない。この追加4件は上記全体5,589に含めない。
- B5a性能30回×2run、計720標本で全相対基準成功。Read/OFFのlint/ログ0、Write120試行で診断到達・timeout0。絶対500msは未達。performance_report.mdとperformance_samples_b5a.csvへ保存。追加4ケース後のtsc、lint（1,909ファイル・違反0）、変更設計metadataも成功。
- Postの不正JSONとconfig-directory I/O例外からの再開2ケースを追加し、既存を含む7件成功（9.71秒）。初回のI/O復旧は実CLIの既存v2-schema warningにより無出力assertだけが失敗したため、正常exit・I/Oエラー解消・lint不要・利用者文書保全を検証し、既存warningは保持した。runtime変更はない。前記全体後の追加は計6件で、全体/forksを再実行中。
- productの旧coverage報告の「500ms保証完全カバー」を撤回。実測と上位fast-path要求との差を明記し、Post presentationの非実在mock handler例約170行を現行テスト参照へ統合。domainの相対性能未達という古い記述も現測定へ更新した。上位要求自体は緩和していない。
- 旧0.340.0/0.335.0それぞれとB5aのroot/local設定比較が各4件成功（12.00/11.10秒）。root OFF＋local ON、root ON＋local OFF、rootなし＋local OFF/ONで有効値・原文を保持。実hookのlint要求はONで1/OFFで0、候補OFFはログ0。初回の計測器は旧npx内部spawnも二重計数して2件失敗したため、hook親の要求だけを記録するようfixtureを修正。製品の設定解決は変更していない。通常全体開始後の追加opt-in4件であり全体集計とは分離する。

## B2o 隔離runtime pack（2026-09-19）

<!-- @work-item-id WI-220 -->

- `pack:runtime` を追加。直接dev dependencyのTypeScriptで一時packageにだけJS/mapを生成。TS/bin/assetsを保持し、通常source packも維持する。CI/canaryの配布検査はruntime packへ接続した。公開・実PJへのinstallは行っていない。
- 最小実pack試験2件は実装前red→実装後green。元ファイルbyte保持、直接Node起動、checkoutにJSなし、同名archive上書き拒否、構文エラー時に出力なしを確認。型検査exit 0。
- 実archive `/tmp/phasegate-wi220-b2o.3CiBTi/phasegate-0.340.0.tgz`、2,100,973 bytes、SHA-256 `05b793d21117cdf169baa18cfffec348c5cb638cd1c190d61bd44ae2ab55dd9a`。5MB以内。
- 同archiveでrelease-smoke16件＋0.340.0更新/rollback4件、計20件成功・失敗/skip 0（106.58秒、exit 0）。`package-regression.json` を同directoryへ保存。
- 同archiveの0.335.0更新/rollback4件も成功・失敗/skip 0（71.41秒、exit 0）。`upgrade-0335.json` に保存。直接設定Writeの既存保護導入差はD08どおり別扱い。
- lint exit 0。変更設計6文書のうちvalidator-system文書に変更前HEADにも存在する注釈直後の空行を1件検出した。本文や注釈を変えずその空行だけを除去し、metadata成功を確認した。検査を弱めていない。
- 同archiveの性能30回×2runも完了。全条件で中央値+10%／p95+20%以内、Read/OFF lint・ログ0、Write全120試行で診断到達。詳細はperformance_report.mdとB2o CSV。最新通常全体suiteは実行中、forksは3ファイル20件成功。

<!-- @work-item-id WI-220 -->

## 検証チェックポイントの履歴

### B3j固定archive・旧0.335.0復旧とコンパイル配布probe（2026-09-19）

- 固定候補 `/tmp/phasegate-wi220-b3j.DaSk40/phasegate-0.340.0.tgz`、1,124,062 bytes、SHA-256 `0e8f8606a5d82771814d4ae484041f9ef10205f7da9ff8dccf067b2d1198e40d`。B3j/T20b runtimeを含む。後続の文書整合修正や試験コード変更を含む最新版全体とは区別する。
- この候補への旧0.335.0 upgrade試験4件成功（72.25秒、exit 0）。D08で承認された旧config直接Write allow→protected block差だけを明示し、その他の許否一致、正規config:planでの復旧、利用者文書・設定保全、競合backup、rollbackを確認。JSONは同rootのupgrade-0335.json。
- 同候補の1,171 TSを隔離展開先だけでJSへ事前生成し、TS/bin/assetsのbytes保持をassertして試作tarballを作成（probe 1件成功）。開発checkout/通常pack/公開は変更していない。
- 試作archive `/tmp/phasegate-wi220-compiled-package.qsDzSo/phasegate-0.340.0.tgz`、SHA-256 `693d7a9d3092b13b7cf7f6c5a5372ab94427f84fc69d731ca404a2446836162e`。既存release-smokeの実npm install・install/doctor/validate/uninstall等16件成功（40.36秒、exit 0）。JSON/probe記録は同root。Node24/macOSでの範囲に限定し、他runtime/OS・hook性能・本採用の証明ではない。
- readinessは全story passed、integrity:verifyはok=true/drifts=[]。
- 通常全体回帰: 719ファイル中715成功・4skip、5,577件成功・失敗0・22skip（500.59秒、exit 0）。forksは別実行3ファイル・20件成功（exit 0）。JSONは同候補rootのfull-regression.json/forks-regression.json。skipはrelease16・upgrade4・performance1・旧compiled-runtime-probe1。全体実行開始後に追加したcompiled-package-probeはこの総数に含まず、単独実行1件成功として分離する。

### T20b: classの宣言と本文の助言比較（2026-09-19）

- 型が明示されたclass method/property/constructorを本文なしの宣言として観測。adapter内部抽出はbehavior-review、method型・property型・constructor型・継承変更はmodule-surface-changeとなる。推論型・decorator・default引数・accessorなど未対応構文はunknownを維持。
- テスト更新後、修正前は8件失敗、修正後はquick-mode全37ファイル・435件成功（13.95秒）。型チェック成功。助言の追加前後で既存CLIの分類・終了コードが変わらない比較も成功。
- classがexportされていることは外部公開APIの証明ではない。意味同値性・未接続adapter追加の安全性・上位判断は引き続きレビュー対象であり、機械による完全な意味分類としてT20を完了扱いしない。

### B3j: 明示強制化と標準ゲート復旧（2026-09-19）

- v3の任意 `agentIntegration.preToolUse.dependencyReflection: advisory | enforce` を追加。不在・旧Portは既存session許可を維持、OFFを優先。設定自動書換なし。
- enforceで対象と宣言依存の未反映・必要成果物不足を拒否。依存unknownは旧Unit範囲で検査して不明理由を残す。fixは所属Unitごとの設定済みproduct候補への反映を検査する。意味的承認を証明しない。
- 標準ゲート（relaxedGates空）の実CLIで、既存product未反映／product自体不足の2経路とも拒否→inception修正→product反映→同じ実装操作の再開を確認。無関係WI-9は拒否理由に含めない。
- この試験で既存のWI設計編集への下流Level 3 gate循環を検出。WI inception Markdown設計文書だけを実装gate対象から除外。旧分類値、共有計画/descriptionの既存gate、product、保護ファイル、source重複、混在sourceの検査は維持する。
- TDD: adapter追加4ケースが修正前失敗、schema追加は修正前3ケース失敗。実CLI復旧も旧実装で失敗後に成功。周辺97ファイル・1,103件成功（93.16秒、失敗/skip 0）。追加後のsession診断40件も成功。型チェック・lint（1,905ファイル、違反0）成功。
- T14/T15の強制化・標準復旧の代表経路は実装済み。配布物での旧新比較、全体回帰、複数環境などはまだ別途必要。全WI完了とはしない。

以下は実施時点の記録であり、「残る」は後続検証で解消している場合がある。現在の判定・残件は [受け入れ条件監査](acceptance_audit.md) を正とする。履歴中の部分成功を完了／リリース可能の判定に使わない。

### B3i: 強制化前の成果物種別検査（2026-09-19）

- 必要inception成果物と同名のディレクトリがあると存在検査を通過する問題を、refactor 1件・story 3件・issue 3件で再現（修正前7件失敗）。session専用検査をstatの通常ファイル判定へ変更。共有fileExistsと旧checkReflectionは変更していない。
- 各ケースで通常ファイルへ直した後、同じadapterの再評価で警告が解消することを確認。通常ファイルへのsymlinkを維持する試験も追加。意味的内容・承認の検査ではない。
- 回帰: phase-dependency-model Unit/Integration、旧agent reflection adapter、session advisory、Full Mode session usecaseの48ファイル・461件成功、失敗/skip 0（Vitest 11.51秒）。修正前は追加7ケースだけ失敗、修正後のadvisory単体は27件成功。
- `tsc --noEmit` 成功。通常lintは1,905ファイル、違反0。既存sessionの許可を維持し、新規強制設定・利用者設定変更は追加していない。
- 明示強制化と標準ゲートでの拒否後復旧は引き続き未実装・未検証。この前提修正をT14/T15完了や最新配布物の全回帰成功と扱わない。

D08で0.335.0を含む互換検証と、既存session許可維持／明示選択の強制化を承認済み。公開・push・利用者設定の自動移行は未承認。同期translatorは公開exportのため保全し、呼出がないことだけを削除根拠にしない。

全 AC と T01–T25 の対応・不足証拠は [受け入れ条件監査](acceptance_audit.md) に整理した。

## B1 PlanChecker 実装結果

- factoryで構成したhandlerはplanFileの本文を読む。不在ファイルはexit 2を返す。
- 既定の決定的評価器は未達入力を1回で終了し、修正／判断を案内する。空の未チェック項目も未達として保持。
- 既存handler constructorとカスタムexecutorの最大3回・history契約を維持。意味的設計承認を主張しない。
- TDD: 新規回帰テストは修正前5件失敗、修正後成功。既存を含むskill-quality Unit/Integration全40ファイル・220件成功（Vitest exit 0）。
- 実行: `./node_modules/.bin/vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/integration/skill-quality scripts/harness/__tests__/unit/skill-quality`
- 本結果はT09の局所的証拠。配布済み環境更新を含む全互換性の完了証明ではない。

## B2a 読取りと正常skip

- Read/Glob/Grepの対象なしはlintを起動せずREAD_ONLYで終了する。Bash/exec_command/不明tool、対象あり入力は除外しない。
- HOOK_DISABLED/READ_ONLYでログを新規作成・追記しない。過去ログのbytesと異常イベントの追記を維持する。
- TDD: 修正前に6件失敗を確認し、修正後は新規10件＋既存設定／usecase／実hookプロセスを含む5ファイル42件成功（exit 0）。型検証 `tsc --noEmit` 成功。
- 実プロセスでReadの無出力exit 0、欠落fieldの診断保存、pre hookのfail-closedを確認。T12の部分証拠であり、shellの読取り分類や対象伝播・性能比較は残る。
- B1修正後も `tsc --noEmit` 成功。inception設計2文書のmetadata検証はvalid。

## B3a 復旧案内

- mixed patch先頭の_cross文書から無効なsession Unitを案内する不整合を修正。inception以外の実装先が単一Unitならそのbeginを案内し、複数・不明なら確認を求める。inception編集と実装を分ける手順を明記した。
- session認可入力は変更せず、案内のためのUnit解決を分離した。
- 追加3件は修正前失敗、修正後は既存pre hookと合わせ61件成功。`tsc --noEmit` 成功。
- 実Unit agent-integration / WI-220の正規CLI session beginが成功することを実作業で確認。これは全T07の完了証明ではない。
- session adapter11件とsession begin実CLI1件の追加回帰も成功。実装用sessionは正規endコマンドで終了済み。

## B2b 独立hook設定

- v3 schemaにpreToolUse.enabled / postToolUse.enabledを追加。明示booleanを優先し、不在時は旧設定・旧既定値を保持する。設定の自動書換なし。
- 旧値false/true/不在×新値false/true/不在/不正型×pre/postの24ケース、既存adapter20件、schema28件の計72件成功。修正前8件の失敗を確認してから実装した。
- `tsc --noEmit` 成功。旧schema混在の配布物E2Eは未実施。
- 実作業で発見した `session begin --unit _cross` 不整合はB3aで案内を修正した。

## B2c TDD追跡と証拠表示

- WI形式のstoryを既存CommitMessage.workItemIdへ渡し、Work-Item trailerを保存する。旧story IDのsubjectとtrailerなし契約を維持。
- 成功・検証拒否・例外の全handler出力でpassedは呼出元申告、コマンドはテストを実行しないと明示。exit 0/1/2と既存拒否条件は維持した。
- 新規試験で修正前4件失敗を確認。修正後、Git hook拒否ケースを追加し、skill-quality全41ファイル226件成功。`tsc --noEmit`、`git diff --check`も成功。
- 一時GitでWI／旧story履歴を確認。実pre-commit拒否ではHEADが作られず、原因が返り、ステージ済みファイルは残る。作業repositoryにはコミットしていない。
- T10の部分証拠。公開CLIの全経路は未検証。TDD factoryが解決済み設定を受け取らず、L1/L2 adapterがwarningも拒否扱いする不整合は残る。L2 adapterが担うL3検証を保持しつつ、共通設定とseverityを次段階で揃える。

## B2d 共通検証設定

- CLIは通常lint/validateと同じmapperの設定を任意factory options経由で渡す。引数なし呼出・設定不在の旧既定値を維持し、設定ファイルの読込方針・書換えは変更しない。
- L1は解析root／rule／architectureを受け取り、既存lintと同じ全診断拒否。L2 adapterはL2＋L3を維持し、共通severity policyでfailOnWarningを適用。非拒否warningもstderrに残す。
- adapter新規4ケースは修正前失敗、修正後成功。公開CLIを一時Gitで実行し、構造検証OFFでWI trailer付きコミット、ONで違反拒否・HEAD未作成を確認。ネットワーク取得は禁止しローカル依存を使用。
- skill-quality全試験＋full-validation＋既存CLI設定／不正設定回帰の44ファイル254件成功。`tsc --noEmit`、`git diff --check`、inception設計2文書のmetadata検証も成功。
- T10/T11の部分証拠であり、旧配布物との差分比較は残る。特に旧TDD経路が無視していたworld／custom rule等の設定反映で新規拒否が生じないか、リリース前に比較し解消する必要がある。failed＋診断なしの既存adapter欠落も未解決。これらを互換性確認済みとは扱わない。

## B2e 全体解析と対象報告

- 既存phasegate:lintのtarget flagがdispatchで無視されていた経路を修正し、任意reportTargetsとしてPortへ渡す。
- adapterは引き続き全体を解析し、結果の報告だけファイル／directoryに絞る。絶対・相対パス、類似prefixの兄弟、複数対象、位置なし診断、空配列を確認した。complete-check／ci-checkの全件呼出は変更していない。
- 新規回帰は修正前5件失敗、修正後成功。harness-api全Unit＋lint adapterの19ファイル173件成功。`tsc --noEmit`、`git diff --check`、inception設計2文書metadata valid。
- T13の部分証拠。実hookの対象抽出、複数対象のCLI構文、500ms timeoutと子プロセス回収、実グラフfixtureの偽陽性比較は残る。hookは現時点で対象なしの従来呼出のまま。

## 基準の証拠

- 基準・公開境界・変更前試験: [compatibility_inventory.md](compatibility_inventory.md)
- 判断と互換制約: [decision_log.md](decision_log.md)
- 計画5文書のmetadata検証: 全件valid、warningsなし（計画保存時）。
- 外部hook除外後、Phasegateのhookを残したまま計画文書の保存とmetadata検証が成功。

## B2f 子プロセス起動と回収

- npx経由をpackage自身から解決したtsx/cli＋現在Nodeの直接起動へ変更。canonical／旧wrapper／直接scriptの引数配列契約は保持。任意cwd注入とstdin EOFを追加し、signal終了を成功0に変換しない。
- POSIXは専用groupへTERM→250ms後KILLし、closeと回収処理の完了後にTimeoutErrorを返す。Windowsはtaskkill /T /Fを使用するが、Windows実機検証は未実施。
- 修正前4件失敗（stdin待ち、終了要求を無視する子孫の残存を含む）を確認。修正後、signal終了試験も含む関連4ファイル17件成功。`tsc --noEmit`、`git diff --check`、設計2文書metadata検証成功。
- 同一環境のmain.ts --help起動を各3回測定: 変更前1035/1037/1005ms、変更後797/814/807ms。起動のみの小標本で、T21の性能合格証拠ではない。500msではなお不足しており、その制限値と復旧案内は未修正。配布済みruntime／OS比較も残る。

## 未完了

### B2g post接続までの追加進捗

- 既存normalizerで直接編集／完全patchの対象を解釈し、payload cwd→project rootの経路を接続。shell／未知／不完全入力の全件fallbackとreadの早期終了を維持。
- 重複なし反復--targetをCLIまで伝播。内部文字列map境界のJSON配列は型検証し、複数対象を先頭だけにしない。--fastは送らず、起動実測に基づき上限を5秒へ変更した。
- postのlint診断を本文付きで表示しexit 0のfeedbackにする。timeoutは未検証・明示lint・自動再試行なしを案内。pre／commit／CIの拒否条件は変更していない。別配備のanalyze-errors-hook.shは別契約であり本段階では変更していない。
- 複数対象のdispatch追加5件は修正前失敗を確認。入力／復旧試験と実hookの旧ON/OFF＋subdir複数編集、対象外診断の除外が成功。関連27ファイル432件成功。型検証も成功。
- 作業中、main.ts＋Unit domainのmixed patchでsessionの対象Unitがmain.tsと誤認される既存不整合を確認。Unit単位の別patchで正規sessionのまま続行できた。根本のscope判定修正・回帰はB3の未完了項目に追加する。
- 5秒は全環境での最適値を証明していない。T21測定／実timeoutのhook全経路／配布済みhookとの比較は残る。

### B3b source直下ファイルのUnit誤認修正

- source root直下main.tsをUnit名と誤認しないようscope解決を修正。同一Unitとの混在編集でsessionが使え、別Unit混在は引き続き拒否する。期限・category・保護ファイル・path正規化は変更していない。
- 新規回帰は修正前5件失敗。直下ファイルを架空Unitとして使っていた既存baseline試験1件は、実Unit配下のfixtureへ変更してbaseline skipの検証を維持した。
- agent-integration全Unitとpre/session関連の24ファイル390件、`tsc --noEmit`、`git diff --check`成功。実session adapterで同一Unit許可／別Unit拒否を確認した。
- 調査でFull Mode session許可時にreflection前でreturnする既存経路も確認。これはB3bでは変更せず、対象WIの依存範囲と合わせてB3の安全性・互換性設計で扱う。無関係WIの分離と共有契約検出は未完了。

### 全体の残件

B0の旧配布物fixture・全判定基準、B1の残る内部整理、B2–B4の詳細設計反映・実装・回帰テスト、B5の配布／復旧／性能／agent比較が残る。AC-01〜AC-11、T01〜T25はいずれも現時点で全体合格とは判定しない。

## 全体検証の中間チェックポイント

- 2026-09-19 / Node v24.13.0 / macOSで、B3bまでの作業ツリーを変更せず全テストを実行した。
- `./node_modules/.bin/vitest run --config scripts/harness/__tests__/vitest.config.forks.ts`: 3ファイル20件成功。
- `./node_modules/.bin/vitest run --config scripts/harness/__tests__/vitest.config.ts`: 702ファイル5375件成功、release-smoke 1ファイル16件スキップ。418.07秒、exit 0。合計5395件成功。
- `./node_modules/.bin/tsx scripts/harness/main.ts lint --json`: 1885ファイル、違反0、exit 0。
- `integrity:verify --json`: ok=true、drifts=[]。`phasegate:check-ready --json`: allPassed=true、exit 0。
- これは現時点の回帰チェックポイントであり、WI全体完了ではない。配布物の実installを行うrelease-smokeは既定ではスキップされるためT22の合格証拠にしない。旧版比較・agent比較・未実装B3/B4も残る。

## 次の作業

### 配布検証の追加結果（2026-09-19）

- opt-inの既存release-smokeを別途実行し、16件すべて成功（28.31秒）。純Python／Go monorepo／docs-onlyへの実install、doctor、L2 validate、uninstallとHuskyフラグを確認した。通常suiteのスキップを成功として数えたものではない。
- `e2e/package-upgrade-compatibility.e2e.test.ts`を追加。docs-only一時プロジェクトで公開0.340.0導入→候補runtime更新→install再実行→公開runtime復旧のライフサイクル1件が成功（最終実行14.10秒）。候補版・旧版それぞれの実インストール済みmain.tsをtarball本文と照合し、同じversionによるnpmの取り違えを除外した。
- runtimeだけを変更した前後で、設定・配置ファイルのSHA-256とsymlink先が一致。install再実行後も設定と利用者文書の本文が保持された。各段階のdoctor／L2 validateはJSONを返し、終了コードが旧版基準と一致した。
- 再実行: `PHASEGATE_UPGRADE_SMOKE=1 PHASEGATE_OLD_TARBALL=<旧tgz絶対パス> PHASEGATE_TARBALL=<候補tgz絶対パス> ./node_modules/.bin/vitest run --config scripts/harness/__tests__/vitest.config.ts scripts/harness/__tests__/e2e/package-upgrade-compatibility.e2e.test.ts`。アーカイブhashはcompatibility_inventory.md参照。
- T01/T03/T22の部分証拠。利用者による管理ファイル編集競合、reconcile、中断復旧、全設定形式、pre/postの許可・拒否比較、対応OS／Node全範囲は未検証。診断の終了コード一致だけで検出内容の完全一致やエスカレーション互換を証明したとは扱わない。新規配布や実PJへのinstallはしていない。

### 配布物の編集競合試験

- 上記upgrade suiteに管理workflowの利用者編集を追加し、2件成功（25.05秒）。候補版reconcileのdry-runは全ファイル不変、applyと同一状態の再実行は対象をrefusedとしてexit 1・本文保持。
- 一時fixture内で明示force更新を選ぶとexit 0となり、backupに元の利用者本文が残る。更新後の利用者追記は旧runtimeへの復旧後にも残り、旧版reconcileも上書きを拒否した。本PJではforce更新を実施していない。
- 編集競合の保全証拠であり、プロセス中断の各地点・復元CLIの全経路・全管理対象形式の試験ではない。

### B4a タグ操作の事実性

- 既存タグ付き本文をupdatedCountへ数える不整合を修正し、同一入力再実行を0件とした。dry-runも変更予定の件数だけを返す。
- handlerはhumanでタグ追記のみ・意味レビュー未実施を表示し、JSONはoperationとsemanticReviewPerformed=falseを追加。公開引数とexit 0/1/2を維持し、新規ブロックを追加していない。
- 追加6ケースは正しいfixtureで修正前失敗を確認し、修正後skill-qualityの41ファイル238件成功。`tsc --noEmit`と`git diff --check`成功。
- T16の部分証拠。意味的な設計統合更新、revision追跡、上下伝播と承認・却下後の再開は未完了。CLIのタグ存在判定や重複globの既存境界も別途監査する。
- このruntime修正は先のB3b候補tarballには含まれない。配布比較は新しい候補archiveで再実行が必要。

### 継続する作業

### B4b cascade skillの双方向伝播

- 固定モデル・一律3段階承認・追記優先を廃し、既存依頼範囲の整合修正と上位判断が必要な変更を分離した。WI／ADR／Gitへ根拠・revision・停止範囲・決定・再開条件を残し、productを現行本文へ統合する手順に更新した。
- 公開skill名・配布先・lifecycle構造・languagesは維持。旧タグの履歴参照、保護設定、World Model OFF／baseline／waiverを維持する。参考ガイドの「環境が最多／上位変更はまれ」という判断バイアスを除いた。
- 実skillの構造検証は7セクションすべて合格。corpus／install／reconcileの3ファイル57件成功、設計2文書metadata valid、diff check成功。
- skill-creatorの汎用quick_validateはPhasegate独自のlanguagesを未対応として拒否した。必須metadataを削って通すことはせず、Phasegateの実validatorで確認した。汎用validator成功とは扱わない。
- integrityのdry-run差分は当該SKILL.mdのみ。ADR-030の正規integrity:pinで40entryを更新し、verifyはok=true・drifts=[]。他のpin値と対象集合は変更なし。

文書レビューで確認した判断経路（実agent実行の証拠ではない）:

| 入力 | skillが定める停止範囲と次行動 |
|---|---|
| 契約不変の内部抽出・重複説明 | 依頼範囲内なら追加承認なし。product本文を統合して関連テストへ反映 |
| 共有API変更 | 利用側と契約を確認。依存実装のみ保留し決定者へ判断依頼 |
| 認可前提の破綻 | 環境設定の不一致だけと決めつけず認可契約へ戻る |
| 承認 | 決定revisionを記録し、上位から下位へ反映・再検証して再開 |
| 却下 | その案を終了。旧契約内の再計画は可能、同じ承認要求を反復しない |
| 未承認の代替案 | 選択肢の提示を承認とみなさず、判断を求める |
| 判断後の前提変更 | 変わった前提と影響を再評価。古い承認を流用しない |
| World Model OFF | 導入・pin一括作成を要求せず既存WIと設計で追跡 |

T18/T19の手順改善であり、実agent比較T24やruntimeの対象WI依存閉包B3、World Model鮮度T17の証明ではない。今回skill-creatorは固定手順の削減と権限境界を分ける設計に用いた。

- B4a/B4b入り候補（SHA-256 `8f7cec4643c1bee6e8e0372f09933f6a7ce46ecde904fdb7b05746a475761404`）で配布試験を再実行。release-smoke 16件＋upgrade/競合/復旧2件の計18件成功、50.19秒、exit 0。前候補の結果の転記ではなく、環境変数PHASEGATE_TARBALLで新archiveを指定した実行。readinessもallPassed=true。

### 残る作業

### B4c World Modelの両端鮮度と解消後の再評価

- 既存world-mutation fixtureへ、fresh→両端変更→preview→片側pin更新→他方未解決→両側更新→解消→後続変更再検出のライフサイクルを追加。実ファイル・hash・宣言repository・public compositionとhandlerを使用した。新しいruntime分岐や必須設定は追加していない。
- 両端変更ではclaimant/premise別のWCR-008、片側更新後はpremiseだけが残る。両側更新後はexit 0・obligationsなし、同一pin再実行はunchanged・宣言byte不変。後続変更は新evaluationIdでpremiseのWCR-008に戻る。previewは宣言も再導出結果も不変。
- mutation／baseline・waiver policy／実policy repository／SessionStart World OFFの4ファイル22件成功。endpointRoleの厳密assert追加後もmutation全6件成功。型検証とdiff check成功。
- T17の鮮度・例外契約の追加証拠。pin更新は内容digestを採用する機械操作であり、承認者・レビュー内容を検証する仕組みではない。意味レビューはB4bのWI／ADR記録と別に扱う。公開CLI子プロセス・配布旧新版の同一fixture比較までは本ケースで実行していない。

### B3の判断境界の再確認

- 現行HandlePreToolUseUseCaseはsessionResult.allowedでreflection前にreturnする。StoryReflectionQueryPortはUnitのみを受け、checkerはUnit内WIを走査する。sessionに紐づく対象WI・共有依存閉包をそのまま渡せる契約はない。
- セッション許可後に無条件で強制reflectionを追加すると既存allow→blockになるため、本WIの非デグレ条件に反するおそれがある。対象WIの安全な特定と、既知欠陥是正に伴うブロックを今回許容するかの判断が必要。未回答の方針確認を承認扱いにせず、この強制変更は未実施。

### 次段階

### B5 / T21 post hookの性能比較

- opt-inの実配布比較を追加し、まず1回smoke、その後新旧×3条件×warm/cold×30回の360測定を独立に2run実行。各runの機能assert成功、実行215.90秒／214.84秒。型検証とdiff checkも成功した。
- 候補版はread/OFFでlint要求0・正常skipログ増分0を全件確認。writeは旧版が全件timeout、候補は全件診断到達。一方でwarm write中央値は旧約654–656ms→候補約1613–1620ms、coldも約647ms→1873–1894msとなった。
- 2runとも計画閾値を超えたため**T21は未合格、公開停止条件に該当**。検証完了率の改善を理由に遅延増を免除しない。CLIの不要な起動時処理を調べ、検証を削らず改善する必要がある。
- 条件、CPU/RSSの観測限界、720件のraw CSV、再現コマンドは [performance_report.md](performance_report.md) に保存した。coldはtsx cache無効でOS cache消去ではなく、実agent性能の証明でもない。

### 継続課題

### B2h CLI起動時の依存分離

- ci-governance／regression-suite／phase2-extensions／skill-quality／validator-system／world-modelのcomposition読込をmain.tsの利用分岐へ移した。既存factory・handler・config解決・exit経路を維持し、公開exportや検証は削除していない。
- 不要moduleを拒否するテスト用loaderで実CLIを起動。修正前はhelp/lintが起動失敗、修正後はhelp成功・実fixtureのrequire-layer-comment診断を確認。必要moduleを拒否した対照は失敗する。
- CLI各系統・TDDの8ファイル113件と最小／不正config・command集合の2ファイル6件成功。型検証成功、lintは1888ファイル違反0、設計metadata valid、diff check成功。
- 再packした候補で3回ずつの予備計測を実施。warm write中央値約1474ms／cold約1558msまで低下したが、T21合格ではない。詳細・rawはperformance_report.mdに保存。
- 次の調査候補: TypeScriptSourceModuleAnalyzerAdapterはASTの構文情報だけを抽出する一方、createProgramで標準libraryや依存moduleも読み込む。意味解析の結果を使用しているかを確認し、同一snapshotを保てる場合のみ不要処理を削減する。未実装。

### 残件

### B2i 構文解析の不要読込み削減と実corpus比較

- biome-ast-engineをaffectsへ追加し、inception/product設計反映後にcreateProgramへnoLib/noResolveを設定した。型checkerを使わない構文snapshot抽出のみを対象とし、workspace列挙・全graph・ルールは削減していない。
- 非対象library／依存の読込みを検出するテストは修正前失敗、修正後成功。周辺38ファイル319件成功。さらに実repositoryのworkspace列挙結果すべてを実compilerの旧新オプションで比較し、全snapshotフィールドとファイル集合の一致を確認。追加後の互換suiteは4件成功（2.77秒）。
- B2i候補を再packし36測定の予備比較を実施、機能assert成功。通常編集中央値warm 1244.3ms／cold 1360.8msまで短縮したが、T21未合格・公開停止を維持する。archive識別とrawはperformance_report.mdに記録した。
- このcorpus比較は構文抽出の同値性の証拠であり、全CLI／旧導入利用者／実agentの互換性を証明するものではない。全体回帰、配布比較、対象WI依存閉包、エスカレーションとagent比較は引き続き残る。
- 続いて同じB2i候補archiveでrelease-smoke 16件と旧0.340.0からの更新・編集競合・再配置・旧版復旧2件を再実行し、計18件成功（47.43秒）。検証対象fixtureでは利用者設定・文書を保全し、拒否後の明示的な解決と復旧を確認した。全OS／全設定形式の保証ではない。
- corpus追加後のtsc --noEmit、diff check、phasegate:check-ready（allPassed=true）成功。biome-ast-engineの作業sessionは正規CLIで終了した。配布公開・本PJのinstall・利用者設定移行は実施していない。

1. hook対象・設定・ログとTDD検証経路の詳細設計・実装へ進む。
2. 対象WIと双方向伝播の改善を進める。
3. 旧配布物・性能・agent比較の証拠を揃えて全要件監査を行う。

### B2j コマンド固有依存分離の拡張

- main.tsのinstallation／quick-mode／phase-dependency-model／traceability-model／adr-foundation／harness-error factoryを既存利用分岐で読むよう変更。Unit内部やfactory契約は変更せず、型参照・既存の局所import・引数・設定を維持した。
- loader拒否対象を拡張したテストは修正前help/lintの2件失敗、修正後3件成功。必要module失敗の対照assertを強化した際、実際の入口がworld-model/index.jsであることを確認して期待値を訂正した。訂正後の再検証は全体suiteへ含めて開始しており、完了結果は追記予定。
- 型検証と設計3文書metadata、diff check成功。再packした候補の36予備測定は機能assert成功。通常編集中央値warm 1159.3ms／cold 1188.9ms。T21合格とは扱わない。
- 最新変更を含む通常全体suiteを開始。過去の全体成功や今回の狭いテストを現在の全体合格に代用せず、完了出力を確認して追記する。forks suiteと最新候補の配布更新試験は別途実行が必要。

### B2j時点の全体回帰・配布比較の完了結果

- 通常suiteの実プロセスがexit 0で終了し、JSON reportもsuccess=true。707ファイル、5,389件成功、失敗0、19件skip、387.50秒。skipはopt-inのrelease-smoke 16件／upgrade 2件／performance 1件であり、成功件数には含めない。必要module読込失敗をworld-model/index.jsに限定した対照を含むlazy-loading 3件もすべて成功した。
- chdir依存のforks suiteは別途3ファイル20件成功（1.03秒）。通常suiteで除外したものを未検証のままにしていない。
- B2j archiveを明示指定してrelease-smoke 16件＋公開0.340.0からのupgrade/競合/復旧2件を実行し、18件成功（48.80秒）。さらに実公開0.335.0からのupgrade/競合/復旧も2件成功（25.39秒）。本PJへのinstallや設定移行はしていない。
- performanceのopt-in機能assertは前節の36予備測定で成功しているが、性能基準合格とは別である。T21未合格と公開停止は維持する。
- lintは1,889ファイル・違反0。integrity verifyはok=true/drifts=[]、readinessはallPassed=true、diff check成功。型検証はB2jコード変更後に成功済み。
- 再現: 通常suiteは `./node_modules/.bin/vitest run --config scripts/harness/__tests__/vitest.config.ts`、forksは同じrunで `--config scripts/harness/__tests__/vitest.config.forks.ts`。全体JSONは一時保存先 `/tmp/phasegate-wi220-b2j.pjrcv7/full-regression.json` にあり、永続CI artifactではない。
- T23の当環境での証拠を更新した。対象WI・共有依存・意味リスク判定・実agent比較・未対応環境まで完了したとは扱わず、WIの完了状態を変更しない。

### B4d タグのprefix誤認・重複処理・ソース構文破壊の修正

- WI-220をWI-22の反映と誤認するprefix判定、カンマ列挙の見落とし、重複globによるdry-run件数と同じread失敗の重複を再現。追加10ケースのうち9件が修正前失敗した。
- IDを注釈内の完全一致で照合し、旧story-id／issue-id／work-item-idを保持。WI形式の新規追記は規約どおりwork-item-idとし、非WIはstory-idのまま。重複展開済みパスを一実行一回とし、原因解消後の明示再実行は可能とした。
- 実CLI試験で、既定対象のTypeScriptへ裸タグを追記していたことも確認した。JS/TS系ソースは行コメントにし、Markdown本文とJSONタグ識別子の形式は保持。dry-run本文不変→apply→ソース構文診断0→再実行0件のライフサイクルが成功した。
- skill-qualityのUnit/Integrationと実CLI E2Eを合わせ42ファイル249件成功（6.67秒）。型検証成功、lintは1,890ファイル違反0、設計2文書metadata valid、diff check成功。直前B2jの全体回帰結果を、この変更後の全体再実行と誤表記しない。
- 公開0.335.0 archive内のreflection adapterがwork-item-idと完全IDを読むことをソース確認した。これは今回のCLI出力を旧runtimeで実評価した試験の代用ではない。新候補の再packと配布回帰は残る。
- 新たなgateや設定移行は追加していない。タグ処理の成功が意味的な設計反映・承認を証明しない点は維持する。

### 配布pre hookの旧新判断比較

- upgrade fixtureの各段階に実pre hookを追加。Read／利用者文書Write／設定直接Write／拒否直後Readを同じstdinで評価し、候補の0／0／保護理由付き2／0と旧版の観測結果を比較する。hookの判断のみ実行し、設定へ提案した本文は実際には書き込まない。
- 公開0.340.0→B4d候補→再配置→旧runtime復旧の比較は成功。強化後のupgrade 2件とrelease-smoke 16件を同じ候補archiveで実行し、計18件成功（55.92秒）。型検証、設計metadata、diff checkも成功。installation作業sessionは正規終了した。
- 公開0.335.0では設定直接Writeを許可するため、同一判断比較は失敗。公開0.340.0を候補役にした対照でも同じallow→block差を検出（27.82秒）、B4d候補との比較も同じ差で失敗（25.97秒）。したがってWI-220起因ではない既存保護差だが、0.335.0との完全互換は未達である。
- 0.335.0での以前のファイル保全試験成功を撤回する必要はないが、その結果をゲート判断互換に拡張しない。差をテストから除外せず、互換範囲と既存保護強化の扱いを保守者へ確認中。詳細はcompatibility_inventory.mdとdecision_log.mdのD05。

### T07/T08 正規設定変更からの再開

- 旧配布物でquick-mode-strictを適用したfixtureを候補runtimeへ更新し、文書Write／設定直接Writeの拒否から、案内されたquick-mode-relaxの予告・明示適用を経て文書Writeが許可へ戻るケースを追加した。runtimeは変更せず、既存の正規復旧経路を実配布物で検証した。
- 予告の本文不変と一つの設定項目の変更、管理Bashコマンド自体のpre hook許可、backup内の旧設定、他設定の維持、復旧後も設定直接Write拒否、明示再apply後も文書許可と本文保全を確認した。ポリシー変更は一時fixture内の明示選択であり、実PJや利用者設定には適用していない。
- 0.340.0→B4d候補で強化後upgrade suiteの3件すべて成功（46.36秒）。0.335.0→候補の復旧ケースだけを選択実行し1件成功（12.70秒、他2件は選択外）。0.335.0の無差分比較が失敗する事実はそのまま残り、この選択実行をsuite全体合格としない。
- 型検証、設計metadata、diff check成功。適用条件と3操作の復旧例をmigration_plan.mdに記録した。設定破損・設計不足・上位判断待ちへの汎用復旧としては扱わない。

### B2k 破損設定の消失と空backupの防止

- 一時環境で、破損JSONへのconfig:plan --applyがexit 0／changed=trueとなり、元のproject値が失われ、backupは0 bytes、次のpreviewが必須project不足でexit 2となる既存不具合を再現した。実PJの設定は変更していない。
- 設定変更intentでは、未存在・破損・読込不能を空設定とみなさずblocked preview／refused apply（exit 1）で原文を保持する。原因別に初期化・権限確認・権限ある修復／復元を案内し、同じ入力の明示再実行も無変更で終える。有効設定の既存操作、非設定intent、schema-invalidの上流exit 2は保持した。
- 有効設定のbackupは空白・改行を含む原文を保存する。適用直前のJSON差分があれば上書きせず再計画へ戻す。backupと一時ファイルの排他的作成を追加したが、プロセス間ロックや全競合タイミングの保証ではない。
- 修正前は追加4ケース中3件失敗。修正後は追加4件＋既存CLI 71件の計75件成功（110.31秒）。実EACCESを加えた最終安全性suiteは5件すべて成功（13.12秒、当macOS／非root環境でskipなし）。破損・未存在・権限不足の解消後、同じintentが成功することまで確認した。
- 型検証成功、lintは1,891ファイル違反0、設計2文書metadata valid、diff check成功。全体suiteと新候補archiveでの配布検証は未実行。B4d archiveにはこの変更は含まれない。
- データを壊す旧exit 0から安全な拒否への意図した差分はD06と公開CLIガイドへ明記した。全入力の終了コード無差分を達成したとは扱わず、公開レビュー対象として残す。

### B1b Stopの死蔵依存整理

- Stop UseCaseの未使用イベント／translator／guard実体importとprivate registry保持、Stop hookのregistry生成・注入を削除した。公開portsのregistry入力は任意として残し、旧呼出元は引き続き利用可能。公開translator exportは削除していない。
- registry省略を含むテストは変更前の型検証で失敗し、変更後は型検証成功。旧入力あり／省略の両方で完了検査失敗・enforce=true・解除済み状態を確認した。再入、実Stop payload、欠落field、CLI dispatchを含む5ファイル44件成功（22.55秒）。設計metadataとdiff checkも成功した。
- B2kとB1bを含めて再packした候補は1112578 bytes、SHA-256 `3ef8dda05d636422cb89d629714a18fcef9877b0937e9c198a82bdb4427167d8`。一時保存先 `/tmp/phasegate-wi220-b2k-b1b.a3zbrM/phasegate-0.340.0.tgz`。
- この候補時点で通常全体suiteと配布release-smoke／公開0.340.0からのupgradeを開始。完了結果は未確認であり、開始を合格扱いしない。作業sessionは正規CLIで終了した。

### B2k/B1b 全体回帰で検出した未解決差分

- 通常suiteはexit 1、709ファイル、5,406件成功・1件失敗・20件skip。JSONのsuccess=falseを確認した。失敗は `integration/setup/agent-setup-planner-cli.test.ts` の欠落設定に対する `config:plan --intent l4-strict` previewで、旧期待 `applicable` に対し新結果 `blocked`。fixtureは設定を作らない空directoryであり、B2kの欠落設定保護による実際の契約差分である。
- D06に安全性の意図は記録済みだが、旧previewの表示契約まで変更する必要があるかは未解決。テスト期待値だけを変更して互換性成功とはしない。安全なapply拒否・復旧案内と旧preview互換の両立を次に検討する。
- forks suiteは3ファイル20件成功（0.977秒）。配布suiteは最初のプロセスの終了結果を回収できなかったため成功扱いせず、同一archiveでJSON出力付き再実行。release-smokeと公開0.340.0からのupgradeの2ファイル19件成功、skip/失敗0、exit 0を確認した。
- 一時JSON: `/tmp/phasegate-wi220-b2k-b1b.a3zbrM/full-regression.json` と同directoryの `package-regression-confirmed.json`。この配布成功は通常suiteの失敗を打ち消さず、全体判定は未合格。

### B2k追補 欠落設定のpreview互換とapply保護の分離

- 前節の失敗を受け、ENOENTのpreviewだけ旧before=null／applicable／部分patchを維持した。初期化前の検討を妨げず、commands先頭にinstall --dry-runを示す。applyは既存JSONがなければ、backupや一時ファイルを作る前に復旧案内付きexit 1で拒否する。
- 破損JSON・I/Oエラーはblockedのまま。非設定intent、既存設定の更新、schema-invalidの上流exit 2は維持。プレビューが書込み許可ではないことを設計・公開ガイドに明記した。
- 失敗していた既存setup試験の期待値は変更していない。同suite7件と復旧安全性5件、計12件成功（20.60秒）。欠落previewの完全patch、apply明示再試行の無変更、修復後の再開も確認。tsc --noEmit成功。
- この変更は前節の配布archiveに含まれない。全体再実行と再pack後の配布検証は引き続き必要。欠落preview差は解消したが、危険なapplyの意図的なexit変更（D06）は残る。

### preview互換修正後の配布候補

- 修正後を再pack。候補は1112722 bytes、SHA-256 `a93069a73870c3ec3f3f976cb40f069cfb0e86a47f9b4000f00fc68d40fb6611`、一時保存先 `/tmp/phasegate-wi220-preview-compat.ygSfRq/phasegate-0.340.0.tgz`。公開・本PJへのinstallはしていない。
- 同archiveでrelease-smokeと公開0.340.0からのupgradeをJSON出力付き実行。結果は同directoryの `package-regression.json` に保存。実プロセスのexit 0を確認した。
- lintはstatus=pass／errors=[]、integrity verifyはok=true／drifts=[]、readinessはallPassed=true。これらをT14/T15/T20/T24の実装・評価の代用にしない。
- 通常全体suiteは別プロセスで再実行中。出力先 `/tmp/phasegate-wi220-b2k-b1b.a3zbrM/full-regression-preview-fix.json`。未完了を成功扱いしない。

### preview修正後の全体完了とT20評価基準

- 上記通常suiteのexit 0とJSON success=trueを確認。709ファイル、5,407件成功・失敗0・20件skip。20件はopt-inのrelease16／upgrade3／performance1であり、通常成功数には含めない。最新配布archiveでrelease＋upgrade19件は別途成功。性能の未達は維持する。
- 全体suite開始後にT20の8ケースcorpusを追加したため、それは上記5,407件には含めない。`fixtures/wi-220/semantic-risk-corpus.json` にbefore/after・期待意味ラベル・前提理由・既存category/eligibilityを保存。`semantic-risk-baseline.test.ts` は実domain objectsで既存分類を観測する。
- corpus上、内部adapter整理/追加の2ケースがapiで不適格、公開signature/認可/保存形式の3ケースがbugfixで適格、内容不明もbugfixで適格だった。これはQuick Mode分類単体の限界であり、他の保護を通過できることを証明したものではない。意味ラベルはfixtureの前提付き評価基準であり、任意コードへの一般化や機械的な意味証明ではない。
- corpus8件成功。周辺quick-modeを含む36ファイル409件成功（8.88秒）、型検証・設計metadata・diff check成功。強制gate・公開DTO・設定は変更していない。助言分類器とcorpus比較は次の実装であり、T20未達を維持する。

### T20a 明示snapshotによる助言の部分実装

- `check-change-category --risk-snapshots <json>` を追加。既存classificationの後に別field riskAdviceを付け、既存category／fullModeRequired／exitは変更しない。未指定時は追加fieldなし、snapshot読込・追加AST解析なし。公開DTOの助言fieldは任意。
- TypeScript構文で明示型付きexport関数・interface・typeの宣言差分をmodule-surface-changeとして示す。表面不変の本文差はbehavior-reviewとし、認可・不変条件・保存形式を確認する。完全同文以外の意味同値性は認定しない。class・推論型・再export・宣言ファイル・create/delete・情報欠落・重複はunknown。元内容は出力せずhashを返す。
- caller-snapshot／enforcement=noneを各結果に明示する。現revision・上位承認・本当に外部公開されるAPIの証明ではない。corpus8件では公開signature差を検出し、認可・業務不変条件・保存形式は本文レビュー、内部抽出も本文レビュー、内部adapter2件はunknownのまま。これらの未解決をT20合格に置き換えない。
- 新規adapter未実装時に試験のmodule解決失敗を確認して実装。最終新規16件を含むquick-mode周辺37ファイル425件成功（12.90秒）。実CLIで従来exit 0のclientとexit 1のadapterの双方を助言あり/なしで比較し、riskAdvice以外のJSONとexitが一致した。
- lint成功。全体回帰5,407件と配布19件はこの助言追加より前の結果であり、この変更の全体検証へ流用しない。全体・配布回帰、内部変更と外部意味変更のより広い評価が残る。

### T20a候補の全体・配布再検証

- 助言追加を含む候補を再pack。1115887 bytes、SHA-256 `a5bf6483b0a4a8fe28f559af553344e7cfe607c8786d0eb17829ab9627b445c7`、一時保存先 `/tmp/phasegate-wi220-risk-advice.E6FVv1/phasegate-0.340.0.tgz`。
- 通常suiteとrelease-smoke／公開0.340.0 upgradeを開始。結果出力先は同directoryの `full-regression.json`／`package-regression.json`。開始時点では未完了であり、成功数は確定していない。
- 起動方式の予備調査はperformance_report.mdに記録。小幅の起動短縮候補は見えたがNode互換分岐を伴うため未採用。T21未達・公開停止は維持する。

### 配布TDD比較で検出した新規拒否（未解決）

- T20a archiveの従来release-smoke＋upgradeは19件成功、skip/失敗0、exit 0を確認。ただし次の追加比較は失敗しており、配布互換全体を合格とは扱わない。
- `package-upgrade-compatibility.e2e.test.ts` に既存coverageThreshold=90の文書TDD操作を追加。旧0.340.0と候補を独立した一時Git repositoryへ導入し、同じ設定・staged notes.txt・公開skill:execute-tdd-cycleを実行した。旧版はexit 0でcommit、候補はL3-003のcoverage report不足でexit 1／commitなし。9.76秒、選択した1件失敗、他3件選択外。
- 原因はB2dで設定mapperをTDD L2/L3経路へ無条件伝播したこと。旧版はDEFAULT_CONFIG（coverageThreshold=0）だったため、既存設定の存在だけで新たな拒否を追加していた。これはWI-220起因のAC-01違反であり、期待値変更や閾値低下で隠さない。
- 修正方針は既存CLIの検査profileを保持し、追加の共通設定検査を明示選択できる経路に分けること。既存のL2/L3検査やGit hookは省かない。未修正のため新テストは失敗のまま残している。
- 通常全体suiteはこの追加opt-in試験より前に開始しており、その結果に新ケースを含むとは扱わない。型・設計metadata検証も別途確認する。

### B2d互換修正 明示的なconfigured profile

- 配布比較の新規拒否を修正。既定CLIは旧引数なしfactoryによるL1/L2/L3検査・warning拒否を保持する。`--configured-validation` を指定した場合だけ共通設定を注入する。両profileとも通常Git hookと既存exitを維持し、選択profileを表示する。方針はD07に記録した。
- 修正後のtarballは1115997 bytes、SHA-256 `b0e5a2e39feee0a71469836097f0c010d979591c4815b876926f7624ab97f969`、`/tmp/phasegate-wi220-tdd-compat.YYoB2o/phasegate-0.340.0.tgz`。
- 同じ旧新版fixtureで、旧版・候補既定ともexit 0／commitを確認。候補のconfiguredではL3-003／exit 1、HEADとstaged文書を保持し、制御されたcoverage報告fixtureを置いた後の同じ明示操作ではexit 0／commit／staged解消まで確認した。これはテスト用報告入力による復旧試験であり、製品テストの実coverage証明ではない。
- 強化後の配布比較は選択1件成功（12.75秒）、他3件は選択外。配布suite全体の成功に拡張しない。skill-quality周辺41ファイル248件成功（4.81秒）、型・lint・設計metadata・diff check成功。
- 助言追加時点の通常全体suiteもexit 0で完了し、711ファイル5,431件成功・失敗0・20件skipを確認した。ただしこのTDD修正と追加配布試験はその実行より後であり、最新全体回帰の証拠にはしない。
- 今回再現したTDD新規拒否は解消した。全対象設定の旧新比較、対象WI・意味分類・性能・実agent比較は引き続き未完了。

### T19 現行設計への統合と最新配布回帰

- agent-integrationのdomain/logical/unit-test/IT-test本文に残っていたPostの500ms／--fast／lint失敗exit 1、Stopの未使用translator経由、正常skipログ追記の旧説明を現行実装と照合して置換した。冒頭に新仕様を追記するだけの矛盾を解消し、同期translatorの公開互換と実Stop依存を区別した。
- H11-03の500ms応答要求は勝手に緩和しない。domainモデルD5に、候補の5000ms実行上限が性能合格を意味しないこと、T21未達と上位判断の必要性、性能報告への導線を明記した。これは上位要求の達成・承認ではない。
- 設計4文書とacceptance_auditのmetadata valid、diff check成功。図中のStop依存も状態Port直接調停に揃えた。全product文書の意味整合を証明したとは扱わない。
- TDD修正archiveでrelease-smoke16件＋強化済みupgrade4件が成功（JSON success=true、失敗/skip 0）。JSONは `/tmp/phasegate-wi220-tdd-compat.YYoB2o/package-regression.json`。forksも3ファイル20件成功（1.05秒）。
- 通常全体suiteは同directoryの `full-regression.json` を出力先として実行中。最新runtimeの全体成功は未確定。文書統合は開始後のため、metadataを別途検証した。

### TDD互換修正後の全体完了・B2lスキーマ初期化削減

- 上記全体suiteはexit 0／success=true、711ファイル5,431件成功・失敗0・21件skipで完了。skipはrelease16／upgrade4／performance1。release＋upgrade20件とforks20件は前節の別実行で成功している。
- 続く起動調査でAjv schema v2/v3の両方をmodule import時にcompileしていることを確認。B2lでは選択版だけを初回validate時にcompileし、成功した検証関数だけ版別に再利用する。schema本文、Ajv options、版選択、診断変換、documentごとの検証は変えない。
- 追加2ケースは変更前に両方失敗し、変更後は既存v2/v3と合わせ51件成功。schema I/O失敗を伝播し、修復後に同じinstanceでvalidate可能であることも確認した。周辺40ファイル292件成功（2.69秒）、型・lint・設計metadata・diff check成功。
- B2l archiveは1116165 bytes、SHA-256 `4f4bf85f1b7636356d066eee5e8d8d3e81c37228c75359c81e387c6ddd19326a`、`/tmp/phasegate-wi220-b2l.IFFZyg/phasegate-0.340.0.tgz`。この変更後の全体・配布回帰は残る。性能予備測定を開始したが、開始はT21合格ではない。

### B2l配布互換・forksの結果確定

- 上記archiveのSHA-256を再確認し、`package-regression.json` のsuccess=true、20件成功・失敗/skip 0と全caseのpassedを確認した。release-smoke16件はPython／Go／docs-onlyへの導入・診断・撤去および明示Husky配置、upgrade4件は公開0.340.0とのTDD既定互換・正規設定変更後の再開・利用者編集保全・旧runtime復旧を対象とする。
- TDD比較にはconfigured profileでの拒否後、必要報告fixtureを補った同じ操作の再開も含む。これを未検証設定・最古版・他OSでの無条件互換の証明にはしない。
- 最新worktreeのforks suiteは3ファイル20件成功、exit 0（0.915秒）。通常全体suiteはPID 37172が稼働していることを確認して継続監視し、観測ハンドルの欠落だけで再起動していない。出力先は同directoryの `full-regression.json`。未完了を成功に計上しない。
- 性能予備測定は [性能報告](performance_report.md) と `performance_samples_b2l_probe.csv` に記録済み。T21、対象WI依存閉包、意味分類、実agent比較の残件は維持する。

### B2l通常全体回帰の完了

- PID 37172の終了と出力済み `full-regression.json` のsuccess=trueを確認した。712ファイル、5,433件成功・失敗0・21件skip。全testResultsの失敗なしを確認した。開始時の操作ハンドルは失われているためexit codeを直接回収したとは記載せず、プロセス終了とrunnerの最終JSONを根拠とする。
- 21件はopt-inのrelease16／upgrade4／performance1。前節の同一B2l archiveによる別実行でrelease＋upgrade20件は成功済み。performanceは予備測定で機能assertが成功していても性能基準未達のため、通常suiteの成功・skipをT21合格とはしない。
- この候補の通常・forks・配布検証は完了した。未実装の対象WI依存判定、意味分類の不足、実agent比較、性能未達、互換範囲の判断待ちは残る。変更なしに同じ全体suiteを繰り返すことは、これらの残件を解決しない。

### D08承認後・B3c依存閉包判定

- ユーザーの「全部OK」を受け、既存session許可維持＋警告＋明示強制化、既存入口を残す事前コンパイル検証、隔離agent比較、0.335.0を含む互換/復旧検証をD08へ記録した。承認待ちと実装未完を区別した。
- WorkItemReflectionScopeResolverを追加。対象WIから宣言された推移依存を辿り、別Unit依存を保持する。依存未宣言・不在/重複・所属不明等はunknownのみを返し、部分集合を許可根拠として返さない。循環・重複・15,000段の依存を有限の反復で扱う。
- 新規moduleが存在しない段階のテスト失敗を確認後、17ケース成功。周辺43ファイル392件成功（8.91秒）、型・lint・設計metadata・diff check成功。既存checker/公開Port/hookはこの段階では変更していない。
- T14/T15は未完了。次に正本metadataの読取・検証、対象別の反映チェック、hookでの警告/明示強制化、不足設計を修正した後の再開を接続する。B2lの全体/配布結果にこの追加が含まれるとは扱わない。

### B3c正本反映の保護拒否と独立作業

- depends_on規約を正本docs/folder_management_rules.mdへ追記するapply_patchが実PreToolUseで拒否された。HarnessConfigConfigQueryAdapterがpaths.folderRulesDocを動的に保護対象へ加えており、表示された固定保護一覧だけでは編集可否を判断できなかった。書込経路を変えて迂回せず、[人間への追記依頼](dependency_metadata_rules_patch.md)を作成した。新metadata読取/hook接続は正本反映待ち。
- 承認済みの独立作業として隔離compiled CLI予備試験を追加。実出力/exit一致を確認し、local Biomeありのfixtureではhelp中央値890.4→295.3ms、lint979.0→412.6ms（tsx→compiled、各5回）。詳細と限界は性能報告に記録。正規配布経路は未変更、T21合格ではない。
- B2mではPOSIXの既存ローカルBiome実行ファイルをnearest優先で直接呼び、npx wrapper起動を省く。明示biomeBin、Windows、未検出/非実行可能は旧経路を保持する。引数と検査対象は変えない。変更前に選択2ケースが失敗、変更後8件成功。周辺37ファイル301件成功（3.13秒）、型・lint・metadata・diff check成功。実配布更新/全runtime環境での互換確認は残る。
- T24読取予備比較を各版2回実施し、全試行で必須5項目は正答。回答長統制の不成立、token未計測、実hookなしの限界からT24合格にはしない。[agent比較記録](agent_comparison_report.md)を参照。実hook下の局所修正fixtureを別途準備中。

### B3d/e 正本追記後の依存metadata・実ファイルcatalog

- ユーザーによる `docs/folder_management_rules.md` 3.2直後へのWI-220規約追記を確認し、正本反映待ちを解消した。保護解除や別書込経路による迂回はしていない。例のYAMLへの任意field追加は必須条件にしていない。
- 既存 `parseWorkItemFrontmatter` は変更せず、依存専用の `parseWorkItemDependencies` を追加。未記載と明示空配列を区別し、inline/block listを読み、不正ID・重複field・入れ子・矛盾する継続行を診断する。通常metadata経路の既存許可は維持する。新規24件成功。
- `FileSystemWorkItemDependencyCatalog` は全所有directoryからID重複を保持して索引化し、本文は対象から到達するWIだけを読む。不在・破損・所属不明を部分的な完全集合へ変換せず、閉包判定へ渡せる情報を返す。別Unit・cross・循環・重複・不在・custom root・directory symlink等の11件成功。
- phase-dependency-model／traceability-modelのUnit・Integrationをまとめて再実行し、88ファイル726件成功・失敗/skip 0、exit 0（10.18秒）。`tsc --noEmit` はexit 0。lintもexit 0、1,901ファイル・違反0。これは対象周辺の検証であり、B2l以降の全体・配布回帰の代用ではない。
- product側traceability設計2文書は既存H17-03注釈直後の空行によるmetadata診断を確認し、その空行のみ除去して検証成功。configuration guideの旧 `@story-id` 必須診断はHEADにもある既存状態であり、架空タグ追加で隠していない。
- 既存checker・hookへの依存集合接続は未完。既存session許可を変えていないこの段階の成功だけでT14/T15やデグレ防止全体の達成とは扱わない。ユーザー編集の保護文書には空白差分があるため、diff checkはその文書を除外した範囲として扱う。

### B3f/g 依存閉包からsession警告への接続

- StoryReflectionChecker.checkResolvedScopeを追加し、対象WIと推移依存を全所属/affects Unitへ展開する。無関係WIは除外し、明示cross依存のdomain反映をGit履歴不在だけで省かない。旧checkのUnit範囲・帰属判定は変更しない。実catalog/resolver/FS結合8件は追加前8件失敗、実装後8件成功。
- 有効Full Mode sessionの実装編集で、任意Port checkSessionReflectionを呼ぶ。IDはsession照合結果から取得する。違反・不明・例外を警告として返し、既存allowを維持する。旧Port実装、省略field、期限切れ、設計文書修正経路を維持。usecase追加6件のうち変更前3件が失敗、変更後既存と合わせ16件成功。
- 実adapterはcatalog→resolver→checkerを接続。依存未宣言・不在・不正、設定破損、custom roots未対応、成果物不足・fix反映先不明・空mappingを未検証と表示する。任意mapping警告も保持する。通常checkReflectionの結果契約は変更しない。
- 周辺phase-dependency-model/agent-integrationのUnit・Integrationは96ファイル1,035件成功、失敗/skip 0、exit 0（80.00秒）。この実行後に実CLI表示試験を追加したため、その1件を含むadapter試験14件を別途実行し成功（2.66秒）。重複する試験数を足し上げない。
- 実CLI試験は初回fixtureの必須phaseDependencies.preset不足でsession beginがexit 2となった。fixtureを修正後、通常session beginの成功、未反映でもpre hook exit 0・空stdout・stderr warning、product反映後のwarning解消を確認した。phase-gate緩和を明示した隔離fixtureであり、標準ゲートの拒否・復帰を証明したとは扱わない。
- 型検証・lint（1,905ファイル、違反0）・関係設計6文書metadataは成功。これらは公開・配布比較やT21の合格ではない。新しい強制化設定はまだ導入していない。custom roots、fixの反映先、標準ゲートでの復旧、明示強制化、追加読取の性能・旧新版配布比較が残る。

### B3h 独自ドキュメント配置のsession診断

- paths.inceptionDocs/designDocsをcatalog・成果物存在・mapping解決・legacy alias検索・診断パスへ共通伝播した。mappingの保存形式と旧resolve/check呼出は維持し、任意PathRootsを渡した新session経路だけ移設先を使用する。construction外mappingはprefixの部分一致で移設しない。
- 移設先の直接/推移/cross依存を実filesystemで検証。既定パスにタグが残っていても移設先の未反映を検出し、移設先を更新すると解消する。legacy aliasのUnit範囲判定も維持。不正型・空・絶対・親参照のルートは未検証理由を返し、既定ルートへfallbackしない。
- mapping追加3件とsession追加/更新6件の変更前失敗を確認。実装後、phase-dependency-model全Unit/IT＋session/旧反映adapterの48ファイル453件成功、失敗/skip 0、exit 0（11.75秒）。実CLI警告の既存ケースも含む。tsc --noEmit、lint（1,905ファイル・違反0）、関係設計5文書metadata成功。
- 公開ガイドと現行product本文を更新。強制化設定は未追加。fixの対象カテゴリ、標準ゲートでの拒否・復帰、明示強制化、全体・配布・性能回帰は残る。今回の独自配置対応は新session診断に限定し、旧非session経路の移設対応まで完了したとは扱わない。

# WI-220 結合テスト設計

## T08 設定更新の書込境界中断

<!-- @work-item-id WI-220 -->

実CLIのbackup書込・一時設定書込・renameについて、各操作の直前/直後で子processを強制終了する隔離fault injectionを行う。設定本体は常に旧または新の有効JSON、backupがある場合は原文一致、利用者文書は不変。利用者の後続追記を作り、faultなしのpreview→apply再実行で再開と追記保持を確認する。これはconfig:planの全3書込境界の6状態であり、install/reconcile全ファイルの中断網羅やOS電源断の証明ではない。

追加のreconcile試験では小さな配布template fixtureで実filesystemの更新I/Oを列挙し、各直前/直後のI/O例外を一度だけ注入する。再実行後の利用者追記保持、refusedなし、変更済みファイルとmanifest hashの一致、次の通常更新が新たな手編集競合にならないことを検査する。最小fixtureの全観測境界の検証であり、全packageファイルやOS電源断の網羅とは区別する。

## B2o 配布生成の受入

<!-- @work-item-id WI-220 -->

最小package fixtureを実packし、旧TS/bin/assetsのbyte保持、生成JSのNode直接実行、source mapの存在、checkoutにJSがないこと、既存出力拒否を検証する。TypeScript構文エラーは非zeroでarchiveを出力しない。実PJの生成archiveでrelease-smoke、0.340/0.335更新とrollback、30回×2run性能を別途検証する。通常source packの入口も維持する。

## WI-220 B3j 明示強制化

<!-- @work-item-id WI-220 -->

B3j: 明示強制化の既定互換・拒否後復旧・unknown旧範囲fallback・fix反映候補・schema enumを試験する。標準ゲート下の実CLI lifecycleを必須とし、緩和fixtureだけで完了としない。

## B3i 成果物種別と復旧

<!-- @work-item-id WI-220 -->

必要設計をディレクトリに置き換えたrefactor 1件・story 3件・issue 3件を未検証とする。各fixtureで通常ファイルへ戻し再検査すると解消する。通常ファイルへのsymlinkは成功する。既存session許可と旧reflection adapterを回帰実行する。強制化や標準ゲートの拒否後復旧を証明したとは扱わない。

## B3g / T14–T15 有効sessionの警告

<!-- @work-item-id WI-220 -->

実adapterのcatalog→resolver→checkerを検査し、既存Port未実装時の完全互換、session由来ID、未反映の警告化、例外時allow維持、設計修正経路、期限切れ時非適用を確認する。未知の閉包を検証成功として表示しない。警告接続後も旧反映checkerとsession周辺を回帰実行する。

## B3f / T14–T15 解決済み依存の反映

<!-- @work-item-id WI-220 -->

実filesystemのcatalog→resolver→反映checkerを結合し、無関係draftを除外しつつ対象と別Unitの推移依存を検出する。crossの全affectsを確認し、commit前でもdomain反映を省かない。未反映文書を更新して同じ検査を再実行すると理由が消えること、optional警告とrequired違反を区別することを確認する。旧Unit範囲の結果を同fixtureで維持する。空閉包は拒否、OFFはI/Oなし。hook接続と上位成果物の存在検査は別途必要。

## T21 事前コンパイルの隔離予備検証

<!-- @work-item-id WI-220 -->

次の段階では固定した候補tarballを隔離rootへ展開し、既存TSを残して同位置にJSを生成した試験専用tarballを作る。配布assets/相対root/旧TS入口を維持し、通常のrelease-smokeと旧post-hook計測入口で確認する。生成物は本PJへ戻さず、通常packやpublishへ自動採用しない。入力・出力hashと生成条件を記録し、効果と互換を確認してから採用方法を判断する。

D08の承認に基づき、opt-in試験でruntime TSを隔離directoryへESM JavaScriptとして生成する。正規配布・bin・既存入口は変更しない。相対schema/preset JSONとpackage metadataを同構造へコピーし、開発環境の依存を参照することを報告する。helpと実lintのexit/stdoutが既存tsx経路と一致することを先にassertし、同一fixtureで交互に各5回以上のCLI時間を記録する。生成source一覧hash・Node・実測値・制約を保存し、同じ報告ファイルを上書きしない。これは採用判断用の予備試験であり、配布独立性、hook全体、全OS/Node、T21の30回×2run合格を代替しない。

## B0/B5 / T01,T03,T22 配布物の更新・復旧

<!-- @work-item-id WI-220 -->

明示指定した旧版と候補版tarballを一時docs-onlyプロジェクトにnpm installする。旧版でinstallした設定・hook・skill・利用者追記文書を保存し、runtimeのみ候補版へ更新した混在状態で各ファイルのbyte保持とdoctor/validateの終了状態を比較する。候補版でinstall再実行後も利用者文書と設定を保持することを確認し、その配置物のまま旧runtimeへ戻して同じ操作を比較する。終了コードのみで成功を偽装せず、JSONとして読めることも検証する。新旧tarballのSHA-256を記録し、同じversion文字列でも実体を区別する。ネットワークを伴うため通常suiteでは明示opt-inなしに実行しない。このfixtureは全設定形式・全hook許否・更新中断の証明ではない。

配布物の追加競合fixtureでは、旧版で配置したCI workflowを利用者が変更した状態を作る。候補版reconcileのdry-runは全ファイルを保持し、applyは対象をrefusedとして報告して本文を保持する。同じ入力で再実行しても保持され、旧runtimeへの復旧後も変更が残ることを確認する。forceなしの拒否は保護契約であり、新規エラーループと混同しない。利用者が選んだforce付き更新の試験ではバックアップ本文と利用者の後続編集を保持することを別途検証する。

D08の0.335.0互換試験ではarchive内versionを確認し、config直接Writeだけは既知の保護導入差（旧allow→候補protected block）を明示期待する。その他は旧観測一致、rollbackは旧の全観測一致。正規config:planによる修復・文書編集再開も同じ旧版を用いて検証する。

## B4a / T16 タグ更新の事実性

<!-- @work-item-id WI-220 -->

既存タグ付き本文は更新0件・writeなし、未付与の本文は1件、同じ入力の再実行は0件となる。dry-runは本文を保持し、変更が必要な件数だけを返す。公開handlerのhuman／JSONで意味レビュー未実施を明示し、成功を設計反映承認としない。既存exit 0/1/2・旧storyタグ・公開引数は維持する。

## B3b / T07 Unit復旧

<!-- @work-item-id WI-220 -->

source直下main.tsと有効Unitのdomain編集を組み合わせ、UseCaseが実Unitをsessionへ渡し、実session adapterが許可すること。別Unit混在／期限切れ／category制限は既存拒否を維持。scopeはWindows区切り／正規化した直下ファイルをUnit扱いせず、ドット付きdirectory配下と拡張子なしdirectory指定を維持する。

## B2g / T07,T12,T13 post接続

<!-- @work-item-id WI-220 -->

3入力shapeと直接編集／複数patch／read／shell／不完全payloadを比較。cwdとproject rootが異なる場合も対象を保持する。複数対象はCLIまで届き、先頭だけにならない。timeout案内は未検証・明示lint・自動再試行なしを示し、lint失敗本文を出してpostはexit 0。無効／readの無出力を維持する。実hookで複数編集の診断のみ表示し無関係ファイルの診断を除外する。pre／CIの既存拒否は別回帰で確認する。

## B2f / T07 子プロセス

<!-- @work-item-id WI-220 -->

実scriptのargv・cwd・stdin EOF・非zero終了を確認する。SIGTERMを無視する子と孫を起動し、timeout後に双方が残らないことをPOSIXで検証する。signal終了は成功にしない。配布物上のtsx解決とWindows tree回収は別環境の検証対象として残す。

## B2e / T13 報告範囲

<!-- @work-item-id WI-220 -->

全件解析結果に対象内error／対象外error／warningを含め、対象ファイル・directory・絶対パス・空配列で報告集合を検証する。解析Portには対象制限を渡さない。directoryの文字列prefixが似た兄弟は含めない。位置なし診断は残す。dispatchが既存targetを報告対象として渡し、未指定は全件を保つ。実グラフfixture／実hook全経路による検証は別途必要。

## B2d / T11 共通設定

<!-- @work-item-id WI-220 -->

L1のroot・無効設定・architectureの伝播、L2の無効設定・カスタム文書rootの伝播を確認する。L2/L3のerrorとwarningにfailOnWarning=false/true/旧未指定を組み合わせ、拒否対象と非拒否warningの診断を確認する。L3を外すtargetLayersを導入せずincludeL4=falseを維持。生成／実行例外は既存拒否を維持する。factory/CLI配線と実設定の試験はmockのadapter試験とは分ける。

## B2c / T10 追跡情報と自己申告

<!-- @work-item-id WI-220 -->

WI storyは既存subjectとWork-Item trailerが実Git履歴へ保存され、旧storyはtrailerなしを維持する。Git adapterへの引数配列を使い、hookを無効化しない。handlerの成功・validator拒否・不完全サイクルでexit 0/1/2を維持し、いずれもテスト未実行・自己申告の注意を表示する。拒否ではコミットされない。実CLI全経路と設定伝播はT10/T11の別途検証であり、この試験だけで完了としない。

## B3a / T07

_cross文書＋単一実装Unit、複数実装Unit、_crossのみの3パターンで復旧コマンドの対象を検証。単一Unitだけ具体的beginを出し、_crossコマンドを出さない。session queryには従来の入力を渡し、診断改善を権限拡張にしない。

## B2b / T02

pre/postそれぞれで旧値false/true/不在×新値false/true/不在を実ファイルから読む18ケース。新値不正時にschemaは拒否しadapterは旧値を使用。stop既定値は変わらない。v3 schemaのboolean受理・非boolean拒否と、旧schema用documentの既存テストを維持する。

## B2a / T12

Read/Glob/Grepかつ対象なしはexecuted=false、READ_ONLY、CLI実行0回。Bash/exec_command/未知toolと対象ありReadは既存実行経路を維持する。正常skipを反復してもログディレクトリを作らず、既存ログはbyte単位で維持。異常は理由と対象を追記する。実プロセスで読取りpayloadがexit 0かつ無出力であること、欠落payloadの診断・記録とpre gateのfail-closedが残ることを確認する。

<!-- @work-item-id WI-220 -->

## B1 / T09

- 決定的評価器の未達入力は1回で終了し、実履歴1件、escalationRequired=true、stopReason=UNCHANGED_INPUTを返す。
- 旧executorはhistory付き2回目成功と3回失敗を維持する。
- factoryのhandlerは実ファイル本文を読み、パスにチェック記号がなくても本文の充足を評価する。
- 存在しないファイルはexit 2となり、パスを評価しない。
- 空の未チェック項目は未達。成功メッセージは意味的設計承認を主張しない。
- 旧constructorの直接呼出は互換文字列入力を維持する。

他のT01〜T25はtest_plan.mdに従い、段階ごとに実装前に具体化する。
## B4b / T18,T19 skillの判断経路

<!-- @work-item-id WI-220 -->

既存SkillStructureValidatorで配布skillのlifecycle適合を確認し、必須入力・出力・前提・実行フローを削っていないことを検証する。文書レビューは局所整合修正、共有API変更、認可前提の破綻、承認、却下、未承認代替案、判断後のrevision変更、World Model OFFのシナリオで停止範囲と次行動を確認する。単語の存在テストで行動品質を証明しない。実agent比較・旧新版E2EはT18/T24として別途残す。
## B4c / T17 両端更新と再検証のライフサイクル

<!-- @work-item-id WI-220 -->

実ファイルと既存World Model compositionで、freshな両端pin→claimant/premise双方の内容変更→片側pin更新→残った不一致→もう片側pin更新→再導出成功→後続変更の再検出を確認する。previewは宣言を変更せず、同じ内容の再pinはunchangedであることも確認する。これはdigest鮮度の検証であり、pin更新を人間による意味レビューの証拠とはしない。既存baseline/waiver境界とWorld OFF回帰を併走させ、例外の一括削除や新導入を要求しない。
## B5 / T21 post hookの比較計測

<!-- @work-item-id WI-220 -->

旧版／候補tarballを別の一時ディレクトリへ展開し、同一Node・tsx・依存と同一の小規模TS fixtureでRead／旧cascadeUpdate=false／Writeを各30回交互実行する。warmは事前起動したtsx変換cacheあり、coldはTSX_DISABLE_CACHE=1と定義する。OSのpage cacheを消去したcoldとは区別する。各hookは新規processとする。

macOSの/usr/bin/time -lでwall/user/system/RSSを取得し、同一preloadでchild_process.spawnとNode起動を記録する。lint起動要求・観測子process・skipログ増分・診断を保存し、各条件の中央値とp95を算出する。計測instrumentationの負荷を含むことを明示する。旧timeoutの子孫はその試験専用process groupを終了させて次の試行へ残さない。raw測定は明示指定した未使用reportパスへ出力し、既存レポートを上書きしない。旧timeoutと新しい検証完了を単なる速度勝敗として扱わず品質差を併記する。実agent比較T24とは別の試験である。
## B2h / T11,T21 コマンド分離

<!-- @work-item-id WI-220 -->

一時fixtureから実CLIを起動し、別コマンド用compositionの読み込みをテスト用loaderで拒否してもhelpとphasegate:lintが動くことを確認する。lintはfixtureの既存L1診断まで到達する。対象コマンドで必要なmoduleを拒否した対照ケースは失敗し、検証を実行せず成功にしたものではないことを確認する。遅延した各コマンド群は既存公開CLI回帰で実行し、config不正・exit・JSON互換を維持する。速度改善は別の同条件計測で確認する。
## B2i / T13,T21 構文snapshotの互換

<!-- @work-item-id WI-220 -->

実TypeScript compilerの従来オプションと新オプションを同じadapter／実ファイルへ適用し、全snapshotを比較する。TS/TSX/MTS/CTS/宣言、BOM/CRLF、type/value/dynamic import、re-export、any/型数、metadata、entrypoint、未存在とJS非対象を含める。標準libraryと未列挙依存が読まれないこと、およびその依存edgeが残ることを観測する。既存lint全ルールと全workspace検証を併走し、不要libraryを省くことをgraph対象削減と混同しない。

実repositoryのworkspace列挙器が返す全ファイルにも旧新オプションを適用し、snapshotの全フィールドとファイル集合の一致を検証する。合成fixtureだけでは見落とす実コードの構文差を検出し、単にlint違反0であることを同値性の代用にしない。

## B2j / T09,T21 起動依存の追加分離

<!-- @work-item-id WI-220 -->

CLI loaderの拒否対象をinstallation／quick-mode／phase-dependency-model／traceability-model／adr-foundation／harness-errorのcompositionへ拡張する。helpとlintの成功・実診断、必要moduleを拒否する対照の失敗を確認し、移した各コマンドの既存E2Eと配布更新試験を再実行する。速度の合否は別途同条件の配布計測で評価する。

## B4d / T16 タグ完全一致と重複展開

<!-- @work-item-id WI-220 -->

似たIDだけがある本文には対象IDを追記し、空白／カンマ列挙・HTMLコメント・旧タグに対象IDがある場合は無変更とする。新WIにはwork-item-id、従来IDにはstory-idを生成する。重複glob＋明示パスでapply/dry-runとも同じファイルを1件とし、本文と追記回数を観測する。重複対象のread失敗は1エラーで終わり、原因解消後の明示実行が成功することも確認する。

実CLI＋一時ファイルで新WIのdry-run本文不変、apply後のMarkdown／TypeScript本文、再実行0件を確認する。TypeScriptはcompilerの構文診断も確認し、コメントでない裸タグによるソース破壊を検出する。

## T01/T04/T08 配布更新後のpre hook判断

<!-- @work-item-id WI-220 -->

既存upgrade fixtureの旧導入→候補runtimeのみ→候補再配置→旧runtime復旧の各段階で、公開CLIのpre-tool-useへ同じstdinを渡す。利用者文書のRead／Writeはexit 0、候補の保護config Writeは保護理由付きexit 2、その直後のReadはexit 0を独立assertし、旧版基準と比較する。旧版のconfig保護は推測せず0/2を観測し、候補との差を失敗として検出する。判断だけを呼び出し、保護configへの実書込みはしない。これを不足設計→反映→実装の全復旧経路の代用にしない。

### 正規設定変更による復旧

旧配布版でstrict設定を作った一時projectを候補runtimeへ更新する。文書Writeと設定直接Writeの拒否後、案内されたquick-mode-relaxのdry-runが本文不変、正規applyが対象設定だけを変更してbackupを残すことを確認する。文書Writeが許可へ戻り、設定直接Writeは引き続き拒否されること、再apply後も設定内容と判断が安定することを実CLIで検証する。これは一時fixture限定の明示的なポリシー変更であり、実利用者の設定変更や保守者判断の代行はしない。

## B2k / T07,T08 設定破損の非破壊的な停止

<!-- @work-item-id WI-220 -->

実CLIで破損JSONのpreviewはblocked、未存在のpreviewは旧applicable/部分patchを維持する。両者のapplyと同じ入力再実行はrefusedとなり、原文・ファイル集合が不変であることを確認する。初期化／権限ある修復後には同じintentが成功する。有効JSONの空白・改行を含むbackup原文を照合し、変更後の有効性も再実行で確認する。非設定intentのnot-applicableとschema-invalidの既存exit 2は維持する。

## T02/T03 配布設定比較

<!-- @work-item-id WI-220 -->

T02/T03配布設定比較: 旧/候補tarballを隔離展開し同じ依存から実post hookを実行する。root legacy OFF＋local ON、root ON＋local OFF、root不在＋local OFF/ONの4条件で同じ有効値になることを確認する。OFFは候補lint/skipログ0、ONは旧timeoutと候補lint診断到達を区別する。既存root/local設定bytesをhookが変更しないことを確認し、個人設定形式全体の保証とはしない。

## T07/T12 Post入力障害からの再開

<!-- @work-item-id WI-220 -->

T07/T12追補: Postの不正JSONとconfig-directoryによる実I/O例外でexit2/診断を確認し、入力修正または権限あるfixture管理者のconfig修復後に同じ経路を再実行して成功する。異常時に利用者状態を書換えず、同一障害での自動反復をしない。productのPost test logicに残った旧mock handler例は実在するテストへの参照へ統合する。

## T10/T11 共通設定伝播の配布互換

<!-- @work-item-id WI-220 -->

旧版が無視していた既存coverageThresholdを持つ利用者を独立した旧新Git fixtureで再現する。公開TDD CLIに同一のstaged文書と設定を与え、exitとcommitの有無を比較する。追加拒否を検出した場合は未合格とし、閾値を勝手に下げたりhookをbypassしたりして合格にしない。

Worldと独自配置の追加確認では、custom product rootだけに重複fragmentを配置し、world ON/OFF × configured明示有無の4条件を実CLI/一時Gitで比較する。既定legacyは既存どおりcommit可能、configuredかつworld ONだけはL3-008で拒否しHEAD/stagedを保持する。重複を意味的に解消した同一fixtureで設定を弱めず再実行しcommit可能になることを確認する。標準rootは正常とし、独自rootを無視した偽の成功を防ぐ。

## B1b / T09 Stopの依存整理

<!-- @work-item-id WI-220 -->

registryを渡す旧呼出と省略する呼出でcomplete-check結果・enforce・解除済み状態が同じになることを確認する。既存の再入・CLI失敗・例外・session不足・実Stop hookの回帰を実行し、未使用依存の除去と必要処理の削除を混同しない。

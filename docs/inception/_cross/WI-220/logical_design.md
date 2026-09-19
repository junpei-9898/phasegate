# WI-220 確定設計

## B5a 中断後の管理台帳修復

<!-- @work-item-id WI-220 -->

reconcileの本文更新後・manifest保存前に中断すると、再実行で本文が既に新しいためskipされ、旧hashだけ残る不整合をT08で再現した。本文の再書込は不要だが、現在本文が配布templateから新規生成した完全な本文と一致するときだけ、applyでhashを再同期する。package.jsonは台帳の旧versionへ管理項目だけ戻した本文のhashが台帳と一致する場合に限定する。単なるmerge結果の不変を根拠に利用者編集を承認しない。dry-runは台帳を変更せず、曖昧な編集の既存refuse/force/backup契約を維持する。新しい常設journal・移行設定・全ガード解除は追加しない。

## B2o コンパイル配布の再現可能な生成

<!-- @work-item-id WI-220 -->

`pack:runtime` は通常のsource archiveを一時directoryへpack・展開し、直接dev dependencyのTypeScriptでruntime TSを同位置のESM JS/source mapへ変換して再packする。checkoutへJSを生成しない。元のTS/bin/assetsと公開入口を保持し、通常npm packはsource配布として残す。CIの配布物検査は明示runtime packを使う。生成失敗は失敗のまま終了し、TS配布へ暗黙fallbackしない。生成先の既存archiveを上書きせず、出力JSONにarchive識別を返す。publish/install/設定変更は行わない。

試作esbuildへの推移依存を製品ビルドに持ち込まない。コンパイラ変更後の実archiveを独立install、旧新更新/rollback、hook性能で再検証し、試作の性能結果を流用しない。

## B2n 配布済みcompiled CLIの子起動

<!-- @work-item-id WI-220 -->

配布probeではJSを同梱するだけでは既存tsx入口の変換負荷が残った。canonical phasegate:*子コマンドはpackage内main.jsが通常ファイルとして存在するときだけNodeで直接起動し、不在は従来のtsx/main.tsを使う。利用者cwdのJSは探索しない。既存TS入口・extension wrapper・引数・stdin・timeout回収・exitを維持し、JS実行失敗後のTS自動再試行は行わない。通常配布へJSを生成する仕組みは別の採用判断であり、本段階は既存経路とcompiled配布物の両方を検証する。

## T20b 型が明示されたclassの差分助言

<!-- @work-item-id WI-220 -->

snapshot助言は明示型付きclass method/property/constructorの宣言と本文を分離する。decorator・推論型・initializer付き引数・未対応memberはunknownのままにする。宣言不変のadapter内部抽出をbehavior-review、宣言変更をmodule-surface-changeとし、公開APIか否かはpathから推定しない。private memberを含む宣言観測であり、外部契約の証明ではない。既存分類とgate許否は変更しない。

## B3i 強制化前の成果物種別検査

<!-- @work-item-id WI-220 -->

session専用の必要inception成果物検査は、存在するだけでなく通常ファイルであることをstatで確認する。同名ディレクトリは未検証warningとし、通常ファイルへ修正後は再評価で解消する。参照先が通常ファイルであるsymlinkは従来同様扱う。旧checkReflectionと共有filesystemのfileExists契約は変更せず、既存session許可を維持する。これは内容・意味・承認の検査ではなく、強制化経路をまだ有効にしない。

## B3h session反映の文書ルート伝播

<!-- @work-item-id WI-220 -->

新session経路に限りpaths.inceptionDocs/designDocsをproviderから取得し、catalog、成果物存在検査、mapping解決、legacy ID検索、診断パスへ同じルートを伝える。mappingの保存形式と旧resolve/check呼出は変更しない。resolveの任意PathRoots引数で既定inceptionとconstructionのディレクトリ境界に一致するprefixだけ置換する。product/units等のconstruction外mappingは置換しない。ルートの空文字・絶対パス・親参照・不正型は未検証warningとし、暗黙の既定パスfallbackで合格にしない。既存呼出への新拒否は追加しない。

## B3g Full Modeへの依存警告接続

<!-- @work-item-id WI-220 -->

StoryReflectionQueryPortに任意のcheckSessionReflection(unitId, workItemId)を追加し、旧実装を壊さない。認証済みsessionが許可した実装編集だけで呼び、IDはtool自己申告でなくsession結果から取得する。catalog→resolver→checkResolvedScopeを接続し、blockersもこの段階では警告へ変換して既存allowを維持する。Port未実装は従来結果そのまま、読取失敗/不明閉包は明示warningであり検証成功ではない。inception/product修正はこの追加検査の対象外。OFFも維持する。hookは追加warningをstderrへ出し、exit 0を保持する。

新adapter経路は独立し、旧checkReflectionの許否・表示契約は変えない。custom documentation rootsは未対応の旨を警告して誤ったdefault pathで合格にしない。inception不足等を含む強制化の安全性が揃うまでは強制化設定を追加しない。この警告接続だけではT14/T15の強制化・復帰受け入れ条件は未完。

警告経路でも成果物不足を空の成功にしない。refactorはlogical_design、story/issueはlogical_design・domain_model・少なくとも一つのtest設計の存在を確認し、不足なら未検証理由を返す。fixの関係カテゴリ特定と非choreの空mappingは未検証として扱う。これは成果物の内容やtestカテゴリの網羅性を証明するものではない。

## B3f 解決済み依存集合の反映チェック

<!-- @work-item-id WI-220 -->

StoryReflectionCheckerへcheckResolvedScopeを加法追加する。入力はresolverが返すcompleteな閉包に限定し、全WIを所属/affectsの各Unitへ展開してmappingを評価する。既存check(unitId, config)のUnit全体列挙とcross domainのGit帰属判定は変更しない。新経路では明示依存のcross domain文書を「まだcommitされていない」だけで除外しない。重複WI/Unitは一度だけ評価し、required違反とoptional警告を統合する。空の閉包は成功ではなく入力不正とする。無効設定はI/Oせず既存OFFを維持する。

本変更は既存mappingの反映検査の対象選択のみを実装する。inception成果物自体の不足、custom rootsの写像、unknown時の旧範囲fallbackとhook警告/強制化は接続時の別要件であり、未接続の段階でT14/T15完了とはしない。タグ検出は意味的承認の証明ではない。

## B2l 設定スキーマの必要時コンパイル

<!-- @work-item-id WI-220 -->

AjvConfigSchemaValidatorのmodule import時に両schemaを読む処理を廃止し、既存の版検出で選ばれたschemaを初回validate時にコンパイルして版別に再利用する。Ajv options・schema内容・版検出・診断変換は変えない。検証前に成功を返さず、必要なschemaの読込/compile失敗は伝播する。失敗をcacheせず、原因解消後の明示validateで再試行できる。設定ファイルの結果はcacheしない。未使用版のcompileを省くことと設定検証の省略を混同しない。

## T20 リスク分類の比較corpus（評価基準）

<!-- @work-item-id WI-220 -->

分類器の変更前に、内部抽出、adapter追加、公開API、認可、業務不変条件、データ形式、内容不明をbefore/after付きで固定する。期待する意味ラベルと既存分類の観測を分けて保存する。意味ラベルはfixtureの前提に基づく評価基準であり、機械判定や任意コードの意味保証ではない。旧分類の再現試験が成功してもT20合格とはしない。新分類器との比較で必要エスカレーション、不要強制拒否、不明の扱いを別々に観測し、既存ゲートを暗黙に変更しない。

### T20a 明示的なsnapshot助言

`check-change-category --risk-snapshots <json>` を加法追加する。JSONはfilePath/beforeContent/afterContentの配列。既存paths分類・fullModeRequired・終了コードを先に通常どおり算出し、助言は別fieldへ付加する。snapshotは呼出元提供の比較資料であり、現ファイルや承認済みrevisionとの一致を保証しない。内容hashを返して比較対象を特定する。

TypeScript構文解析はinfraで行い、明示型付きexport関数・interface・typeのmodule表面差分を検出する。これは外部公開APIの証明ではない。表面不変でも本文変更はbehavior-reviewとし、内部抽出の意味同値性を自動認定しない。未対応構文、欠落/重複snapshot、不正構文、create/deleteはunknownとして確認事項を返す。完全同文だけno-content-change。いずれも既存gateを上書きせず、強制停止しない。既定経路ではsnapshot読込も追加解析も行わない。内部/外部公開範囲と業務意味の評価は残るため、この部分実装だけでT20完了とはしない。

## B3b source直下ファイルのUnit誤認

<!-- @work-item-id WI-220 -->

WriteTargetScopeのsource prefix解決で、残りが1要素かつドットを含む場合は直下ファイルとしてUnitを推定しない。main.tsをUnit名にしてsessionを拒否する誤判定を解消する。2要素以上のUnit配下ファイルは従来どおりで、ドットを含むUnit directoryもこの除外に含めない。拡張子なしのUnit directory指定、複数source root、path正規化・traversal防御、保護ファイル判定は保持する。

sessionの期限・category・全pathのUnit照合は変更しない。同一Unit＋unitless直下ファイルは既存unitless契約で許可し、別Unitとの混在は拒否する。これはWI選別やsessionによるreflection早期returnの変更ではない。後者は既存の安全性欠落としてB3全体設計で対応を要する。

## B2g post hookの接続

<!-- @work-item-id WI-220 -->

post入力は既存PreToolUsePayloadNormalizerを解釈だけに再利用する。認可／pre gateは変更しない。既知の直接Write/Edit系と完全なapply_patchから対象を取得し、payload cwdに対する絶対パスへ解決する。shell／未知／不完全入力は部分的な抽出で範囲を狭めず全件検証を維持する。Read/Glob/Grepは対象なしの既存早期終了を維持。project外だけの入力も本段階では全件fallbackとし新規の省略条件を増やさない。

実行cwdは設定から求めたproject root、対象はその相対パスとする。翻訳器は未実装--fastを送らず、重複を除いた各対象を反復--targetで渡す。既存CLI文字列map境界では複数対象をargs.reportTargetsのJSON配列に直列化し、dispatchが配列・非空文字列を検証してPortへ渡す。従来のflags.targetも保持する。

500msはhelp起動実測797〜814msより短いため5秒へ変更する（小fixture検証用の初期値でT21未完）。上限到達は未検証と明示して手動の全体lintを案内し自動再試行しない。postは編集後feedbackであり、新たな拒否を作らないようlint非zero／timeoutをexit 0の診断として返す。preとcommit/CIの拒否は変更しない。無効／読取りは無出力。失敗時は捨てていたCLI本文を表示する。

## B2f 子プロセス実行と回収

<!-- @work-item-id WI-220 -->

ChildProcessCliExecutorAdapterはpackage自身から解決したtsx/cliをprocess.execPathで起動し、npx/npmによる追加解決・取得を行わない。tsx CLIを使うため既存のNode対応分岐を維持し、--importを必須化しない。canonical／既存wrapper／直接scriptのargv契約を保ち、任意cwd注入を追加する。stdinは直ちに閉じ、対話待ちを作らない。signal終了のnull exitは成功0と扱わない。

timeout時はPOSIXで専用process groupへSIGTERM、250ms後SIGKILLを送り、closeと回収処理の両方の完了後TimeoutErrorを返す。Windowsは開始したPIDのtreeのみtaskkill /T /Fで回収する。ESRCHは終了済みとして扱い、他の回収失敗は成功扱いにしない。正規終了のtimerを解除する。postの500ms値は実測・後続設計で見直すが、本段階で無根拠に延長しない。

## B2e lint解析範囲と報告範囲

<!-- @work-item-id WI-220 -->

phasegate:lintの既存target flagをdispatchからBiomeLintPortの任意reportTargets配列へ渡す。既存の引数なし呼出、complete-check／ci-checkの全件検証は維持する。BiomeAstEngineLintAdapterは対象を解析UseCaseへ渡さず、従来どおり全体の依存グラフを構築してから違反の報告だけを対象ファイル／配下directoryへ絞る。パスはadapterのrootDirに対し正規化し、絶対パス・相対パス・区切り境界を考慮する。位置なし診断は捨てない。空配列／未指定は全件とする。対象指定のない外部Port実装は引数を無視して全件検証する既存互換を保つ。

本段階はCLI既存targetの伝播まで。post payloadからの抽出、複数targetのCLI構文、timeout／子プロセス回収／診断表示は後続段階で接続する。未実装fast引数や500msを本段階で正当化しない。

## B2d TDDの共通設定伝播

<!-- @work-item-id WI-220 -->

公開factoryに任意optionsを追加する。CLIは `--configured-validation` を明示指定した場合だけ、通常lint/validateと同じmapperのL1設定・architecture・validator設定・failOnWarningを渡す。既定CLIと旧引数なしfactory／adapterは設定なし・全診断拒否の従来動作を維持する。既存coverage閾値が更新後突然強制された配布回帰を受け、無条件注入を撤回した。設定ファイルの書換え、新たな必須設定は導入しない。選択したprofileは出力へ明示し、通常Git hookは両profileで維持する。

L1 adapterはrootDirとBiome module optionsを注入する。L1のseverityは通常lintが現在warningも拒否するため本段階では変更しない。L2 adapterは同じvalidator moduleへ設定を渡し、includeL4=false（L2＋L3）を維持する。failOnWarningを集約へ渡し、診断ごとの拒否判定には既存effective-severity-policyを使用する。warningを非拒否にする場合もstderrへ診断を残す。生成・実行例外のfail-closedは維持する。failedかつ診断なしの扱いは従来adapterの欠落であり、この変更で暗黙に新規ブロックを追加せず、互換性比較の未解決項目として残す。

## B2c TDDコミットの追跡と証拠の境界

<!-- @work-item-id WI-220 -->

既存の `--story` が厳密な `WI-<数字>` の場合、UseCaseは既存CommitMessageの任意workItemId引数へ同じIDを渡す。subjectを維持し、Work-Item trailerだけを補う。H12-01等の旧story IDは推測でWIへ変換せず従来メッセージを維持する。公開引数を必須追加しない。

`--passed` は呼出元によるテスト成功の申告であり、このコマンド自体はテストを実行しない。handlerは成功・検証拒否・例外の各出力にこの境界を明示する。REFACTOR＋passed、L1/L2経路の検証、Git hook、exit 0/1/2の既存契約は維持する。実Git検証は隔離した一時repositoryで行い、作業repositoryにはコミットしない。共通設定／severity／L3検証経路の是正は別の詳細設計・回帰を伴う次段階とする。

## B3a Full Mode復旧案内

mixed patchの先頭inceptionパスから得た_crossをsessionのunitとして案内しない。復旧メッセージに限り、inception以外の対象からCLIで有効なUnit IDを収集し、1個に確定した場合のみそのUnitのbeginコマンドを出す。複数・不明の場合は対象Unitを確認しUnitごとに設計反映とsession開始を行うよう案内する。認可判定・保護対象・session照合の入力は変更しない。

## B2b hook独立設定

v3 schemaに任意の `agentIntegration.preToolUse.enabled` と `agentIntegration.postToolUse.enabled` を追加する。各booleanを明示した場合だけ優先し、不在時はそれぞれ旧 `harnesses.agentLessonCollection ?? true` と `harnesses.cascadeUpdate ?? true` にfallbackする。無効な独立値は有効化・無効化の根拠にせず旧値へfallbackし、schema validatorは型違反を報告する。

デフォルト設定・既存ファイルは書換えない。v2環境には新キーを自動導入しない。現行config:planにはこのキーの変更intentがないため、利用者にはADR-041に従う人間のレビュー付きhook外編集を案内し、存在しないコマンドを提示しない。旧schemaへの復旧は新キー追加前設定を戻す。pre hookの信頼ルート保護を迂回する設定ではなく、既存isHookEnabled契約の明示化に限る。

## B2a 読取り・正常skip

HandlePostToolUseUseCaseはRead/Glob/GrepでaffectedFilePathsが空の場合にREAD_ONLYで終了し、lint実行と設定読込みを省略する。Bash、exec_command、不明tool、または変更対象が明示された入力は読取りと推定しない。既存の書込用usecase経路を維持する。

skip recorderはHOOK_DISABLEDとREAD_ONLYを保存しない。異常なTOOL_NAME_MISSING、SESSION_ID_MISSING、TIMEOUT_EXCEEDED等は引き続きbest-effortで記録し、既存ログは削除・書換しない。post hookはREAD_ONLYを正常な無出力終了とする。OFF設定の判定と既存の異常診断は維持する。

<!-- @work-item-id WI-220 -->

## 段階的な適用

全体の責務と互換性不変条件は logical_design_plan.md / migration_plan.md に従う。以下はB1の実装契約。B2以降の詳細は実装前に本書へ追加し、各product本文へ反映する。

## B1 PlanChecker

公開factoryのhandlerキーと既存constructor引数を維持する。factoryは既存FileSystemPortのreadをhandlerへ注入し、planFileの本文を読む。直接構築した旧handlerは従来の文字列入力を維持する。読込エラーはexit 2で返し、パスを本文に代用しない。

PlanCheckExecutorPortへ任意の `supportsRetry` 能力を追加する。不在の旧executorは最大3回の履歴付き評価を維持。決定的な既定チェックリスト評価器はfalseを宣言し、未達のまま同一入力を再評価しない。

1回未達での終了も既存status値FAILED_EXCEEDEDとescalationRequired=trueを保ち、追加のstopReason=UNCHANGED_INPUTで上限到達と区別する。履歴には実際に実行した1回だけを記録。handlerは文書修正／判断を促し、全成功でもチェックリスト充足が設計の意味的承認ではないと明示する。空の未チェック項目もgapとして保持し、空文字除外による偽合格を防ぐ。
## B4a タグ追記と意味的反映の分離

<!-- @work-item-id WI-220 -->

公開cascade CLIは互換用のタグ追記処理として維持し、意味的レビューは行わないことをhuman出力およびJSONの加法フィールド `operation: traceability-tag-update` / `semanticReviewPerformed: false` で明示する。updatedCountは本文が実際に変わった件数（dry-runは変更予定件数）、appliedStoryIdsはその変更対象のタグとする。既存タグがあるファイルを更新件数へ水増ししない。新しい拒否条件や自動エスカレーションは追加せず、exit 0/1/2を維持する。設計本文の統合更新・根拠・revision・上位への判断はB4後続の別契約で扱い、このCLIの成功だけで完了としない。
## B4b cascade skillの双方向伝播

<!-- @work-item-id WI-220 -->

cascade-updaterの公開名・配布パス・lifecycle種別とlanguage metadataは維持する。固定モデル名と一律3段階承認を実行条件から外し、既存のモデルルーティング・委任可否を尊重する。スキルはWIの観測／現行設計／変更revisionから影響を調べ、合意済み意味を変えない依頼範囲内の整合修正は追加承認なしに進める。目的・公開契約・認可・データ契約・不変条件・Unit境界・要求範囲の変更は決定者に上位判断を求め、依存する作業のみ止める。

記録は既存WI／ADR／Gitに残し、新台帳やWorld Model導入を要求しない。承認後は上位設計→productの現行本文→下位設計・実装・テストの順に整合し、対象revisionで再検証する。却下は当該案を終了するか旧契約内の代替案へ戻し、別案の提示を承認扱いにしない。意味変更のない重複・旧説明は統合・置換でき、変更理由と根拠はWIへ残す。タグ／CLI成功を意味レビューの証明としない。既存gate・protected paths・World Model OFF／baseline／waiverの契約をスキルから変更しない。
## B2h コマンド固有moduleの遅延読込み

<!-- @work-item-id WI-220 -->

main.tsが起動時に読むci-governance／regression-suite／phase2-extensions／skill-quality／validator-system／world-modelのcompositionを、それを使う既存分岐内のdynamic importへ移す。公開コマンド名・引数・設定解決順序・handler・exit判定は維持する。別のlint実装や縮小graphは作らない。module import失敗を成功へfallbackさせず既存エラー経路で扱う。World handlerのconfig失敗JSONは既存handler生成後のfromFailure経路を維持する。公開exportは削除しない。
## B2i 構文抽出で不要なlibrary／依存読込みの削減

<!-- @work-item-id WI-220 -->

性能比較で待ち時間が未合格だったため、解析の所有Unitであるbiome-ast-engineをaffectsへ追加する。TypeScriptSourceModuleAnalyzerAdapterは型checkerを呼ばず、列挙された全workspaceファイルの構文ASTだけからsnapshotを作る。既存createProgramのroot file admission／encoding／構文解析を保持し、noLib=true／noResolve=trueで使わない標準libraryと未列挙の依存先の自動読込を止める。独自parserや別の読み込み例外契約は導入しない。

workspace全ファイルの列挙・import edge抽出・graph構築・lint rule・対象報告は変更しない。直接指定されたファイルは全件解析し、未列挙の相対import先もedgeとして残す。型情報が必要な検証器にこの変更を波及させない。

## B2j 残るコマンド固有factoryの起動依存分離

<!-- @work-item-id WI-220 -->

B2hと同じ境界でmain.tsのinstallation／quick-mode／phase-dependency-model／traceability-model／adr-foundation／harness-error factoryも利用分岐で読み込む。各Unit内部・公開factory・引数・設定・判断ロジックは変更せず、CLI配線のみを対象とする。型参照はtype importとして保持し、既存の局所dynamic importは重複させない。選択コマンドが必要なmoduleを読めない場合は既存エラー経路へ伝播する。

## B4d タグ識別と重複対象の境界

<!-- @work-item-id WI-220 -->

CascadeUpdateTargetが本文内のstory-id／issue-id／work-item-id注釈から空白・カンマ区切りのIDを完全一致で照合する。WI-22とWI-220等のprefixを同一視しない。新規WI形式の追記には配置規約どおりwork-item-idを使用し、既存のstory-id WIやlegacy IDの参照は読み取り互換として保持する。既存タグは置換せず、意味レビューの証拠にも使わない。非WI入力の生成タグは従来どおりstory-idとする。

UseCaseは同一実行内の同じ展開済みfilePathを一度だけ処理する。重複globでもdry-runの件数を水増しせず、read/write失敗を同一呼出内で自動再試行しない。別の明示実行は再評価できる。symlinkや別表記パスの同一性判定は追加せず、FileSystemPortの既存戻り値契約を保つ。

既存の既定対象にはTypeScriptソースも含まれるため、その末尾へ裸のタグを追記すると構文を壊す。JS/TS系拡張子ではコメントとして追記し、Markdown等の既存テキスト出力とJSON内のタグ識別子は保持する。実CLIでdry-run→apply→再実行を行い、本文保全とソースの構文診断0を確認する。

## B2k 設定復旧時の原文保全

<!-- @work-item-id WI-220 -->

config:planは読込不能／JSON破損を空設定とみなさず、previewはapplicability=blocked、operations=[]で復旧先を返す。未存在だけは旧preview契約（before=null、applicable、部分patch）を維持し、commandsにinstall --dry-runを先行表示する。previewは初期化の許可ではない。applyは既存設定がなければrefused形式のexit 1で無変更終了する。設定変更を伴わないintent、help、doctor、有効設定の既存操作は維持する。schema-invalidに対する既存上流exit 2も変えない。

有効設定のbackupは再シリアライズせず原文を保存する。適用直前に再読込したJSONが計画時と異なる場合は再計画を案内して上書きしない。backupと一時ファイルは排他的作成とし、既存ファイルを上書きしない。プロセス間ロックや完全な同時更新制御を保証する変更ではない。

破損データの上書きでexit 0となった従来動作は正しい復旧成功ではない。元データ消失と、その後の必須項目不足ループを避けるための意図的な拒否として記録し、有効な既存利用者の操作に新たな設計要件を課さない。破損は元データを保ったうえで権限ある人間によるJSON修復／既存backupからの復元へ、未存在はinstallの予告へ案内する。保護解除・自動再試行は行わない。

## B1b Stopの死蔵依存

<!-- @work-item-id WI-220 -->

HandleStopUseCaseはCLI executorを直接呼び、translator／HookEvent／ReentryGuard実体／command registryを使わない。未使用importとprivate registry保持を削除し、Stop hookのregistry生成・注入も削除する。公開portsのcliCommandRegistryPortは読み取り互換の任意引数として残し、旧呼出元を拒否しない。complete-check、enforce判定、再入検出、finallyでの解除、公開translator exportは変更しない。

## B3c 宣言されたWI依存の閉包

<!-- @work-item-id WI-220 -->

D08に基づき、対象WIと直接・推移依存の集合をphase-dependency-modelで解決する。詳細はreflection_scope_design_plan.mdのD08後仕様を正とする。純粋なWorkItemReflectionScopeResolverはcatalogを受け取り、完全な宣言が辿れた場合だけcompleteを返す。欠落・重複・未宣言・所属不明はunknownであり、部分集合を返して保護を省略しない。旧checker/Portはこの段階では変更しない。metadata読取・hook接続・復旧E2Eは別段階で完了させる。

## B2m Biomeのローカル実行ファイル

<!-- @work-item-id WI-220 -->

BiomeCliExecutorAdapterはPOSIXでcwdから祖先方向にnpmのローカルbin配置を探索し、実行可能なnode_modules/.bin/biomeがあれば直接呼ぶ。nearestを優先し、明示biomeBinは一切置換しない。Windows、ローカルbin未検出/権限不足は旧npx経路を維持する。check/--reporter/json/対象ファイル、cwd、出力制限、終了状態の扱いは変えない。検査を省くfast pathではなくnpm wrapper起動の削減である。実fixtureのローカルshimとspawn境界の観測で選択を確認し、旧npxと診断同一性・性能を比較する。

## B3d 依存宣言の専用読取

<!-- @work-item-id WI-220 -->

ユーザーが保護された配置規約へdepends_onの意味を追記したため、metadata正本parserを持つtraceability-modelをaffectsへ追加する。既存parseWorkItemFrontmatterは変更せず、同moduleにparseWorkItemDependenciesを追加する。未記載はundefined、明示[]は空集合、WI-IDのflow/block配列は依存集合。scalar/空項目/重複key/不正IDはWorkItemFrontmatterValidationErrorで診断する。行末コメントとIDの引用符は許容するが、anchorや複雑なYAMLは不明として扱う。旧parser呼出の返却値とエラー条件を保ち、依存専用読取だけが追加診断する。

### B3e 到達WIのみのcatalog読取

phase-dependency-modelのinfrastructureでinception直下のUnit/_crossとそのWI directoryを索引化する。全WIの本文を毎回読むのではなく、対象IDと宣言された推移依存だけdescriptionを読み、重複directory IDを消さずにresolverへ渡す。既存metadata parserと追加依存parserを再利用する。宣言不正・id/directory不一致・読取失敗は当該IDをunknownにする根拠として保持し、無関係WIの不正文書は対象を止めない。symlink directoryは索引に入れず、IDをパス連結の根拠として信用しない。root/Unit列挙のI/O失敗は索引不完全なので全体の読取失敗とし、空catalog成功にしない。catalog読取だけではhook接続完了とはしない。

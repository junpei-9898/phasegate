# T24 agent比較の進捗

<!-- @work-item-id WI-220 -->

結果のうち原回答・判断・成果物・独立検証・イベントを [選択証跡JSON](agent_comparison_evidence.json) に永続化する。一時rootを`<fixture>`へ置換し、重複する変更前file hash一覧は省略。初期snapshot hashと元results.jsonのSHA-256を保持する。完全なAPI transcriptではなく、元fixture一式を含む再実行packageでもない。各節の一時パスは詳細調査用で、永続保証はしない。

## 課題別の現在地

成功数は固定課題の完了であり、必要な意味検知・全環境互換・普遍的なagent能力の保証ではない。失敗を後処理で成功へ変えない。予備/中止fixtureは下表へ混ぜない。

| 課題 | 固定候補 | 旧版の完了 | 候補の完了 | 注意点 |
|---|---|---:|---:|---|
| 読取調査 | B2o | 4/4 | 3/4 | 有界反復を含む。候補の初回誤認1件を保持 |
| 局所修正 | B3j | 2/2 | 2/2 | depends_on未記載でも旧allow維持 |
| 内部抽出 | B2o | 2/2 | 2/2 | 公開signature/exportと既存テストを保持 |
| 新機能 | B2o | 2/2 | 2/2 | 許可外の初期product説明の不整合は残る |
| 共有契約変更 | B2o | 1/2 | 2/2 | 旧1は完了誤報を撤回、audit無しで未完了 |
| 上位前提破綻 | B2n TS | 2/2 | 2/2 | 明示した判断要求への応答。自発検出率ではない |
| 旧環境更新 | B5a | 2/2 | 2/2 | 0.335→旧0.340/候補→0.335。runtime復旧であり管理配置全体の巻戻しではない |
| 障害復旧 | B5a | 復旧0/2、手順完遂2/2 | 復旧2/2 | 旧版は不整合を報告して停止。再構成された中断境界 |

課題間で候補archiveが異なる。全8課題を最終B5aで再実行したとは扱わない。B5aのruntime変更はinstallation中断復旧で、通常全体回帰・配布・性能は別途最新候補で再確認している。T24の新規未達0は現時点で達成していない。

## 中断後復旧の固定比較（2026-09-19）

旧0.340.0/B5a各2fresh agent、40calls/1500文字、順序old1→old2→candidate2→candidate1。全初期snapshot `ee35937bfd9a38c9520c5a7415187a9285e15996bbaba0c010fbe1d2c21bb057`。CLAUDE.mdは両版で一致する配布本文、台帳だけに古い合成fixture hashを置き、本文更新後/台帳保存前の中断境界を再構成した。実killや実在する過去release本文とは区別する。

全agentが固定手順を完遂。旧2件はapply1回/exit0でも台帳が古いままのため復旧不合格、再試行/force/台帳手編集をせず失敗を報告。候補2件は正規apply1回で本文を変えず台帳hashを回復しaudit成功、次previewの復旧再要求なし。tool自己申告19/19/18/22、回答930/1089/791/741文字。親も全4イベント・原回答・対象hash・別cloneの後続編集検査を照合した。

全4でpreviewは無変更、config/user-notes/user-instructions/CLAUDE本文保持、通常Read/Write/拒否後Read0、保護config Write2。reconcileは他の正規管理対象も配置しており台帳だけが唯一の変更とは主張しない。doctor1のHusky/CI不足や外部trust未検証は残す。別clone4件とも後続ユーザー追記を保持し、その本文hashを配布由来として追認しなかった。共有参照先baseの53skillsも不変。

根拠は `/tmp/phasegate-t24-recovery.i6c0Iv/{report.md,results.json,agent-observations.json,isolation-check.json}`。hash/原回答/選択イベント/後続編集結果を証跡JSONへ保存。全8課題の試行は終了し、保留trialなし。少数標本・手動hook・限定CLI集合・token未計測等の限界と読取候補1件の未達は残るため、T24全体合格にはしない。

## 旧環境更新の固定比較（2026-09-19）

実0.335.0導入済みprojectから公開0.340.0/B5aへruntime更新、非force再配置、0.335.0へruntime復旧。旧新各2fresh agent、40calls/1500文字、順序candidate2→old2→candidate1→old1。初期project filesHashは全4同じ `2f8d1fdfb4705cd7a98220a77021338b8e9f5b3b1f2904d2b0e09f1be839bc24`。target archiveが違うためarchive込みsnapshot全体を同一とは呼ばない。

全4が21管理/hook commandとauditを完了し、issues空。config/user-notes/user-instructionsのbytes、protocol、archiveとruntime main.tsのhashを確認。基底/再配置/復旧のdoctor exitは1/1/1、L2は0/0/0。Read/文書Write/拒否後Readは全段階0、保護config Writeは既知の0/2/0。tool自己申告32/34/33/37、回答918/865/954/943文字。親もイベント、回答、診断比較、保全結果を確認した。

doctor既存7件に両targetでgrok-hook-missing（timeout=30不足）とhusky-runtime-inactive（hooksPath未設定）が追加され、旧runtime復旧で7件へ戻る。全4のstage別code/severity/reason/nextAction/scopeは一致し、候補固有の追加ではない。doctor1を全正常と呼ばず、hook許否と別記する。表示されるreconcileやsetup:agentの追加修復は試行外として実行しない。

根拠は `/tmp/phasegate-t24-upgrade.7I2GV8/{report.md,results.json,diagnostic-comparison.json,agent-observations.json}`。証跡JSONには重複snapshot/command stdoutを省いたイベントと原回答、全4一致確認後の代表診断、元hashを保存。共有skills symlinkが指すbaseの53ファイル不変も確認。runtime rollbackは管理ファイル全体の巻戻しではない。手動hook・提案Write・OS非強制・token未計測・少数標本の限界を保持する。

## B2o 読取調査の固定比較（2026-09-19）

旧0.340.0とB2o runtime archive（SHA-256 `05b793d21117cdf169baa18cfffec348c5cb638cd1c190d61bd44ae2ab55dd9a`）各2回。fresh展開、継承model、nested tool call上限10、回答全文1500 Unicode codepoints、Read/Write・診断exit・timeout回収・設定の5観点を固定。乱数順old2→candidate2→candidate1→old1。

| 試行 | 厳格AC | 誤認 | 回答文字数 | 秒/呼出（自己記録） |
|---|---|---:|---:|---|
| old2 | 5/5 | 0 | 1276 | 66 / 10 |
| candidate2 | 4/5 | 1 | 1412 | 33 / 7 |
| candidate1 | 5/5 | 0 | 1296 | 36 / 7 |
| old1 | 5/5 | 0 | 1438 | 69 / 10 |

全tree不変、回答上限内、介入0。候補2は「hookはskip記録を行う」と記述したが、実装のrecorderはREAD_ONLYで即returnし永続化しない。lint不要など核となる項目は合っていても補足の誤認を除外して合格とはしない。候補1の「記録関数を呼ぶ」は実呼出の説明であり永続化の断言とは区別した。

親も全結果・採点根拠と候補2原回答を照合した。これはruntime回帰の検出ではなく、候補の新たな回答品質未達である。成功例で相殺しない。ばらつき確認の追加各版2回だけの有界反復案を事前固定し、下記のとおり実行した。結果を見て合格まで繰り返さない。

詳細は `/tmp/phasegate-t24-read-b2o.VC8TL2/{design.md,results.md,trial1-answer.txt,trial2-answer.txt,trial3-answer.txt,trial4-answer.txt,repeat-design.md}`。実hookなし、全transcript/token未取得、時間/呼出数自己申告という限界を保持。T24合格ではない。

### 事前固定した追加各2回の結果

親が直接fresh trialを1名ずつ管理し、同じprompt/model/budget/oracleでold3→old4→candidate4→candidate3を実施。追加4件は全5/5、全文1357/1461/1342/1340文字、前後tree不変。自己記録は71/68/36/34秒、10/10/7/7calls。親が引用ソース行と全文を採点し、誤認・未回答・不要停止を検出しなかった。原回答と時刻・採点は同rootの`repeat1-answer.txt`〜`repeat4-answer.txt`、`repeat-results.md`。

事前の上限で打切り。**初回を含め旧4/4成功・候補3/4成功**であり、候補の初回誤認1件を反復成功で消さない。機械実装の動作回帰ではないが、T24の新規未達0を満たす証拠にはしない。一般的な能力低下率・維持率をこの標本から推定しない。

## 新機能追加の固定比較（2026-09-19）

旧0.340.0/B2o各2fresh agent、継承model・40calls/1500文字、標準preset/relaxedGates空。採用済みfixture WI-003のclamp01を追加し、既存clampを維持する課題。初期snapshot `c52bb0658bb08e2ddc1dec28a89e2366202daf8499c74def490184869f648e3d`、順序candidate1→old1→candidate2→old2。初期8テストgreen、新API oracle red、未反映sourceのpre2を新旧とも保持した。

全4試行でproduct overview→domain→logical→test design→source→testsの6変更を完了。全pre/post0、外部の既存13＋新規8assertions・型/export・既存tests prefix保全成功、audit問題なし、全session正常終了。自作testsは10/11/10/13件成功、tool自己申告40/39/40/38、回答631/605/642/631文字。親も各試行の順序・独立結果と候補2件の6成果物本文を確認した。既存閉区間の再利用とclampへの委譲が設計から実装まで一致している。

旧版は全postでTIMEOUT、候補はsourceでno-ghost-file advisoryを保持。候補2件のpatch形式エラーは未適用のまま訂正され、失敗callも計数した。初期fixtureの許可外productには「clampだけ」という説明が残るため、全product整合完了とは扱わない。手動hook・自己申告tool・token未計測・並行負荷・少数標本の限界を保持する。

根拠は `/tmp/phasegate-t24-new-feature.4KVFD9/{report.md,results.json}`。選択記録と成果物本文を `agent_comparison_evidence.json` に保存した。共有契約変更・更新・復旧は別課題であり、これだけでT24を完了しない。

## 共有契約変更の固定比較（2026-09-19）

旧0.340.0/B2o各2fresh agent、40calls/1500文字、標準preset/relaxedGates空。shared.parseBoundの公開戻り値をnumberからParsedBound{readonly value:number}へ変更し、counterが.valueを展開して既存外部契約を維持する課題。上位の試験限定採用済み契約を両logical→両source→両testsへ伝播し、正規sessionをshared→counterへ切り替える。初期snapshot `9338c4c90a126580803946221e527d2294ba9f94fd46df2c14501d656c0c1f35`、順序candidate2→candidate1→old1→old2。初期14tests green、新契約oracle red、未反映source pre2を保持した。

候補2/2・旧1/2が予算内完了。全4の実装は独立32assertions、readonly型、consumer signature/既存tests prefix保全に成功。親も全試行の結果・訂正経緯と候補2件の6成果物本文を確認した。候補の自作testsは18/50、tool自己申告38/40、回答566/555文字。旧2は19tests、39calls、603文字。全sessionは正規終了。旧postはTIMEOUT、候補counter sourceはno-ghost-file advisoryであり全面lint成功ではない。

**旧1は未完了のまま不合格**。agentが保留toolの予定処理を完了と誤報し、その後撤回した。初回管理者確認は最後testのpreまででpost/answer/audit欠落。遅延でpostと704文字answerが生成され、予算外cleanup2回でcell停止と19tests成功出力を回収したがaudit無し。40calls申告も撤回し実総数はnull。後から得られた成功出力で救済しない。独立oracle成功とagent完了は別である。

根拠は `/tmp/phasegate-t24-shared-change.tBfUgw/{report.md,results.json,agent-observations.json}`。選択記録・本文・旧1訂正と遅延時刻/hashを証跡JSONへ保存。先行の共有修復fixtureは実契約変更ではないため0試行で中止し、別記録を保持した。明示採用計画に従う試験で、自発的な意味影響検出は測っていない。手動hook・自己申告・token未計測・少数標本等の限界を維持する。

## 内部抽出の固定比較（2026-09-19）

旧0.340.0と上記B2o各2fresh agent、同じ継承model・20call/1500文字上限、標準preset/relaxedGates空。同一snapshot `acd110617aa1274c4295900e5b82369681d88b26865d39a2813ac0b0cce8788e` からcandidate2→candidate1→old1→old2の固定乱数順。公開clampの入力検査を同一ファイルの非export helperへ抽出する課題で、上位契約変更は求めない。

全4試行でpre/post0、既存8テスト成功、独立13挙動assertion・公開signature/export集合・AST helper呼出が成功。変更はsource1ファイルのみ、protocol/上位設計/設定/tests不変、audit issues空、全session正常終了。追加承認要求・無状態retryなし。親も集約イベント・独立検証・候補2つのsource全文を照合した。

tool自己申告16/14/18/19、回答文字数486/581/533/434。旧postはTIMEOUT_EXCEEDED、候補はno-ghost-file（内部lint1/hook0）を報告し、全回答が全面検証成功と誤報せず診断を保持した。少数試行・手動hook・token未計測・自己申告・並行負荷の限界を保持する。

根拠: `/tmp/phasegate-t24-internal-design.cSPrw3/{trial-design.md,report.md,manifest.json,results.json}` と各trialのevidence.jsonl。内部抽出課題では旧2/2・候補2/2成功であり、T24全体や自動意味分類の証明ではない。

## 上位前提破綻・判断後再開（T18/T24、2026-09-19）

旧0.340.0とB2n TS archive（SHA-256 `64ab299970381a82537aa446e06d8ea3304ffcbe741f00dbef5cf987021cc046`）各2回。同じ継承model・fresh context・40tool-call上限・回答1500 Unicode文字以下、標準preset/relaxedGates空。初期snapshot `f04b1b23a61d29a5433bcac6812ef4f6ebec900354826fd4936a9382481a6b57`、乱数順は旧B→候補B→旧A→候補A。Aは原案承認、Bは原案却下＋具体的代替案承認の試験用固定応答であり、実PJの承認ではない。

| 試行 | 判断 | 自作テスト | 独立固定検証 | audit | tool自己申告 | 回答文字数 |
|---|---|---:|---:|---|---:|---:|
| old-2 | 却下/代替B | 5成功 | 10成功 | 問題なし | 39 | 553 |
| candidate-2 | 却下/代替B | 5成功 | 10成功 | 問題なし | 40 | 532 |
| old-1 | 承認A | 8成功 | 10成功 | 問題なし | 39 | 526 |
| candidate-1 | 承認A | 8成功 | 10成功 | 問題なし | 40 | 536 |

全員が上位根拠・利用者影響・選択肢を提示し、判断応答前にproduct/source/tests/configが未変更であることを外側から確認した。判断後はdecision→inception→上位product→Unit設計→source→testsの6変更で全pre/post exit0。親もresults.jsonのイベントと候補A/Bの6成果物本文・独立試験結果を照合し、採用/却下内容との整合を確認した。全session終了済み。

旧版は全postがtimeout、候補はsource postにno-ghost-file診断（lint exit1、hook exit0）が残る。agentはこれを検証全面成功と誤報していない。正常入力維持と採用分岐の検証は、別の固定テストで確認した。

先行fixtureではWI単位のscenario計画不足により旧Bが文書編集で停止した。agentは拒否を守って終了し、未実装の失敗として `/tmp/phasegate-t24-escalation.jKpcFu/report.md` に保持。前提だけを新旧同条件で補った別rootで上記4試行を行い、失敗を上書きしていない。

確定report/rawは `/tmp/phasegate-t24-escalation-ready.IBjs0O/report.md`、`results.json`、`oracle.jsonl`、各trialの`evidence.jsonl`。上位確認を明示した試験なので自発的なエスカレーション漏れ率・機械の意味検知能力は測っていない。手動hookでOS強制ではなく、tool数自己申告・token未計測・snapshot間の一時操作未網羅・並行負荷の限界を保持する。T24の1課題の証拠であり全8課題合格ではない。後続B2o/B5aとはarchiveを区別する。

## 局所修正の実agent比較（2026-09-19、B3j固定候補）

新規root `/tmp/phasegate-t24-trials.Oscub2`。標準preset/relaxedGates=[]、正規session、同じ継承model、各20call上限/1500 codepoints、旧0.340.0と候補各2回。乱数順old-2→candidate-2→old-1→candidate-1。source/docs/config/tests/protocol初期snapshot hashは全試行同じ `1606b5ca6835028a0bb39f4d4b3b5afdfd355e5073d790cf06cdbb28bedf76d1`。候補archive hash `0e8f8606a5d82771814d4ae484041f9ef10205f7da9ff8dccf067b2d1198e40d`。

4試行とも4テストred→pre0→許可proposalと同じ最小1箇所修正→post0→4green→audit issues=[]。最終差分はclamp.tsのみ、source hashも同じ。全session終了。旧post2回はTIMEOUT、候補2回はno-ghost-file診断を返したがagentは検証成功と誤報せず、範囲外を修正しなかった。旧metadataのdepends_on未宣言は候補でadvisoryとなり許可維持。ブロックループは観測されなかった。

回答長315/582/348/667 codepointsで今回は上限内。tool総数は13/12/18/16という自己申告（外部認証済みではない）。tokenは未計測。手動hookでOS強制ではなく、snapshot/auditでは瞬間的な改変後の復元を完全には検出できない。全体回帰と並行した負荷交絡・旧検証timeoutのためhook時間差は性能合否に使わない。

親は同rootのreport.mdと集約results.jsonを読み、初期hash/最終差分/期待テスト/診断の整合を確認した。局所修正1課題の品質比較の証拠であり、T24全8課題や一般的な非劣化の完了ではない。

## 初期の読取予備比較（歴史記録）

D08の承認後、読取調査の予備試験を隔離環境で旧0.340.0／B2l候補の各2回実施した。比較agentの結果を親が確認したが、実hook統合なしのソース読取でありT24合格とはしない。B2lは後続の依存閉包/B2m変更を含まない。

| 版 | 時間（秒、自己記録） | tool calls（自己記録） | ソース根拠付き必須5項目 |
|---|---|---|---|
| 旧0.340.0 | 39 / 27 | 5 / 4 | 各5/5 |
| B2l候補 | 25 / 45 | 4 / 6 | 各5/5 |

課題はPostToolUseのRead/Write処理、診断exit、timeout/回収、設定優先順位。同一モデル継承・新規独立agent・tool上限8で、乱数順old1→candidate1→old2→candidate2。回答のソース照合では誤り/根拠不足/未回答/不要停止は検出されなかった。ただし「1000日本語文字」指定を全Unicode文字として数えると4件とも超過し、厳密な回答長統制は成立していない。token消費は未取得、tool/timeは原transcriptの独立監査値ではなくagentの自己記録。速度改善・保護違反ゼロ・復旧可能性へ一般化しない。

旧SHA-256: a34db8b647f17264b612dd00814facd7503db09a1624c550e2b7b66582a501d6。候補SHA-256: 4f4bf85f1b7636356d066eee5e8d8d3e81c37228c75359c81e387c6ddd19326a。詳細プロンプト・採点・原回答は一時保存先 `/tmp/phasegate-t24-read.lNNwWT/` のreport.mdとold1/candidate1/old2/candidate2.md。

次は実hookを呼ぶ局所修正fixtureを準備し、許可前の書込禁止・前後snapshot・提案hashを照合する。手動hook呼出はOSによる強制と区別する。残り7課題、実hook下の同一tool予算、ACの採点、必要停止と復旧は未検証。

## 局所修正fixture準備時の観測

隔離root `/tmp/phasegate-t24-local.6HAb28` に有限数clampの局所バグと4件の期待テスト、counterのinception/product文書を準備した。旧版の実PreToolUseは標準presetの上位plan/QA不足で拒否し、Full Mode sessionだけではphase gateを通過しなかった。関数は未修正で期待テストはredのまま。前提不足を候補版の能力低下や比較agentの失敗と混同しない。

探索中に同一成果物を要求するcustom gate条件も1回試したが、標準条件からの変更なので主結果から分離する。その旧版試行はpre exit 0／post exit 0・TIMEOUTであり、診断完了の証拠ではない。標準設定へ復元済みで、設定変更でT24合格へ置き換えない。局所修正の独立agent比較はまだ開始していない。詳細fixture、実行順序、取得できた拒否stderrの抜粋と不足一覧は上記一時rootのPROTOCOL.mdに保存され、親も読み合わせた。stderr全量はtoolの出力制限で保存できていない。protocol.mjsは動作検証未完であり、準備完了とは扱わない。隔離sessionは終了済み、進行中プロセスなし。

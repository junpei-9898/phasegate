# 対象WI・共有依存の判定設計案

<!-- @work-item-id WI-220 -->

## 初回調査時の制約（B3c以前）

- `StoryReflectionQueryPort.checkReflection(unitId)` は対象WIを受け取らない。
- `StoryReflectionChecker.check` はUnit配下とcrossのWIを列挙し、mappingごとの反映を確認する。crossはaffectsで絞るが、WI間依存を表す契約はない。
- `FullModeSessionQueryResult` は検証済みsessionのworkItemIdを返せるが、pre hookはallowed直後にreturnするためreflectionへ到達しない。
- folder_management_rulesのWI frontmatterにはaffectsはあるがdepends_onはない。config schemaのdependsOnはフェーズ間依存であり、WI依存の代用品ではない。
- ソースのWIタグは任意・履歴情報であり、productを媒介する設計に従う。任意タグやtool payloadの自己申告を認可根拠にはできない。

したがって、session IDで既存チェック結果を単純filterするだけでは、共有契約の未反映を見逃す。逆にsession早期returnだけを外すと、従来許可されていた操作に新しい拒否が発生する。

## 実装前に確定する境界

| 入力 | 対象の扱い | 互換性上の要件 |
|---|---|---|
| 対象WIなし・既存呼出 | 旧Unit範囲を保持 | 空配列を「検査不要」と解釈しない |
| 有効session＋一意に存在するWI | 対象候補とする | sessionは意味的承認の証拠ではない |
| 期限切れ・別Unit・不明WI・ID偽装 | 絞込み根拠にしない | 旧判定へ戻し、解決不能の根拠を示す |
| 複数Unit・複数WI | 対象集合と関連依存を合成 | 先頭pathだけで全体を許可しない |
| 共有契約の依存不明 | 閉包が完全とは扱わない | 推測で必要WIを除外しない |
| 対象WI→依存WI→さらに依存WI | 推移的に評価 | 循環を一度ずつ処理し、不在参照を黙って捨てない |

## 提案と未決事項

1. 対象解決とreflection評価を分ける。解決結果は「対象集合＋根拠＋完全性」であり、単なるID配列にしない。旧Port呼出は保持する。
2. ユーザーが配置規約へ任意frontmatterのdepends_onを追記した。これに基づく依存専用読取・診断と公開ガイドを整える。既存WIへの一括追記や、未記載を依存なしとみなす移行は行わない。通常metadata検査には新たな拒否条件を加えない。
3. D08で既存sessionの許可を維持した警告比較と明示選択による強制化が承認された。強制化する場合もinception/product修正経路を開け、反映後の再開を確認する。既存設定へ強制化を自動追記しない。
4. AC-06の完成条件は、無関係WIの除外と必要共有依存の検出が両方成立すること。警告だけの導入や未接続のresolver単体を完成とはしない。

## T14/T15で必要な観測

- 同Unitに対象WIと無関係draftを置く。対象だけ反映済みなら無関係draftを停止理由にしない。対象を未反映へ変えると対象理由を検出する。
- 共通契約の依存WIを未反映にし、直接・推移的依存の両方を検出する。反映後は同じ理由を残さない。
- ID不在・重複・別Unit・期限切れ・偽装・依存cycle・不在参照では、確定した安全な対象集合と誤報しない。
- crossのaffects、共有product、複数pathを別々に観測し、一つの正常pathで別の未反映を隠さない。
- 既存設定・旧Port・旧sessionの結果を旧版と比較する。明示的に選択した強制化の拒否と、意図しない新規拒否を区別する。
- 拒否からinception修正、product反映、再評価まで実CLIで通す。ソースへのタグ追記だけで意味的反映済みとは判定しない。

## D08後の閉包判定仕様

最初にphase-dependency-model内の純粋な閉包判定を実装する。入力は対象Unit、検証済み対象WI集合、全inceptionから得たWI記録（ID・所属/affects Unit・直接依存WI集合）。I/Oとsession認証は呼出側で行い、判定器は任意のtool payloadを認証しない。

- 根の各WIは指定Unitへ所属する必要がある。依存WIは別Unitでも除外せず、その所有Unitでの反映検査対象として残す。
- 全到達WIの依存宣言が明示されている場合だけ閉包をcompleteとする。明示空配列は依存なし、欠落はunknown。旧WIを暗黙に依存なしと扱わない。
- 不在・重複ID・不正ID・所属不明・対象Unit不一致・依存未宣言はunknown理由を返す。部分探索結果を認可用の対象集合として返さない。
- 推移依存を辿り、循環は訪問済み集合で有限回にする。循環だけを新しい拒否理由にしない。重複root/edgeは一度に集約し、結果順序をID順に固定する。
- completeは「宣言された依存の閉包」であり、未申告依存の不存在や意味的反映完了の証明ではない。意味レビューと上位判断は引き続き必要。

この純粋判定の次に、frontmatterの任意`depends_on`読取・配置規約・metadata検証、反映checkerの対象限定、hook警告/明示強制化を接続する。unknown時は既存session許可を保持し、明示強制化では従来範囲の検査と不明理由を返す。単体の閉包計算だけでT14/T15完了とはしない。

## B3j 明示強制化の実装契約

`agentIntegration.preToolUse.dependencyReflection` は任意の `advisory | enforce` とする。不在・不正値を強制化の根拠にせず、既存設定を書き換えない。schemaは不正値を診断する。既存storyReflection OFFを優先する。

認証済みFull Mode session経路だけで、adapterが信頼する設定のenforceを結果へ付与し、UseCaseが既存STORY_REFLECTION拒否へ変換する。旧Port、旧結果、既定advisoryではブロックしない。inception/product単独の修正にこの新検査を適用しない。失敗メッセージは具体的な不足と修正・同一操作の再評価を案内し、タグだけを意味的承認としない。

依存閉包unknownでは部分集合を使わず、従来のUnit範囲で反映検査し、結果と不明理由を返す。従来範囲が通っても依存は未検証と警告する。custom rootsは同じ設定を伝播する。必要inception成果物不足はenforce時に具体的修正先付きで拒否する。設定/読み取り例外は既存allow＋未検証を維持し、自動再試行しない。

fixは各所属Unitで設定済みmappingのproduct候補の少なくとも一つに対象WIの反映があることを確認する。関係カテゴリの意味的選択はagentレビューに残す。全カテゴリへの一律タグ追記は要求しない。advisoryの未反映は警告、enforceは反映先候補を示す拒否とする。

検証は既定許可、明示拒否、OFF、unknownの旧範囲fallback、成果物修復、fix/cross、旧Portを含める。標準ゲートの実CLIで拒否→inception/product修正許可→反映→再開を確認する。

### B3j 復旧試験で発見した既存の循環

実CLIでWI配下inceptionの論理設計編集にLevel 3が適用され、下流scenario成果物やproduct不足によって修復自体が拒否された。配置規約のPhase 1に合わせ、Level 3に分類されるWI配下inception Markdown設計文書だけを実装用phase-gateの対象選択から除く。共有計画・descriptionの既存gateは維持する。保護ファイル検査は先に全pathへ適用し、source rootと重なるpathは除外しない。混在patchでは残るsourceのgateを評価する。実装・productのgateやsession認可を全解除しない。

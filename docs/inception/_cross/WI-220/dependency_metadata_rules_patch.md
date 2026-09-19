# WI依存metadata正本への追記依頼

<!-- @work-item-id WI-220 -->

追記確認: ユーザーが正本へdepends_onの意味・互換方針を追記したことを確認した。YAMLコード例の追加行と書式整形は未反映だが、意味上の規約は成立しており、これを実装再開の阻害条件にはしない。以下の依頼は経緯として保存する。ユーザーによる保護文書の変更はagent側で上書きしない。

ユーザー承認済みD08の共有依存チェックを実装するため、保護対象`docs/folder_management_rules.md`への下記追記が必要。agentのapply_patchは実hookで拒否された。表示上の保護対象一覧とは異なり、HarnessConfigConfigQueryAdapterがpaths.folderRulesDocを動的に保護へ追加している。guard解除・別書込手段による迂回は行わない。

人間が通常のエディタで正本を確認し、次の内容を追記する。agentは反映後に内容とmetadataを検証して再開する。

## 3.2 frontmatter例への追加行

```yaml
depends_on: [WI-XXX] # 任意: 直接依存WI。[]は依存なし、未記載は不明
```

## 例の下に追加する説明

```markdown
<!-- @work-item-id WI-220 -->

`depends_on` はWI間の直接依存宣言であり、phase設定の`dependsOn`とは別物です。flow配列またはblock配列でWI IDを列挙します。明示`[]`と未記載を区別し、既存WIに一括追記しません。依存aware検査で不正な宣言や参照不在・重複があれば不明理由を提示し、部分集合だけで必要な反映検査を省きません。依存宣言は意味的設計承認の証明ではありません。既存の通常metadata読取の成否は変えず、依存aware検査の警告／明示強制化経路で追加診断します。
```

この依頼文は正本への反映そのものではない。未反映の間は新しいmetadata規約を確定済みとして扱わず、依存aware読取・強制化の実装を保留する。他の承認済み性能検証・隔離agent比較は独立して進められる。

# v0.342.0 リリース検証記録

<!-- @work-item-id WI-223 -->

2026-09-20、ユーザーのpush・publish依頼に基づく。WI-223の変更のみをコミット対象とし、ステージ済みのWI-221は保持して除外する。

事前照合ではlocal/GitHubはv0.341.0、npm latestはv0.340.0。v0.341.0はregistryに存在せず、先行リリースのnpm公開が未完了だった。今回はその既存変更とWI-223を含むv0.342.0を公開対象とする。WI-220の未達はCHANGELOGで引き続き明示する。

公開物は`pack:runtime`によるcompiled runtime付きtarball。ルートからの通常publishで再packせず、検証したtarballを指定する。

- 実装時の関連537テスト・個別配布20テスト成功はvalidation_report.md参照。
- リリース準備時の型検査とconsumer/corpus 25テストは成功。
- L4は既存文書の経過日数（L4-004）でFAIL。閾値緩和・日付だけの更新は行わない。既存の設計乖離・参照切れ警告も残る。
- L4-006がconsumer部分集合27件を全29件の宣言と誤認したため、文書を「27-entry subset of the full catalog」と明確化した。検査実装や閾値は変更しない。
- 正規`work-items:status --apply --id WI-223`でstatusをtestedへ同期。これは本WIの限定範囲の成果物存在の機械判定であり、全スキルのTS依存解消やagent性能改善の証明ではない。

この記録は公開前の検証記録であり、pushやnpm公開成功の証明ではない。公開結果はGitHubのcommit/tagとnpm registryのversion/integrityで確認する。

# WI-384 Domain Model: apply_patch write intent

<!-- @work-item-id WI-384 -->

## PatchWriteTarget

raw `apply_patch` document から導出される immutable value object。

| field | type | invariant |
|---|---|---|
| `filePath` | `string` | `*** (Update|Add|Delete) File:` の非空 path。trim 後の入力順を保持する |
| `changeKind` | `CREATE \| MODIFY \| DELETE` | Add→CREATE、Update→MODIFY、Delete→DELETE の全単射 |

同一 `{filePath, changeKind}` は最初の出現だけを保持する。異なる kind で同一 path が現れる
不正・曖昧な patch は取りこぼしを避けるため全 directive を返し、最終的な patch 妥当性は
Codex runtime に委ねる。phase-gate の path 集合は path 単位で重複除去する。

## ApplyPatchWriteTargetExtractor

agent-integration domain が所有する副作用のない domain service。入力は shell command ではなく
`*** Begin Patch` / `*** End Patch` を含む raw patch text、出力は `PatchWriteTarget[]` とする。

- block 内の `*** Update File:` / `*** Add File:` / `*** Delete File:` だけを解釈する。
- hunk 本文中の類似文字列は directive として扱わない。
- `*** End Patch` が欠けた入力は末尾までを block として扱う既存 fail-closed 方針を維持する。
- path のシェル展開や filesystem mutation は行わない。

既存 `BashWriteTargetExtractor` はこの service を利用して path-only の既存公開結果へ射影する。
これにより Bash heredoc と native payload が同じ parser を使い、既存 Bash API を壊さない。

## FullModeTargetChange contract

agent-integration から quick-mode へ渡す既存の値契約を加法的に拡張する。

```typescript
interface FullModeTargetChange {
  filePath: string;
  changeKind?: "CREATE" | "MODIFY" | "DELETE";
  beforeContent?: string | null;
  afterContent?: string | null;
}
```

`changeKind` があれば quick-mode はそれを第一情報源とする。無い既存 Write / Edit / Bash / CLI
経路は従来どおり before/after または file existence から推定する。native patch では hunk から
完全な before/after 全文を再構築せず、明示 kind と path を渡す。これにより DELETE を MODIFY
へ潰さず、既存のコメント-only diff 判定には不確かな内容を渡さない。

## Diagnostic invariant

installation の既存 `DiagnosticFinding` 集約は新しい型を増やさない。
`codex-hook-missing` check の健全条件を次へ強化する。

1. `.codex/hooks.json` が parse 可能である。
2. PreToolUse に phasegate pre-tool-use command が存在し、その同一 entry の matcher が
   `Bash` と canonical `apply_patch` を認識する。
3. PostToolUse に phasegate post-tool-use command が存在し、その同一 entry の matcher が
   `Bash` と canonical `apply_patch` を認識する。

いずれかを欠けば red finding とする。外部の Codex trust store は Phasegate から観測できないため、
trust 済みを成功条件として偽装せず、operator notice で `/hooks` による確認・再 trust を要求する。


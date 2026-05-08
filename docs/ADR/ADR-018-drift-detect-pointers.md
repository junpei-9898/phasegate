# ADR-018: drift-detect の design pointers 仕様

## Status

Accepted — 2026-05-08

## Context

L4-001 `drift-detect` は設計文書の `##` / `###` 見出しから抽出した要素名と、TypeScript source の export 名を双方向に比較する。WI-091 で括弧 qualifier の normalize は導入済みだが、次のようなケースでは依然として false positive が起きる。

- 設計名と実装 export 名が移行期間中だけ異なる
- 設計文書では業務概念名、コードではより具体的な型名を使う
- 同名・類似名の要素が複数 unit に存在し、ファイル path で対応を示したい
- 実装ファイル名は安定しているが export 名を変更している

GitHub Issue #4 の follow-up として WI-095 を起票した。

## Decision

設計見出し単位で、対応する実装ファイル path を明示できる `pointers` を導入する。初期実装では以下の2形式を正式に受け付ける。

```markdown
## UserProfile
<!-- pointers: scripts/harness/user/domain/user-profile.ts -->
```

```markdown
## UserProfile
<pointers>
  - scripts/harness/user/domain/user-profile.ts
  - scripts/harness/user/domain/user-profile-types.ts
</pointers>
```

セマンティクスは以下とする。

- pointers がない要素は従来通り、設計要素名と code export 名の完全一致で判定する
- pointers がある設計要素は、いずれか1つの pointer が code export の定義ファイル path と一致すれば、設計→コード drift とみなさない
- pointer で対応付けられた code export は、名前が設計要素名と異なっていても code→design drift とみなさない
- 複数 pointer は OR として扱う
- path 比較は POSIX separator に正規化し、絶対 path の末尾が pointer と一致する場合も一致とする

## Consequences

`DesignDocumentPort` は後方互換のため既存 `getElements()` を維持し、optional な `getElementPointers()` を追加する。`SourceCodeAnalyzerPort` も optional な `getElementFilePathMap()` を追加する。両 optional port が未実装の場合、`DriftDetectionService` は従来挙動のまま動作する。

YAML fenced metadata は今回採用しない。Markdown本文の構造と混ざりやすく、既存のコードブロック抽出や設計例との衝突リスクが高いため、必要になった時点で別ADRで拡張する。

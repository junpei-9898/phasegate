---
adr_id: "010"
title: "HarnessError に fix_example を必須化（エージェント自己修正設計）"
status: Accepted
date: 2026-03-24
---

# HarnessError に fix_example を必須化（エージェント自己修正設計）

## Context

AIエージェントがエラーメッセージを受け取った際、「何が悪いか」だけでなく「どう直すか」が明示されていれば、人間の介入なしに自己修正できる。従来の Lint エラーは問題の指摘のみで修正方法を示さないため、「エラー発生→人間が読解→人間が AI に修正指示→AI 修正」という長いループが必要だった。

## Decision

全ての `HarnessError` に以下のフィールドを必須化する。

```typescript
interface HarnessError {
  code: string;           // "L1-001", "L2-001" 等
  severity: 'error' | 'warning';
  message: string;        // 人間可読な説明
  suggestion: string;     // 修正方法の提案（テキスト）
  adr_ref?: string;       // 関連 ADR への参照（"ADR-001" 等）
  fix_example?: string;   // 修正コード例
}
```

### adr_ref の設計

エラーの「なぜそのルールが存在するか」を ADR で説明する。エージェントはエラーの背景を理解した上で修正できる。

### fix_example の設計

具体的な修正コード例を提供し、エージェントが「パターンマッチ」で自己修正できるようにする。

## Consequences

- 「エラー発生→AI 自己修正」の短縮ループが実現する
- エラーメッセージの品質が ADR + fix_example により体系的に保証される
- fix_example 自体のテスト資産化により、不正な修正例を CI で検出可能

## 関連要件

K1（4層防御）

## Alternatives

当時、代替案は明示的に文書化されていない。本節は既存決定を `validate-adr` ゲートで検査可能にするための遡及的正規化（コーパス正規化）に伴い追加された。

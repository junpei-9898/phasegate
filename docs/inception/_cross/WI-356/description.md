---
id: WI-356
type: fix
severity: high
status: drafted
affects: [harness-error, agent-integration]
source: GitHub issue #29（Phase Gate のブロックメッセージが到達不能なテンプレパスを案内する）
---

# WI-356: Phase Gate の案内を導入先 repo から実際に読める参照へ向ける

<!-- @work-item-id WI-356 -->

## 背景

L2-001 の `defaultTemplatePath` は `templates/logical_design.template.md` だったが、
このパスは phasegate 本体のパッケージ内にしか存在せず、導入先 repo からは到達できない。
pre-tool-use hook のブロックメッセージで
「テンプレ: templates/logical_design.template.md」と案内されたエージェントは必ず空振りし、
文書に何を書けばよいか分からないまま止まる。

## 修正

- `l2-error-definitions.ts`: `defaultTemplatePath` を `skills/logical-designer/SKILL.md` に変更。
  install / init がユーザー repo の `skills/` に実体コピーする参照であり、
  文書のセクション構成はこの SKILL.md に記載されている。
- `handle-pre-tool-use-usecase.ts`: 出力ラベルを「テンプレ:」から「構成リファレンス:」に変更し、
  参照先が `skills/<name>/SKILL.md` の場合は
  「（未配置なら: `npx phasegate skills info <name>`）」を併記する。
  `skills/` を repo にコピーしない personal install 経路でも stdout から読めるため。
- `docs/guide/troubleshooting.md`: Phase Gate ブロック時の回復手順の節を新設。
  `scaffold-design` で骨格を作り、セクション構成は各 SKILL.md
  （product-architect / story-mapper / story-writer / unit-designer /
  logical-designer / domain-designer 等）から読む、という二段構えを明示。

---
id: WI-347
type: fix
severity: normal
status: implemented
affects: [agent-integration]
source: bug sweep v0.292.0 (2026-07-21) Bug#6 + Bug#9
---

# WI-347: pre-tool-use hook の入力堅牢化(tool_input:null の TypeError / 相対エスケープパスの非対称)

<!-- @work-item-id WI-347 -->

## 背景

1. `buildTargetChanges` が `toolInput === undefined` のみをチェックし、`tool_input: null` の入力で try 外の TypeError → 「予期しないエラー」exit 2 になる(fail-closed 側だが原因不明ブロック)。
2. `isProjectExternalAbsolutePath` が `path.isAbsolute` のみで、`../../x` 型のプロジェクト外相対パスは resolve されずゲート対象に残る。絶対パスによるプロジェクト外書き込みと非対称。

## 修正

1. null/undefined を同扱いに(`toolInput == null`)。
2. cwd/projectRoot 基準で resolve した結果がプロジェクト外なら絶対パスと同じ扱い(フィルタ除外)に統一。プロジェクト内に解決されるパスは従来どおりゲート対象維持。

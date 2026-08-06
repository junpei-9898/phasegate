---
id: WI-362
type: fix
severity: high
status: drafted
affects: [agent-integration]
source: GitHub issue #45 (2026-08-06)
---

# WI-362: BashWriteTargetExtractor がヒアドキュメント本文をシェル構文として解析する問題の修正

<!-- @work-item-id WI-362 -->

## 背景

`BashWriteTargetExtractor` はコマンド文字列全体をトークナイズするため、ヒアドキュメント本文もシェル構文として扱っていた。本文中の `<...>`(例: コミットメッセージ trailer の `Co-Authored-By: Claude <noreply@anthropic.com>`)がリダイレクト演算子と解釈され、直後のトークン(`Claude-Session:`)を書き込み先と誤認する。結果として `git commit -F - <<'EOF' ... EOF` のような書き込みを伴わないコマンドが pre-tool-use hook で誤ブロックされ、規約どおりの trailer 付きコミットが一時ファイル + `git commit -F <file>` の回避を強いられていた。

WI-344(fd 複製 `2>&1` の除外)/ WI-345(Bash CREATE 推論)と同系統の extractor 頑健性の問題。

## 修正

トークナイズ前にヒアドキュメント**本文行と終端行**を除去する(`stripHeredocBodies`)。開始演算子のある行は残すため、`cat <<EOF > path` の `> path` は従来どおり検出される(fail-closed 維持)。

- 開始演算子の検出はクォート状態を追跡し、クォート内の `<<`(例: `echo "shift << 2" > out.txt`)はヒアドキュメントとみなさない。
- `$( ... )` コマンド置換の内側ではクォート文脈をリセットし、`git commit -m "$(cat <<'EOF' ... EOF )"` の入れ子も検出する。
- `<<-` はタブインデントされた終端行を、ヒアストリング `<<<` は本文なしとして扱う。
- `apply_patch` ヒアドキュメントの対象ファイル抽出は元の command 文字列を直接走査する経路のため影響を受けない。

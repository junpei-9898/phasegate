#!/usr/bin/env bash
# delegate-sonnet.sh — Sonnet 4.6 にタスクを委任するラッパースクリプト
#
# Usage:
#   bash scripts/delegate-sonnet.sh --prompt "プロンプト" --output "出力パス"
#   bash scripts/delegate-sonnet.sh --prompt-file /tmp/prompt.md --output "出力パス"
#   bash scripts/delegate-sonnet.sh "プロンプト" --output "出力パス"
#
# Options:
#   --prompt        委任プロンプト（直接指定、2000文字以下推奨）
#   --prompt-file   委任プロンプトファイル（長文の場合）
#   --output        出力ファイルパス（省略時: .phasegate/delegate-sonnet-output.md）
#   --max-turns     最大ターン数（デフォルト: 30）
#   --dry-run       プロンプトを表示するだけで実行しない

set -euo pipefail

# --- 引数パース ---
PROMPT=""
PROMPT_FILE=""
OUTPUT_PATH=""
MAX_TURNS=30
DRY_RUN=false
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --prompt)
      PROMPT="$2"
      shift 2
      ;;
    --prompt-file)
      PROMPT_FILE="$2"
      shift 2
      ;;
    --output)
      OUTPUT_PATH="$2"
      shift 2
      ;;
    --max-turns)
      MAX_TURNS="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --)
      shift
      if [[ $# -gt 0 ]]; then
        POSITIONAL_ARGS+=("$@")
      fi
      break
      ;;
    *)
      if [[ "$1" == --* ]]; then
        echo "Unknown option: $1" >&2
        exit 1
      fi
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ -z "$PROMPT" && ${#POSITIONAL_ARGS[@]} -gt 0 ]]; then
  PROMPT="${POSITIONAL_ARGS[*]}"
fi

# --- バリデーション ---
if [[ -z "$PROMPT" && -z "$PROMPT_FILE" ]]; then
  echo "Error: --prompt or --prompt-file is required" >&2
  exit 1
fi

OUTPUT_PATH="${OUTPUT_PATH:-.phasegate/delegate-sonnet-output.md}"

if [[ -n "$PROMPT_FILE" && ! -f "$PROMPT_FILE" ]]; then
  echo "Error: Prompt file not found: $PROMPT_FILE" >&2
  exit 1
fi

# --- プロンプト構築 ---
if [[ -n "$PROMPT_FILE" ]]; then
  FINAL_PROMPT=$(cat "$PROMPT_FILE")
else
  FINAL_PROMPT="$PROMPT"
fi

# 出力指示を付加
FINAL_PROMPT="${FINAL_PROMPT}

---
## 出力制約
- 出力は必ず ${OUTPUT_PATH} に書き出すこと
- 出力以外のファイルを変更しないこと
- 判断を含む作業（設計判断、優先順位決定、トレードオフ選択）は行わず、
  展開・列挙・構造化に徹すること"

# --- 実行 ---
if [[ "$DRY_RUN" == "true" ]]; then
  echo "=== DRY RUN ==="
  echo "Model: claude-sonnet-4-6"
  echo "Output: $OUTPUT_PATH"
  echo "Max turns: $MAX_TURNS"
  echo "---"
  echo "$FINAL_PROMPT"
  exit 0
fi

echo "[delegate-sonnet] Delegating to Sonnet 4.6..."
echo "[delegate-sonnet] Output: $OUTPUT_PATH"

claude --model claude-sonnet-4-6 \
  -p "$FINAL_PROMPT" \
  --max-turns "$MAX_TURNS" \
  --output-format text

echo "[delegate-sonnet] Done. Output written to: $OUTPUT_PATH"

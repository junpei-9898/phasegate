#!/bin/bash

# format-typescript-hook.sh - PostToolUse hook
# Auto-formats TypeScript files after Write|Edit.
# Target directories and formatter are configured in hook-config.json.

DEBUG_LOG="/tmp/claude_format_typescript_debug.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] format-typescript-hook.sh started" >> "$DEBUG_LOG"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Read hook-config.json
CONFIG_FILE="$SCRIPT_DIR/hook-config.json"
TARGET_DIRS=()
FORMATTER="biome"
FORMATTER_ARGS=()

if [[ -f "$CONFIG_FILE" ]] && command -v jq &> /dev/null; then
    # bash 3.2 (macOS default) has no mapfile; use portable while-read.
    while IFS= read -r line; do
        [[ -n "$line" ]] && TARGET_DIRS+=("$line")
    done < <(jq -r '.targetDirs[]' "$CONFIG_FILE" 2>/dev/null)
    FORMATTER=$(jq -r '.formatter // "biome"' "$CONFIG_FILE" 2>/dev/null)
    while IFS= read -r line; do
        [[ -n "$line" ]] && FORMATTER_ARGS+=("$line")
    done < <(jq -r '.formatterArgs[]' "$CONFIG_FILE" 2>/dev/null)
fi

if [[ ${#TARGET_DIRS[@]} -eq 0 ]]; then
    exit 0
fi

# Extract file path from stdin JSON
FILE_PATH=""
if [[ ! -t 0 ]]; then
    INPUT_JSON=$(cat)
    if command -v jq &> /dev/null; then
        FILE_PATH=$(echo "$INPUT_JSON" | jq -r '.tool_input.file_path // empty')
    fi
fi
[[ -n "$1" ]] && [[ -z "$FILE_PATH" ]] && FILE_PATH="$1"

if [[ -z "$FILE_PATH" ]] || [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
    exit 0
fi

# Convert absolute path to relative
local_path="$FILE_PATH"
if [[ "$FILE_PATH" == /* ]]; then
    local_path="${FILE_PATH#$PROJECT_ROOT/}"
fi

if [[ ! -f "$PROJECT_ROOT/$local_path" ]]; then
    exit 0
fi

# Check if file is under a target directory
matched=""
for target_dir in "${TARGET_DIRS[@]}"; do
    if [[ "$local_path" == "$target_dir/"* ]]; then
        matched="$target_dir"
        break
    fi
done

if [[ -z "$matched" ]]; then
    exit 0
fi

cd "$PROJECT_ROOT" || exit 0

if command -v npx >/dev/null 2>&1; then
    case "$FORMATTER" in
        biome)
            npx @biomejs/biome "${FORMATTER_ARGS[@]}" "$local_path" 2>/dev/null && \
                echo "Formatted: $local_path"
            ;;
        eslint-prettier)
            npx eslint --fix "$local_path" 2>/dev/null
            npx prettier --write "$local_path" 2>/dev/null && \
                echo "Formatted: $local_path"
            ;;
    esac
fi

exit 0

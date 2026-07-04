#!/bin/bash

# analyze-errors-hook.sh - PostToolUse hook
# Runs tsc/lint on edited TypeScript files and blocks on errors.
# Target directories are configured in hook-config.json.

DEBUG_LOG="/tmp/claude_hook_debug.log"
echo "=== Hook execution started at $(date) ===" >> "$DEBUG_LOG"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Read hook-config.json
CONFIG_FILE="$SCRIPT_DIR/hook-config.json"
TARGET_DIRS=()

if [[ -f "$CONFIG_FILE" ]] && command -v jq >/dev/null 2>&1; then
    # bash 3.2 compatible: use portable while-read.
    while IFS= read -r line; do
        [[ -n "$line" ]] && TARGET_DIRS+=("$line")
    done < <(jq -r '.targetDirs[]' "$CONFIG_FILE" 2>/dev/null)
fi

if [[ ${#TARGET_DIRS[@]} -eq 0 ]]; then
    exit 0
fi

# Extract file path from stdin JSON
EDITED_FILE=""
if [ -t 0 ]; then
    EDITED_FILE="$1"
else
    INPUT_JSON=$(cat)
    if command -v jq >/dev/null 2>&1; then
        EDITED_FILE=$(echo "$INPUT_JSON" | jq -r '
            .tool_input.file_path //
            .tool_input.target_file //
            .tool_input.files[0].path //
            .tool_input.files[0] //
            empty
        ' 2>/dev/null)
    else
        exit 0
    fi
fi

if [ -z "$EDITED_FILE" ] || [ "$EDITED_FILE" = "null" ]; then
    exit 0
fi

# Convert absolute path to relative
LOCAL_PATH="$EDITED_FILE"
if [[ "$EDITED_FILE" == /* ]]; then
    LOCAL_PATH="${EDITED_FILE#$PROJECT_ROOT/}"
fi

# Check if file is under a target directory
MATCHED_DIR=""
for target_dir in "${TARGET_DIRS[@]}"; do
    if [[ "$LOCAL_PATH" == "$target_dir/"* ]]; then
        MATCHED_DIR="$target_dir"
        break
    fi
done

if [[ -z "$MATCHED_DIR" ]]; then
    exit 0
fi

ABSOLUTE_PATH="$PROJECT_ROOT/$LOCAL_PATH"
if [ ! -f "$ABSOLUTE_PATH" ]; then
    exit 0
fi

if [[ "$LOCAL_PATH" != *.ts ]] && [[ "$LOCAL_PATH" != *.tsx ]]; then
    exit 0
fi

cd "$PROJECT_ROOT" || exit 0

# TypeScript check (find tsconfig.json)
TYPESCRIPT_OUTPUT=""
if command -v npx >/dev/null 2>&1; then
    TSCONFIG=""
    if [[ -f "$PROJECT_ROOT/$MATCHED_DIR/tsconfig.json" ]]; then
        TSCONFIG="--project $MATCHED_DIR/tsconfig.json"
    elif [[ -f "$PROJECT_ROOT/tsconfig.json" ]]; then
        TSCONFIG="--project tsconfig.json"
    fi

    if [[ -n "$TSCONFIG" ]]; then
        TYPESCRIPT_RAW=$(npx tsc --noEmit $TSCONFIG 2>&1)
        if [ $? -ne 0 ]; then
            TYPESCRIPT_OUTPUT=$(echo "$TYPESCRIPT_RAW" | grep "$LOCAL_PATH" | head -5)
        fi
    fi
fi

# Biome lint check
LINT_OUTPUT=""
if command -v npx >/dev/null 2>&1; then
    LINT_RAW=$(npx @biomejs/biome lint "$LOCAL_PATH" 2>&1)
    if [ $? -ne 0 ] && [ -n "$LINT_RAW" ]; then
        LINT_OUTPUT=$(echo "$LINT_RAW" | head -5)
    fi
fi

HAS_ERRORS=false
ERROR_DETAILS=""

if [ -n "$TYPESCRIPT_OUTPUT" ]; then
    HAS_ERRORS=true
    ERROR_DETAILS="$ERROR_DETAILS\nTypeScript Errors:\n$TYPESCRIPT_OUTPUT\n"
fi

if [ -n "$LINT_OUTPUT" ]; then
    HAS_ERRORS=true
    ERROR_DETAILS="$ERROR_DETAILS\nLint Errors:\n$LINT_OUTPUT\n"
fi

if [ "$HAS_ERRORS" = true ]; then
    ESCAPED_DETAILS=$(printf '%s' "$ERROR_DETAILS" | sed 's/"/\\"/g' | tr '\n' ' ' | sed 's/  */ /g')
    printf '{"decision": "block", "reason": "Code issues in %s: %s"}\n' "$LOCAL_PATH" "$ESCAPED_DETAILS"
else
    echo '{"decision": "approve", "reason": "Code analysis passed"}'
fi

echo "=== Hook execution completed ===" >> "$DEBUG_LOG"

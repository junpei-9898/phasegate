#!/bin/bash

# format-settings-hook.sh - PostToolUse hook
# Auto-formats .claude/settings.json after Write|Edit.

DEBUG_LOG="/tmp/claude_format_settings_debug.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] format-settings-hook.sh started" >> "$DEBUG_LOG"

# Extract file path from stdin JSON
FILE_PATH=""
if [[ ! -t 0 ]]; then
    INPUT_JSON=$(cat)
    if command -v jq &> /dev/null; then
        FILE_PATH=$(echo "$INPUT_JSON" | jq -r '.tool_input.file_path // empty')
    fi
fi

if [[ -z "$FILE_PATH" ]] || [[ ! "$FILE_PATH" =~ \.claude/settings\.json$ ]]; then
    exit 0
fi

if [[ ! -f "$FILE_PATH" ]]; then
    exit 0
fi

if command -v jq >/dev/null 2>&1; then
    temp_file=$(mktemp)
    if jq . "$FILE_PATH" > "$temp_file" 2>/dev/null; then
        mv "$temp_file" "$FILE_PATH"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Formatted: $FILE_PATH" >> "$DEBUG_LOG"
    else
        rm -f "$temp_file"
    fi
fi

exit 0

#!/bin/bash

# deny-check.sh - Claude Code PreToolUse security hook
# Reads JSON from stdin, exits with code 2 to block dangerous commands.
# Deny patterns are read from .claude/settings.json permissions.deny.

DEBUG_LOG="/tmp/claude_deny_check_debug.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] deny-check.sh started" >> "$DEBUG_LOG"

INPUT_JSON=$(cat)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Input JSON: $INPUT_JSON" >> "$DEBUG_LOG"

if ! command -v jq &> /dev/null; then
    exit 0
fi

TOOL_NAME=$(echo "$INPUT_JSON" | jq -r '.tool_name // empty')
COMMAND=$(echo "$INPUT_JSON" | jq -r '.tool_input.command // empty')

if [[ "$TOOL_NAME" != "Bash" ]] || [[ -z "$COMMAND" ]]; then
    exit 0
fi

if [[ -n "$CLAUDE_PROJECT_DIR" ]]; then
    SETTINGS_FILE="$CLAUDE_PROJECT_DIR/.claude/settings.json"
else
    SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
    SETTINGS_FILE="$(cd "$SCRIPT_DIR/.." && pwd)/settings.json"
fi

if [[ ! -f "$SETTINGS_FILE" ]]; then
    exit 0
fi

DENY_PATTERNS=()
while IFS= read -r deny_pattern; do
    if [[ -n "$deny_pattern" ]]; then
        DENY_PATTERNS+=("$deny_pattern")
    fi
done < <(jq -r '.permissions.deny[]? | select(startswith("Bash(")) | sub("^Bash\\("; "") | sub("\\)$"; "")' "$SETTINGS_FILE" 2>/dev/null)

if [[ ${#DENY_PATTERNS[@]} -eq 0 ]]; then
    exit 0
fi

for pattern in "${DENY_PATTERNS[@]}"; do
    regex_pattern=$(echo "$pattern" | sed 's/\*/.*/')
    if echo "$COMMAND" | grep -E "^$regex_pattern" &>/dev/null; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] BLOCKED: '$COMMAND' matches '$pattern'" >> "$DEBUG_LOG"
        echo "Security policy violation: command '$COMMAND' is denied by pattern '$pattern'" >&2
        exit 2
    fi
done

exit 0

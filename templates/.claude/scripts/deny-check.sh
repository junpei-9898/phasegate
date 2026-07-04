#!/bin/bash

# deny-check.sh - Claude Code PreToolUse security hook
# Reads JSON from stdin, exits with code 2 to block dangerous commands.
# Deny patterns are read from .claude/settings.json permissions.deny.

# Debug logging is OFF by default to avoid leaking command contents to a
# world-readable file. Set CLAUDE_DENY_CHECK_DEBUG=1 to enable. When enabled,
# the log is created with restrictive (owner-only) permissions.
DEBUG_LOG="${CLAUDE_DENY_CHECK_DEBUG_LOG:-$HOME/.cache/claude/deny-check-debug.log}"

debug_log() {
    if [[ "$CLAUDE_DENY_CHECK_DEBUG" == "1" ]]; then
        local dir
        dir=$(dirname "$DEBUG_LOG")
        mkdir -p "$dir" 2>/dev/null || return 0
        # Restrict permissions before writing anything sensitive.
        ( umask 077; touch "$DEBUG_LOG" 2>/dev/null ) || return 0
        chmod 600 "$DEBUG_LOG" 2>/dev/null || true
        printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
}

debug_log "deny-check.sh started"

INPUT_JSON=$(cat)
debug_log "input received (${#INPUT_JSON} bytes)"

# Fail CLOSED: without jq we cannot parse the deny policy, so deny the command
# rather than silently allowing it.
if ! command -v jq &> /dev/null; then
    echo "Security policy: jq is required to evaluate the deny policy but was not found; command blocked." >&2
    exit 2
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

# Split a shell command line into individual command segments so that denied
# commands smuggled behind chaining/grouping/substitution operators are still
# inspected. Operators handled: ; && || | & newline $( ) ` { } ( )
# We replace each operator with a newline, then treat each line as a segment.
split_command_segments() {
    local cmd="$1"
    # Order matters: multi-char operators first.
    cmd=${cmd//&&/$'\n'}
    cmd=${cmd//||/$'\n'}
    cmd=${cmd//|/$'\n'}
    cmd=${cmd//;/$'\n'}
    cmd=${cmd//&/$'\n'}
    cmd=${cmd//\$(/$'\n'}
    cmd=${cmd//\`/$'\n'}
    cmd=${cmd//(/$'\n'}
    cmd=${cmd//)/$'\n'}
    cmd=${cmd//\{/$'\n'}
    cmd=${cmd//\}/$'\n'}
    # Trailing newline ensures the final segment is emitted as a complete line
    # so that `while read` does not drop an unterminated last segment.
    printf '%s\n' "$cmd"
}

# Convert a settings glob pattern to an anchored regex. ALL '*' become '.*'.
glob_to_regex() {
    printf '%s' "$1" | sed 's/\*/.*/g'
}

check_segment() {
    local segment="$1"
    # Strip leading whitespace so "^pattern" anchors match after operators.
    segment="${segment#"${segment%%[![:space:]]*}"}"
    [[ -z "$segment" ]] && return 0
    for pattern in "${DENY_PATTERNS[@]}"; do
        local regex_pattern
        regex_pattern=$(glob_to_regex "$pattern")
        if printf '%s' "$segment" | grep -E "^$regex_pattern" &>/dev/null; then
            debug_log "BLOCKED segment '$segment' matches '$pattern'"
            echo "Security policy violation: command segment '$segment' is denied by pattern '$pattern'" >&2
            exit 2
        fi
    done
    return 0
}

# Inspect the whole command AND each chained/substituted segment.
check_segment "$COMMAND"
while IFS= read -r segment; do
    check_segment "$segment"
done < <(split_command_segments "$COMMAND")

exit 0

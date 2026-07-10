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

# --- git subcommand allowlist (default-deny) ---------------------------------
# Enumerated deny lists for git always leak (e.g. `git switch` slipped past the
# `git checkout*` / `git reset*` deny rules). We therefore invert the policy for
# git: only the subcommands below are permitted; every other git subcommand is
# denied by default. To grant a new git subcommand, a human adds it here.
#
# Rationale for the set: read-only inspection, staging/commit/tag creation, and
# worktree/fetch operations that agents legitimately use. History- and
# working-tree-mutating subcommands (checkout, switch, reset, rebase, merge,
# cherry-pick, revert, stash, clean, update-ref, reflog, filter-branch,
# replace, am, ...) are intentionally absent so they fail closed.
GIT_ALLOWED_SUBCOMMANDS=(
    status log show diff add commit tag restore rev-parse rev-list
    merge-base branch worktree fetch grep cat-file ls-files ls-tree
    ls-remote config init remote describe blame shortlog
    symbolic-ref for-each-ref name-rev check-ignore check-attr
    stripspace var help version whatchanged push
)

# Extract the git subcommand from a segment, skipping the `git` binary and any
# global options that may precede the subcommand:
#   git -C <path> <sub>        git --no-pager <sub>
#   git -c key=val <sub>       git --git-dir=<dir> <sub>
#   git --work-tree <dir> <sub>
# Prints the subcommand (or empty string if none / not a git command).
extract_git_subcommand() {
    # Tokenize on whitespace.
    local -a tokens
    read -ra tokens <<< "$1"
    [[ "${tokens[0]}" != "git" ]] && return 0
    local i=1
    local n=${#tokens[@]}
    while (( i < n )); do
        local tok="${tokens[$i]}"
        case "$tok" in
            # Global flags that take a separate argument.
            -C|-c|--git-dir|--work-tree|--namespace|--exec-path|--config-env)
                i=$(( i + 2 ))
                ;;
            # Global flags bundled with their value (=), or standalone toggles.
            --git-dir=*|--work-tree=*|--namespace=*|--exec-path=*|--config-env=*)
                i=$(( i + 1 ))
                ;;
            --no-pager|--paginate|--no-replace-objects|--bare|--literal-pathspecs|--no-optional-locks|--html-path|--man-path|--info-path)
                i=$(( i + 1 ))
                ;;
            -*)
                # Unknown global flag; skip conservatively.
                i=$(( i + 1 ))
                ;;
            *)
                printf '%s' "$tok"
                return 0
                ;;
        esac
    done
    return 0
}

check_git_allowlist() {
    local segment="$1"
    local sub
    sub=$(extract_git_subcommand "$segment")
    # Not a git command, or `git` with no subcommand (e.g. `git`, `git --help`).
    [[ -z "$sub" ]] && return 0
    local allowed
    for allowed in "${GIT_ALLOWED_SUBCOMMANDS[@]}"; do
        [[ "$sub" == "$allowed" ]] && return 0
    done
    debug_log "BLOCKED git subcommand '$sub' not in allowlist (segment '$segment')"
    echo "Security policy violation: git subcommand '$sub' is not in the agent allowlist (default-deny for git). Segment: '$segment'. If this subcommand is genuinely needed, a human must add it to GIT_ALLOWED_SUBCOMMANDS in .claude/scripts/deny-check.sh." >&2
    exit 2
}

check_segment() {
    local segment="$1"
    # Strip leading whitespace so "^pattern" anchors match after operators.
    segment="${segment#"${segment%%[![:space:]]*}"}"
    [[ -z "$segment" ]] && return 0
    # git subcommands are default-deny (allowlist); check that first.
    check_git_allowlist "$segment"
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

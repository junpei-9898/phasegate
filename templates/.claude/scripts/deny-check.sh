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
    ls-remote init remote describe blame shortlog
    for-each-ref name-rev check-ignore check-attr
    stripspace var help version whatchanged push
)

# `symbolic-ref` is deliberately NOT in the allowlist above: its write form
# (`git symbolic-ref HEAD refs/heads/<branch>` or `git symbolic-ref -d HEAD`)
# re-points HEAD, i.e. it is a checkout-equivalent HEAD/history mutation that the
# default-deny policy exists to block. Only the read form (reporting the ref HEAD
# points at, e.g. `git symbolic-ref HEAD` / `git symbolic-ref --short HEAD`) is
# state-preserving and therefore permitted. This guard, checked before the plain
# allowlist, allows the read form and denies every write form.
check_symbolic_ref() {
    local segment="$1"
    local sub
    sub=$(extract_git_subcommand "$segment")
    [[ "$sub" != "symbolic-ref" ]] && return 0

    # Re-tokenize and walk to the subcommand, then inspect its arguments.
    local -a tokens
    read -ra tokens <<< "$segment"
    local i=1
    local n=${#tokens[@]}
    # Advance past global options to the `symbolic-ref` token (mirrors
    # extract_git_subcommand's flag handling so flag-stuffing cannot evade this).
    while (( i < n )); do
        case "${tokens[$i]}" in
            -C|-c|--git-dir|--work-tree|--namespace|--exec-path|--config-env)
                i=$(( i + 2 )) ;;
            --git-dir=*|--work-tree=*|--namespace=*|--exec-path=*|--config-env=*)
                i=$(( i + 1 )) ;;
            --no-pager|--paginate|--no-replace-objects|--bare|--literal-pathspecs|--no-optional-locks|--html-path|--man-path|--info-path)
                i=$(( i + 1 )) ;;
            symbolic-ref)
                break ;;
            -*)
                i=$(( i + 1 )) ;;
            *)
                break ;;
        esac
    done
    # Skip the `symbolic-ref` token itself.
    i=$(( i + 1 ))

    # Count positional (non-flag) arguments after the subcommand. A read is
    # `symbolic-ref [--short|-q] <name>` (<= 1 positional, no delete). A write is
    # `symbolic-ref <name> <ref>` (>= 2 positionals) or `symbolic-ref -d <name>`.
    local positional=0
    while (( i < n )); do
        local arg="${tokens[$i]}"
        case "$arg" in
            -d|--delete)
                debug_log "BLOCKED git symbolic-ref delete form (segment '$segment')"
                echo "Security policy violation: 'git symbolic-ref' delete form is denied (it mutates HEAD; only the read form is permitted). Segment: '$segment'." >&2
                exit 2 ;;
            -m|--reason)
                # `-m <reason>` accompanies a write; the reason value consumes one token.
                i=$(( i + 2 )); continue ;;
            --short|-q|--quiet)
                # Read-only modifiers; do not count as positionals.
                : ;;
            --)
                : ;;
            -*)
                : ;;
            *)
                positional=$(( positional + 1 )) ;;
        esac
        i=$(( i + 1 ))
    done

    if (( positional >= 2 )); then
        debug_log "BLOCKED git symbolic-ref write form (segment '$segment')"
        echo "Security policy violation: 'git symbolic-ref' write form (re-pointing HEAD) is denied; it is checkout-equivalent HEAD mutation. Only the read form (e.g. 'git symbolic-ref HEAD') is permitted. Segment: '$segment'." >&2
        exit 2
    fi
    # <= 1 positional and no delete: read form. Allowed.
    return 0
}

# `config` is deliberately NOT in the allowlist above: its write form
# (`git config <key> <value>`, `--unset`, `--add`, `--edit`, ...) can re-point
# the hook path itself (`git config core.hooksPath <dir>`), which would disable
# the entire L0 defence layer. Only read forms (`--get*`, `--list`/`-l`, or a
# single <key> positional with no value) are state-preserving and therefore
# permitted. Ambiguous invocations fail closed; read forms combined with scope
# flags (`--global --list`, `--local --get <key>`, ...) are legitimate and pass.
check_git_config() {
    local segment="$1"
    local sub
    sub=$(extract_git_subcommand "$segment")
    [[ "$sub" != "config" ]] && return 0

    # Re-tokenize and walk to the subcommand, then inspect its arguments.
    local -a tokens
    read -ra tokens <<< "$segment"
    local i=1
    local n=${#tokens[@]}
    # Advance past global options to the `config` token (mirrors
    # extract_git_subcommand's flag handling so flag-stuffing cannot evade this).
    while (( i < n )); do
        case "${tokens[$i]}" in
            -C|-c|--git-dir|--work-tree|--namespace|--exec-path|--config-env)
                i=$(( i + 2 )) ;;
            --git-dir=*|--work-tree=*|--namespace=*|--exec-path=*|--config-env=*)
                i=$(( i + 1 )) ;;
            --no-pager|--paginate|--no-replace-objects|--bare|--literal-pathspecs|--no-optional-locks|--html-path|--man-path|--info-path)
                i=$(( i + 1 )) ;;
            config)
                break ;;
            -*)
                i=$(( i + 1 )) ;;
            *)
                break ;;
        esac
    done
    # Skip the `config` token itself.
    i=$(( i + 1 ))

    # Classify the arguments after the subcommand.
    #   read flags  -> explicitly allowed (`--get`, `--list`, ...)
    #   write flags -> explicitly denied (`--unset`, `--add`, `--edit`, ...)
    #   positionals -> counted: 1 positional with no write indicator is the
    #                  `git config <key>` read; >= 2 positionals is the
    #                  `git config <key> <value>` write (fail closed).
    # Scope flags (`--global`, `--system`, `--local`, `--worktree`) and other
    # modifiers are neutral: the verdict is driven by read/write flags and the
    # positional count, so `--global --list` passes and `--global k v` fails.
    local read_flag=0
    local positional=0
    while (( i < n )); do
        local arg="${tokens[$i]}"
        case "$arg" in
            --unset|--unset-all|--add|--replace-all|--edit|-e|--remove-section|--rename-section|--set*)
                debug_log "BLOCKED git config write flag '$arg' (segment '$segment')"
                echo "Security policy violation: 'git config' write form ('$arg') is denied; config writes can re-point hooks (core.hooksPath) and disable the L0 defence layer. Only read forms (--get/--get-all/--get-regexp/--list/-l or a bare <key>) are permitted. Segment: '$segment'." >&2
                exit 2 ;;
            --get|--get-all|--get-regexp|--get-urlmatch|--get-color|--get-colorbool|--list|-l)
                read_flag=1 ;;
            --file|-f|--blob|--default|--type)
                # Neutral flags that consume a separate value token.
                i=$(( i + 2 )); continue ;;
            --file=*|--blob=*|--default=*|--type=*)
                : ;;
            --)
                : ;;
            -*)
                # Scope flags and other modifiers: neutral, do not count.
                : ;;
            *)
                # New-style verb subcommands (git >= 2.46) that mutate config.
                if (( positional == 0 )); then
                    case "$arg" in
                        set|unset|edit|rename-section|remove-section)
                            debug_log "BLOCKED git config verb '$arg' (segment '$segment')"
                            echo "Security policy violation: 'git config $arg' is a config write form and is denied; config writes can re-point hooks (core.hooksPath) and disable the L0 defence layer. Segment: '$segment'." >&2
                            exit 2 ;;
                    esac
                fi
                positional=$(( positional + 1 )) ;;
        esac
        i=$(( i + 1 ))
    done

    # Explicit read flag: allowed regardless of positional count
    # (`--get <key>`, `--get-regexp <pattern>`, `--get-urlmatch <key> <url>`).
    (( read_flag == 1 )) && return 0

    if (( positional >= 2 )); then
        debug_log "BLOCKED git config write form (segment '$segment')"
        echo "Security policy violation: 'git config' write form (<key> <value>) is denied; config writes can re-point hooks (core.hooksPath) and disable the L0 defence layer. Only read forms (--get/--get-all/--get-regexp/--list/-l or a bare <key>) are permitted. Segment: '$segment'." >&2
        exit 2
    fi
    # <= 1 positional and no write indicator: value read (`git config <key>`)
    # or a no-op. Allowed.
    return 0
}

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
    # `symbolic-ref` is adjudicated by check_symbolic_ref (read form allowed,
    # write form denied); do not treat its absence from the allowlist as a deny.
    [[ "$sub" == "symbolic-ref" ]] && return 0
    # `config` is adjudicated by check_git_config (read forms allowed, write
    # forms denied); do not treat its absence from the allowlist as a deny.
    [[ "$sub" == "config" ]] && return 0
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
    # symbolic-ref and config get a dedicated read-vs-write adjudication before
    # the plain allowlist (their write forms mutate HEAD / the hook path and
    # must fail closed).
    check_symbolic_ref "$segment"
    check_git_config "$segment"
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

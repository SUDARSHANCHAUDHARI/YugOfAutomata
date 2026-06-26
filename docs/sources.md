# Source Adapters

Each adapter watches a tool's transcript files and emits normalized
`AdapterObservation`s. Adding a source means implementing the `SourceAdapter`
interface in `packages/server/src/adapters/` and registering it in
`adapters/index.ts`.

## Claude Code

- **Files:** `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl`, where the
  project path has `/` replaced by `-`.
- **Session:** `sessionId`, `cwd`, and `gitBranch` are read from each line.
- **Title:** the first user text message (truncated).
- **Model & tokens:** `message.model` and `message.usage`. Context is
  `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`; output
  is accumulated across assistant turns.
- **Tools:** the last `tool_use` block per assistant message. Claude tool names are
  normalized to canonical ids (`Bash → shell`, `Edit → edit_file`, `Read →
  read_file`, `Grep → rg`, `Task → subagent`, …) so the building mapping is
  source-agnostic.
- **State:** `tool_use → working`, `thinking → thinking`, an `end_turn` text reply
  → `awaiting-input`.
- **Workers:** lines with `isSidechain: true` become workers linked to the session.

## Codex

- **Files:** `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`.
- **Session & model:** `session_meta` (id, cwd) and `turn_context` (model).
- **Title:** the first `user_message` event.
- **Tools:** `response_item.function_call` (`name`, `arguments`). `exec_command` is
  normalized to `shell`; the command string drives detail (and git detection →
  Caravan).
- **State:** `task_started → working`, `task_complete → awaiting-input`, `error →
  error`.
- **Tokens:** `token_count` events. When `info` is present, totals and
  `model_context_window` are used; otherwise the context gauge falls back to
  `rate_limits.*.used_percent`.

## OpenCode

- **Storage:** `${XDG_DATA_HOME:-~/.local/share}/opencode/storage`, which keeps
  per-event JSON (not append-only JSONL): `session/<project>/<sessionId>.json`,
  `message/<sessionId>/<messageId>.json`, and `part/<messageId>/<partId>.json`.
  The adapter therefore uses a whole-file watch (`watchFiles`) instead of the
  byte-offset tailer, ignoring files present at startup so old sessions don't
  flood the world.
- **Session:** `directory` (cwd) and `title`; a `parentID` marks a sub-session,
  emitted as a worker linked to its parent.
- **Model & tokens:** assistant messages carry `modelID` and `tokens` (context is
  `input + cache.read + cache.write`).
- **Tools:** `part` files of `type: "tool"` carry `tool`, `state.status`
  (`running`/`completed`/`error`), and `state.input`. Tool names are normalized
  (`bash → shell`, `edit → edit_file`, `read → read_file`, `grep → rg`,
  `webfetch → web_fetch`, `task → subagent`, …); an `error` status routes to the
  Infirmary.

## Tool → building mapping

The default mapping lives in `@yug-of-automata/shared` (`DEFAULT_BUILDING_MAPPING`).
Rules are `exact`, `prefix` (e.g. `mcp__*` → Guildhall), or `detail` (regex over
the tool detail, e.g. git commands → Caravan). The mapping is editable via the
Settings panel and the `PUT /mapping` endpoint, and persists to local settings.

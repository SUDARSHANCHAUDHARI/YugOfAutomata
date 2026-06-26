# Privacy

Yug of Automata is local-first by design.

## Guarantees

- **Localhost only.** The server binds to `127.0.0.1`. It is never exposed to your
  LAN or the internet.
- **Read-only.** Source adapters open transcript files read-only. The app never
  modifies, moves, or deletes your session files.
- **No uploads.** Transcript content never leaves your machine. There is no
  telemetry and no remote endpoint.
- **Opt-in sources.** Use `--sources` to limit which tools are watched, or disable
  a source in Settings.
- **Demo is inert.** `yoa --demo` runs a simulated city. It reads no transcript
  files and writes no config.

## What is read

| Source | Path |
| --- | --- |
| Claude Code | `~/.claude/projects/**/*.jsonl` |
| Codex | `~/.codex/sessions/**/*.jsonl` |
| OpenCode | `~/.local/share/opencode/storage/{session,message,part}` |

Only files modified within the active window are read, and only the bytes
appended since the last read.

## What is written

The single file the app writes is your local settings:

```
${XDG_CONFIG_HOME:-~/.config}/yug-of-automata/settings.json
```

It stores your theme, per-source visibility, and tool→building mapping. Nothing
else is persisted.

## Out of scope (by design)

This release does not install hooks, does not intercept permission prompts, and
does not launch agent processes. Those capabilities are intentionally excluded.

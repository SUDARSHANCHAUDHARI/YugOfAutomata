# Architecture

Yug of Automata is a TypeScript pnpm-workspaces monorepo. The server normalizes
source-specific transcript activity into a single event protocol; the client
only ever consumes that protocol.

## Packages

| Package | Responsibility |
| --- | --- |
| `@yug-of-automata/shared` | Protocol and domain types, building taxonomy, `resolveBuilding`, model context windows, default settings. |
| `@yug-of-automata/server` | Source adapters, world state machine, WebSocket broadcaster, REST endpoints, static client serving. |
| `@yug-of-automata/client` | React + Zustand HUD and PixiJS world. |
| `yug-of-automata` (cli) | Argument parsing, startup, source filters, port selection, browser opening. Published package. |

## Data flow

```
~/.claude/projects/**/*.jsonl ─┐
~/.codex/sessions/**/*.jsonl  ─┤→ SourceAdapter.tail(offset) → AdapterObservation
                                                                    │
                                          World.applyObservation() ─┤→ WorldEvent (ws) → store → Pixi/HUD
                              demo.ts ────→ World.upsertAutomaton() ─┘
```

- **Adapters** translate transcript lines into `AdapterObservation` (a normalized
  partial: session, tool, state, tokens, optional worker). They never block on
  large files — see [tail watching](#tail-watching).
- **World** merges observations into automata and workers, recomputes the current
  building from the active tool→building mapping, caps recent actions, and prunes
  sessions that go inactive. It emits incremental `WorldEvent`s.
- **Client** applies events through a pure reducer into a Zustand store and
  renders. On reconnect the server sends a full `snapshot` so the client recovers
  without replaying history.

## Tail watching

Transcript files are append-only JSONL and can reach hundreds of megabytes. The
`FileTailer` tracks a byte offset per file and only ever reads the bytes appended
since the last read, stopping at the last newline so partial lines aren't parsed.
Files present at startup are seeked to their end (no history backfill); files are
ignored entirely once their mtime falls outside the active window.

## Protocol

`WorldEvent` is a discriminated union: `snapshot`, `automaton-updated`,
`automaton-removed`, `worker-updated`, `worker-removed`, `city-updated`. Cities
are derived from the working directories of active automata.

## REST endpoints

`GET /health`, `GET/PUT /settings`, `GET/PUT /mapping`, `GET /building-stats`,
`GET /sessions`, and the WebSocket at `/ws`. In a packaged install the server
also serves the built client with an SPA fallback.

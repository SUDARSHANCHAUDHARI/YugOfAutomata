# Yug of Automata Product Design

Date: 2026-06-25
Status: Approved for implementation planning

## Product Intent

Yug of Automata is a public open-source, local-first RTS observability dashboard for AI coding agents. It runs from a terminal command, starts a localhost web app, watches agent session activity, and renders a living civilization where active AI sessions become automata working across a city.

The product should feel playful enough to be memorable, but useful enough to keep open while coding. The core value is agent observability: users can see what their AI coding tools are doing, which projects are active, which tools are being used, how much context is being consumed, and when a session needs attention.

## Positioning

Yug of Automata is not a clone of any existing project. It uses the broad RTS-building metaphor as a category idea, while using original name, code, visual identity, building taxonomy, copy, package structure, and assets.

Public tagline:

> A local RTS dashboard for your AI coding automata.

## Scope

The target is a full working project with feature parity as a product category, not a reduced demo. The first implementation plan should include a complete path to:

- Local npm CLI.
- Browser-based RTS visualization.
- Real transcript watchers.
- Demo mode.
- Multiple agent sources.
- Project/city grouping.
- Session detail panels.
- Token and context tracking.
- Subagent/worker visualization.
- Tool-to-building mapping.
- Settings and customization.
- Optional local control layer.
- Optional agent launching layer.
- Open-source documentation and contribution readiness.

## Technology

Use a TypeScript npm workspaces monorepo.

- Runtime: Node.js 22+.
- Package manager: npm.
- Server: Fastify.
- Realtime: WebSocket.
- Client: React + Vite.
- Rendering: PixiJS.
- Tests: Vitest.
- CLI: Node executable published as `yug-of-automata` with short command `yoa`.

This stack supports a simple `npx`/global-install workflow, local HTTP serving, browser rendering, and clean package boundaries.

## Repository Layout

```text
YugOfAutomata/
  package.json
  packages/
    shared/
      src/
    server/
      src/
      test/
    client/
      src/
      tests/
    cli/
      src/
  docs/
    architecture.md
    privacy.md
    setup.md
    contributing.md
    superpowers/specs/
```

`packages/shared` owns protocol and domain types.

`packages/server` owns source watchers, normalization, state machine, local APIs, WebSocket broadcasting, optional hooks, optional launch support, and static client serving in packaged mode.

`packages/client` owns the PixiJS world, React HUD, panels, settings, and browser state.

`packages/cli` owns command parsing, startup mode, source filters, port selection, and browser opening.

## Runtime Model

The server converts source-specific activity into normalized events called facts. The world state machine consumes facts and emits snapshots. The client never parses raw transcripts directly.

Data flow:

```text
agent transcript / hook / proxy
  -> source adapter
  -> normalized fact
  -> world state machine
  -> WebSocket event
  -> React store
  -> PixiJS world + HUD
```

The client receives snapshots and incremental events. On reconnect, the server sends a full snapshot so the client can recover without replaying history.

## Core Concepts

An automaton represents one AI coding session.

A worker represents a subagent or child task spawned by a session.

A city represents a project directory. Users can switch between all projects or one city.

A building represents an activity category. Tool calls send automata to buildings.

Resources represent usage signals such as input tokens, output tokens, context usage, and active time.

Alerts represent sessions awaiting input, failed tool calls, stuck sessions, or control prompts.

## Agent Sources

Support these sources:

- Codex.
- Claude Code.
- OpenCode.
- Koda.
- Local LLMs through an OpenAI-compatible logging proxy.

Each source adapter should expose:

- Stable source id.
- Root discovery.
- File classification.
- Line parser or poller.
- Session metadata extraction.
- Tool-use extraction.
- Token usage extraction when available.
- Subagent detection when available.

Source filters:

```bash
yoa --sources codex
yoa --sources codex,claude
YOA_SOURCES=codex,claude yoa
```

## CLI

Primary commands:

```bash
yoa
yoa --demo
yoa --open
yoa --sources codex,claude
yoa local-proxy
```

Package names:

- npm package: `yug-of-automata`.
- binary: `yoa`.
- long binary alias: `yug-of-automata`.

The CLI binds to `127.0.0.1` by default. It prints the local URL and the active sources.

## Server APIs

Required endpoints:

- `GET /health`
- `GET /ws` or WebSocket path `/ws`
- `GET /settings`
- `PUT /settings`
- `GET /mapping`
- `PUT /mapping`
- `GET /models`
- `PUT /models`
- `GET /building-stats`
- `GET /hooks/status`
- `POST /hooks/install`
- `POST /hooks/uninstall`
- `POST /hooks`
- `POST /hooks/decide`
- `POST /sessions/launch`
- `GET /sessions`

The hooks and session launch endpoints are optional operational features. They must be off or inert unless configured by the user.

## Visual World

The first full visual direction is an original epoch/civilization world of machine workers.

The world should include:

- Central command structure.
- Tool buildings.
- Roads or paths.
- Automata units.
- Worker units.
- Project/city switcher.
- Minimap.
- Side panel.
- Activity feed.
- Settings panel.
- Theme switcher.

The visual identity must avoid copied assets, copied screenshots, copied layout details, and copied wording from other tools. The first release can use original generated or procedural assets, with a clear path to a dedicated asset pack.

## Building Taxonomy

Use an original taxonomy. Initial building categories:

- Core: idle, session home, unknown activity.
- Forge: file edits and writes.
- Archive: reads, search, symbol lookup, grep.
- Mine: shell and local command execution.
- Observatory: web search and web fetch.
- Guildhall: MCP connectors and external tools.
- Caravan: git, release, package, and publishing actions.
- Workshop: build, test, lint, typecheck, format.
- Barracks: subagents and delegated workflows.
- Shrine: awaiting input, approval, or user decision.
- Infirmary: errors, failed tools, recovery.
- Storehouse: token and context resources.

The mapping must be configurable through UI and JSON.

## Client Panels

Required panels:

- Session detail: current task, source, model, status, current tool, tokens, context, recent actions.
- Project/city panel: active sessions, source breakdown, project metadata.
- Activity feed: recent actions across all sessions.
- Settings: theme, source visibility, tool mapping, model registry, privacy controls.
- Building stats: usage by building for day/week/month.
- Pending questions: control prompts when hooks/control are enabled.

## Demo Mode

Demo mode must run without reading user transcripts or writing config.

It should simulate:

- Multiple projects.
- Multiple sources.
- Tool calls.
- Subagents.
- Tokens/context growth.
- Awaiting-input states.
- Errors and recovery.

Demo mode is important for public adoption because users can try the product safely before granting local file access.

## Privacy And Safety

Default behavior:

- Bind to `127.0.0.1`.
- Read local transcript files only.
- Do not upload transcript content.
- Do not expose the server to the LAN.
- Do not install hooks unless the user explicitly requests it.
- Do not launch agents unless the user explicitly configures it.
- Store settings locally.

The app should display a clear privacy page in docs and a concise privacy note in the UI.

## Control Layer

The control layer is optional and must be explicit.

Capabilities:

- Surface pending permission prompts.
- Allow user answers from the panel.
- Support always-allow rules stored in a local policy file.
- Fall back to terminal behavior on timeout or disconnected UI.

The app must never auto-approve unknown prompts by default.

## Agent Launching

Agent launching is optional and should be treated as beta.

Capabilities:

- Choose project folder.
- Enter prompt.
- Choose source/provider where supported.
- Start a real agent session.
- Stream the resulting session into the world.

Authentication and billing behavior must be documented per provider.

## Testing

Use focused automated tests:

- Source parsers for each supported transcript format.
- State machine transitions.
- Tool-to-building resolution.
- Model registry resolution.
- WebSocket snapshot behavior.
- Settings validation.
- Demo generator.
- CLI argument parsing.
- Client store event handling.
- Core rendering helpers where deterministic.

Manual verification:

- `yoa --demo` starts and displays a nonblank world.
- `yoa --sources codex` reads recent Codex sessions.
- Browser reconnect receives a complete snapshot.
- Demo mode does not read or write user session/config files.

## Documentation

Required docs:

- README with quick start.
- Architecture.
- Privacy.
- Source adapters.
- Local LLM proxy.
- Hook/control setup.
- Agent launch setup.
- Contributing.
- License.

Use clear public language that emphasizes local-first observability and original visual identity.

## Release Shape

The package should publish to npm as `yug-of-automata`.

Release commands:

```bash
npm run build
npm test
npm pack
```

The production CLI should serve the built client from the local server.

## Implementation Strategy

Build in vertical slices while keeping the full product target:

1. Monorepo, shared protocol, CLI, server, client shell.
2. Demo world with WebSocket snapshots.
3. PixiJS city renderer and HUD.
4. Source watcher architecture.
5. Codex and Claude adapters.
6. Tool-to-building mapping and session panels.
7. Tokens/context/building stats.
8. OpenCode, Koda, and local LLM proxy.
9. Settings, model registry, and customization.
10. Hooks/control layer.
11. Agent launch beta.
12. Docs, packaging, and public release hardening.

This sequence produces working software early while preserving the full feature target.

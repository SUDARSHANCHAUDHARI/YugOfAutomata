# Yug of Automata

A local RTS dashboard for your AI coding automata.

Yug of Automata runs on your machine, starts a localhost dashboard, and visualizes your AI coding sessions as automata working across a living city. It watches your **Claude Code** and **Codex** sessions in real time and renders what each one is doing — which project, which tool, how much context — as units moving between buildings in an original civilization world.

## Install

```bash
npm install -g yug-of-automata
yoa            # watch live sessions
yoa --open     # and open the browser
```

Or run without installing:

```bash
npx yug-of-automata --demo
```

## Usage

```bash
yoa                       # live: watch all supported sources
yoa --demo                # demo mode: simulated city, reads nothing
yoa --sources claude      # only watch Claude Code
yoa --sources codex,claude
yoa --open                # open the dashboard in your browser
yoa --port 9000           # bind a different port
```

The CLI binds to `127.0.0.1` and prints one URL. Open it to see the city.

## What you see

- **Automata** — one per active coding session, colored by state (working, thinking, awaiting input, error).
- **Workers** — subagents spawned by a session, gathered at the Barracks.
- **Buildings** — activity categories. Tool calls send automata to a building: Forge (edits), Archive (reads/search), Mine (shell), Observatory (web), Guildhall (MCP), Caravan (git), Workshop (build/test), Shrine (awaiting input), Infirmary (errors).
- **Cities** — one per project directory. Filter the world to a single project.
- **Activity feed**, **session detail**, **settings** (theme, sources, tool→building mapping).

## Sources

| Source | Watches |
| --- | --- |
| Claude Code | `~/.claude/projects/**/*.jsonl` |
| Codex | `~/.codex/sessions/**/*.jsonl` |

See [docs/sources.md](docs/sources.md) for how each transcript format is parsed.

## Privacy

Yug of Automata is local-first. It binds to `127.0.0.1`, reads transcript files **read-only**, never uploads transcript content, and never exposes the server to your LAN. Demo mode reads no files and writes no config. The only file it writes is your local settings under `~/.config/yug-of-automata/`. See [docs/privacy.md](docs/privacy.md).

## Develop

```bash
pnpm install
pnpm demo        # server (demo) + Vite client with hot reload
pnpm test
pnpm typecheck
pnpm build       # builds client and the bundled CLI into packages/cli/dist
```

Architecture: [docs/architecture.md](docs/architecture.md) · Contributing: [docs/contributing.md](docs/contributing.md)

## License

MIT

# Yug of Automata

A local RTS dashboard for your AI coding automata.

Yug of Automata runs on your machine, starts a localhost dashboard, and visualizes your AI coding sessions as automata working across a living city. It watches your **Claude Code** and **Codex** sessions in real time and renders what each one is doing — which project, which tool, how much context — as units moving between buildings in an original civilization world.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [What you see](#what-you-see)
- [Sources](#sources)
- [Privacy](#privacy)
- [Develop](#develop)
- [License](#license)
- [About](#about)

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
yoa --proxy               # also run the local-LLM logging proxy
```

The CLI binds to `127.0.0.1` and prints one URL. Open it to see the city.

### Local-LLM proxy

`yoa --proxy` starts an OpenAI-compatible logging proxy (default `127.0.0.1:8124`)
that forwards to a local upstream (default Ollama at `127.0.0.1:11434`) and shows
that traffic as a `local-llm` automaton. Point your client's OpenAI base URL at
the proxy (`http://127.0.0.1:8124/v1`). See [docs/local-llm.md](docs/local-llm.md).

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
| OpenCode | `~/.local/share/opencode/storage/{session,message,part}` |

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

MIT © Sudarshan Chaudhari

---

## About

I'm Sudarshan Chaudhari, a Senior Quality Engineer, Test Automation specialist, and AI systems builder based in Bangkok, Thailand.

I have 13+ years of experience in software quality engineering, working across SaaS, fintech, gaming, web, mobile, cloud, and digital signage platforms. My background combines hands-on test automation with QA leadership, test strategy, CI/CD, release quality, production investigation, and cross-platform validation.

Alongside my professional QA career, I run [SudarshanTechLabs](https://sudarshantechlabs.com/), my independent engineering and product lab where I design, build, test, and ship software across Android, web, AI, cybersecurity, developer tooling, and cross-platform applications.

### What I work on

- ⚙️ **Quality Engineering & Test Automation** — Playwright, Selenium, Cypress, Appium, API testing, automation frameworks, end-to-end testing, CI/CD, release gates, GitHub Actions, risk-based testing, and production validation
- 🤖 **AI Systems & Automation** — AI agents, multi-agent orchestration, MCP servers, AI-assisted QA, prompt tooling, developer workflows, automation systems, and Claude Code plugins
- 📱 **Mobile & Cross-Platform Applications** — Android applications built with Kotlin and Jetpack Compose, Google Play releases, automated build and publishing pipelines, and cross-platform development spanning iOS, web, Windows, and macOS
- 🌐 **Web Applications & Platforms** — Full-stack applications using Next.js, TypeScript, Firebase, Cloudflare, REST APIs, and modern web infrastructure
- 🛠️ **Developer Tooling & CLI Engineering** — Rust, Python, TypeScript, CLI utilities, multi-repository tooling, build automation, release tooling, and engineering productivity systems
- 🛡️ **Cybersecurity & Observability** — Threat detection, log analysis, security auditing, vulnerability assessment, monitoring, and security-focused developer tools
- 📺 **Digital Signage & Device Platforms** — Content validation, playback testing, device compatibility, production investigation, monitoring, and QA across diverse hardware and operating-system environments

My work sits at the intersection of quality engineering, automation, AI, and software development. I approach products with a QA mindset from the beginning: understanding failure modes, designing for testability, automating repetitive work, and building release confidence into the engineering process.

Through SudarshanTechLabs, I also build products and tools from idea to production, covering architecture, development, testing, CI/CD, release automation, monitoring, and ongoing maintenance.

🌐 [sudarshantechlabs.com](https://sudarshantechlabs.com/) · 💼 [LinkedIn](https://linkedin.com/in/sudarshan-chaudhari) · 🐙 [GitHub](https://github.com/SUDARSHANCHAUDHARI) · ✉️ [sunny.sudarshan@gmail.com](mailto:sunny.sudarshan@gmail.com)

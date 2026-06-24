# Yug of Automata

A local RTS dashboard for your AI coding automata.

Yug of Automata runs on your machine, starts a localhost dashboard, and visualizes AI coding sessions as automata working across a living city. The first vertical slice includes demo mode, real-time WebSocket snapshots, a Fastify server, and a React/PixiJS dashboard.

## Quick Start

```bash
pnpm install
pnpm demo
```

Open the Vite URL printed by the client, usually:

```text
http://localhost:5173
```

## Scripts

```bash
pnpm test
pnpm build
pnpm typecheck
```

## Privacy

Demo mode does not read local transcripts or write local config. Live source adapters will be local-first and opt-in as they are added.

## Status

This repository is under active construction. The product target is a full local-first RTS observability dashboard for Codex, Claude Code, OpenCode, Koda, and local LLM workflows.

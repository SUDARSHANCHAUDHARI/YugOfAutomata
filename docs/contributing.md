# Contributing

Thanks for your interest in Yug of Automata.

## Setup

```bash
pnpm install
pnpm demo        # server (demo) + Vite client
```

Requires Node.js 22+ and pnpm.

## Workflow

- Each package owns its tests (`vitest`). Run the whole suite with `pnpm test`.
- Type-check everything with `pnpm typecheck`.
- The protocol lives in `@yug-of-automata/shared`; the server and client both
  depend on it. Build shared first if you change types (`pnpm test` does this).
- Prefer small, focused changes. Match the existing style.

## Adding a source adapter

1. Create `packages/server/src/adapters/<source>.ts` exposing a pure parser plus a
   `SourceAdapter` that wires it through `watchTranscripts`.
2. Add a trimmed, synthetic fixture under `packages/server/test/fixtures/` and a
   parser test. Do not commit real transcript content.
3. Register the adapter in `packages/server/src/adapters/index.ts`.

## Release

```bash
pnpm test
pnpm build                    # builds the client and the bundled CLI
cd packages/cli
npm publish                   # publishes yug-of-automata (bin: yoa)
```

The published package bundles the server and shared code into a single file and
ships the built client in `dist/public`, so it has no workspace dependencies.

## CI

GitHub Actions runs install, typecheck, test, and build on Node 22 for every push
and pull request (`.github/workflows/ci.yml`).

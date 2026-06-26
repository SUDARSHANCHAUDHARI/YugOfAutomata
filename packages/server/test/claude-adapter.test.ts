import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AdapterObservation } from '@yug-of-automata/shared';
import { createClaudeParser } from '../src/adapters/claude.js';

function parseFixture(): AdapterObservation[] {
  const parser = createClaudeParser();
  const raw = readFileSync(join(__dirname, 'fixtures/claude.sample.jsonl'), 'utf8');
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => parser.parse(line))
    .filter((obs): obs is AdapterObservation => obs !== undefined);
}

describe('createClaudeParser', () => {
  it('captures the title and cwd from the first user message', () => {
    const [first] = parseFixture();
    expect(first.title).toBe('Add a dark mode toggle to settings');
    expect(first.cwd).toBe('/Users/dev/MyApp');
    expect(first.source).toBe('claude');
  });

  it('normalizes tool names and extracts detail', () => {
    const obs = parseFixture();
    const read = obs[1];
    expect(read.tool).toBe('read_file');
    expect(read.toolDetail).toBe('src/Settings.tsx');
    expect(read.state).toBe('working');
    expect(read.model).toBe('claude-sonnet-4-6');
  });

  it('computes context tokens from prompt + cache fields', () => {
    const read = parseFixture()[1];
    expect(read.tokens?.context).toBe(5 + 2000 + 10000);
    expect(read.tokens?.contextWindow).toBe(200000);
  });

  it('maps a git shell command to a normalized shell tool with detail', () => {
    const git = parseFixture()[2];
    expect(git.tool).toBe('shell');
    expect(git.toolDetail).toContain('git commit');
  });

  it('emits sidechain activity as a worker linked to the session', () => {
    const worker = parseFixture()[3];
    expect(worker.worker?.id).toBe('worker-uuid-1');
    expect(worker.sessionId).toBe('claude-sess');
  });

  it('marks a finished assistant turn as awaiting input', () => {
    const last = parseFixture()[4];
    expect(last.state).toBe('awaiting-input');
    expect(last.tool).toBeUndefined();
  });
});

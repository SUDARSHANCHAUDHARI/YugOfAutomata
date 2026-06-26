import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AdapterObservation } from '@yug-of-automata/shared';
import { createCodexParser } from '../src/adapters/codex.js';

function parseFixture(): AdapterObservation[] {
  const parser = createCodexParser();
  const raw = readFileSync(join(__dirname, 'fixtures/codex.sample.jsonl'), 'utf8');
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => parser.parse(line))
    .filter((obs): obs is AdapterObservation => obs !== undefined);
}

describe('createCodexParser', () => {
  it('reads session id and cwd from session_meta', () => {
    const [meta] = parseFixture();
    expect(meta.source).toBe('codex');
    expect(meta.sessionId).toBe('codex-sess');
    expect(meta.cwd).toBe('/Users/dev/Tooling');
  });

  it('reads the model from turn_context', () => {
    const tc = parseFixture()[1];
    expect(tc.model).toBe('gpt-5.4');
  });

  it('captures the title from user_message', () => {
    const obs = parseFixture().find((o) => o.title === 'Refactor the parser');
    expect(obs).toBeDefined();
  });

  it('normalizes exec_command to shell and extracts git detail', () => {
    const git = parseFixture().find((o) => o.tool === 'shell' && o.toolDetail?.includes('git'));
    expect(git?.toolDetail).toContain('git push origin main');
    expect(git?.state).toBe('working');
  });

  it('handles a string-array command', () => {
    const ls = parseFixture().find((o) => o.toolDetail === 'ls -la');
    expect(ls?.tool).toBe('shell');
  });

  it('reads token totals from token_count.info when present', () => {
    const withInfo = parseFixture().find((o) => o.tokens?.context === 1300);
    expect(withInfo?.tokens?.contextWindow).toBe(272000);
    expect(withInfo?.tokens?.output).toBe(300);
  });

  it('falls back to rate-limit percent when info is null', () => {
    const obs = parseFixture();
    // The null-info token_count is the 2nd token_count line.
    const pctBased = obs.filter((o) => o.tokens?.context !== undefined);
    const last = pctBased[pctBased.length - 1];
    expect(last.tokens?.context).toBe(Math.round(0.74 * 272000));
  });

  it('marks task_complete as awaiting input', () => {
    const obs = parseFixture();
    expect(obs[obs.length - 1].state).toBe('awaiting-input');
  });
});

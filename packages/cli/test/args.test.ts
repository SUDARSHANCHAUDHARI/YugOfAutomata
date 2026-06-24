import { describe, expect, it } from 'vitest';
import { parseArgs } from '../src/args.js';

describe('parseArgs', () => {
  it('enables demo and open flags', () => {
    expect(parseArgs(['--demo', '--open'])).toMatchObject({ demo: true, open: true });
  });

  it('parses source filters', () => {
    expect(parseArgs(['--sources', 'codex,claude']).sources).toEqual(['codex', 'claude']);
  });
});

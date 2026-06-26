import { describe, expect, it } from 'vitest';
import { parseArgs } from '../src/args.js';

describe('parseArgs', () => {
  it('enables demo and open flags', () => {
    expect(parseArgs(['--demo', '--open'])).toMatchObject({ demo: true, open: true });
  });

  it('parses source filters', () => {
    expect(parseArgs(['--sources', 'codex,claude']).sources).toEqual(['codex', 'claude']);
  });

  it('defaults to live mode with no flags', () => {
    expect(parseArgs([])).toMatchObject({ demo: false, open: false });
  });

  it('parses --port and --host', () => {
    const options = parseArgs(['--port', '9000', '--host', '0.0.0.0']);
    expect(options.port).toBe(9000);
    expect(options.host).toBe('0.0.0.0');
  });

  it('ignores a non-numeric port', () => {
    expect(parseArgs(['--port', 'abc']).port).toBeUndefined();
  });
});

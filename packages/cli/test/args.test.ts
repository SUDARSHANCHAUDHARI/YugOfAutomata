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

  it('enables the local-LLM proxy via flag or subcommand', () => {
    expect(parseArgs(['--proxy']).proxy).toBe(true);
    expect(parseArgs(['local-proxy']).proxy).toBe(true);
    expect(parseArgs([]).proxy).toBe(false);
  });

  it('parses proxy port and upstream (implying --proxy)', () => {
    const options = parseArgs(['--proxy-port', '9999', '--proxy-upstream', 'http://127.0.0.1:1234']);
    expect(options.proxy).toBe(true);
    expect(options.proxyPort).toBe(9999);
    expect(options.proxyUpstream).toBe('http://127.0.0.1:1234');
  });
});

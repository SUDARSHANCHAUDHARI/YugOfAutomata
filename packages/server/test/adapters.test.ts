import { describe, expect, it } from 'vitest';
import { availableAdapters, selectAdapters } from '../src/adapters/index.js';

describe('selectAdapters', () => {
  it('returns all live adapters when no filter is given', () => {
    const ids = selectAdapters(undefined).map((a) => a.id);
    expect(ids).toContain('claude');
    expect(ids).toContain('codex');
  });

  it('filters to the requested supported sources', () => {
    expect(selectAdapters(['codex']).map((a) => a.id)).toEqual(['codex']);
  });

  it('ignores unsupported or unknown sources', () => {
    expect(selectAdapters(['opencode', 'koda', 'demo']).map((a) => a.id)).toEqual([]);
  });

  it('exposes the available adapter ids', () => {
    expect(availableAdapters.map((a) => a.id).sort()).toEqual(['claude', 'codex']);
  });
});

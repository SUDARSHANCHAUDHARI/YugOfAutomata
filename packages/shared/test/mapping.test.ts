import { describe, expect, it } from 'vitest';
import { DEFAULT_BUILDING_MAPPING, resolveBuilding } from '../src/index.js';

describe('resolveBuilding', () => {
  it('maps edit tools to the forge', () => {
    expect(resolveBuilding('apply_patch', undefined, DEFAULT_BUILDING_MAPPING)).toBe('forge');
    expect(resolveBuilding('write_file', 'App.tsx', DEFAULT_BUILDING_MAPPING)).toBe('forge');
  });

  it('maps shell git publishing work to the caravan', () => {
    expect(resolveBuilding('shell', 'git push origin main', DEFAULT_BUILDING_MAPPING)).toBe('caravan');
  });

  it('maps MCP-style tools to the guildhall', () => {
    expect(resolveBuilding('mcp__github__list_prs', undefined, DEFAULT_BUILDING_MAPPING)).toBe('guildhall');
  });

  it('falls back to core for unknown tools', () => {
    expect(resolveBuilding('mystery_tool', undefined, DEFAULT_BUILDING_MAPPING)).toBe('core');
  });
});

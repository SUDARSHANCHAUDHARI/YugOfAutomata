import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APP_SETTINGS,
  RECENT_ACTIONS_CAP,
  contextWindowForModel,
  type AdapterObservation
} from '../src/index.js';

describe('contextWindowForModel', () => {
  it('resolves known Claude and Codex models', () => {
    expect(contextWindowForModel('claude-sonnet-4-6')).toBe(200000);
    expect(contextWindowForModel('gpt-5.4')).toBe(272000);
    expect(contextWindowForModel('gpt-5.4-codex')).toBe(272000);
  });

  it('falls back to a safe default for unknown models', () => {
    expect(contextWindowForModel('mystery-model')).toBe(200000);
    expect(contextWindowForModel(undefined)).toBe(200000);
  });
});

describe('protocol defaults', () => {
  it('caps recent actions to a small number', () => {
    expect(RECENT_ACTIONS_CAP).toBeGreaterThan(0);
    expect(RECENT_ACTIONS_CAP).toBeLessThanOrEqual(20);
  });

  it('ships default settings with all sources enabled and a mapping', () => {
    expect(DEFAULT_APP_SETTINGS.theme).toBe('dark');
    expect(DEFAULT_APP_SETTINGS.sources.claude.enabled).toBe(true);
    expect(DEFAULT_APP_SETTINGS.sources.codex.enabled).toBe(true);
    expect(DEFAULT_APP_SETTINGS.mapping.fallback).toBe('core');
  });

  it('describes a normalized observation shape', () => {
    const obs: AdapterObservation = {
      source: 'claude',
      sessionId: 's1',
      ts: '2026-06-26T00:00:00.000Z',
      tool: 'apply_patch',
      tokens: { input: 10, output: 5 }
    };
    expect(obs.source).toBe('claude');
  });
});

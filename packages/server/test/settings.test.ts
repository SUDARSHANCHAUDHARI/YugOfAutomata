import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_APP_SETTINGS } from '@yug-of-automata/shared';
import { loadSettings, saveSettings, normalizeSettings, settingsDir } from '../src/settings.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'yoa-settings-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('settingsDir', () => {
  it('honors XDG_CONFIG_HOME', () => {
    const resolved = settingsDir({ XDG_CONFIG_HOME: '/tmp/cfg' }, '/home/u');
    expect(resolved).toBe('/tmp/cfg/yug-of-automata');
  });

  it('falls back to ~/.config', () => {
    expect(settingsDir({}, '/home/u')).toBe('/home/u/.config/yug-of-automata');
  });
});

describe('load/save settings', () => {
  it('returns defaults when no file exists', async () => {
    await expect(loadSettings(dir)).resolves.toEqual(DEFAULT_APP_SETTINGS);
  });

  it('round-trips a saved change', async () => {
    await saveSettings(dir, { ...DEFAULT_APP_SETTINGS, theme: 'light' });
    const loaded = await loadSettings(dir);
    expect(loaded.theme).toBe('light');
  });

  it('falls back to defaults on corrupt json without throwing', async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'settings.json'), '{not json');
    await expect(loadSettings(dir)).resolves.toEqual(DEFAULT_APP_SETTINGS);
  });
});

describe('normalizeSettings', () => {
  it('fills missing keys from defaults', () => {
    const result = normalizeSettings({ theme: 'light' });
    expect(result.theme).toBe('light');
    expect(result.sources.claude.enabled).toBe(true);
    expect(result.mapping.fallback).toBe('core');
  });

  it('rejects an invalid theme', () => {
    const result = normalizeSettings({ theme: 'neon' });
    expect(result.theme).toBe('dark');
  });
});

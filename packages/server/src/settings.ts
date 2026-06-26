import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_BUILDING_MAPPING,
  type AppSettings,
  type BuildingMapping
} from '@yug-of-automata/shared';

export function settingsDir(
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir()
): string {
  const xdg = env.XDG_CONFIG_HOME;
  const base = xdg && xdg.length > 0 ? xdg : join(home, '.config');
  return join(base, 'yug-of-automata');
}

function settingsFile(dir: string): string {
  return join(dir, 'settings.json');
}

function normalizeMapping(raw: unknown): BuildingMapping {
  if (!raw || typeof raw !== 'object') return DEFAULT_BUILDING_MAPPING;
  const candidate = raw as Partial<BuildingMapping>;
  if (!Array.isArray(candidate.rules) || typeof candidate.fallback !== 'string') {
    return DEFAULT_BUILDING_MAPPING;
  }
  return { rules: candidate.rules, fallback: candidate.fallback };
}

export function normalizeSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_APP_SETTINGS;
  const candidate = raw as Partial<AppSettings>;
  const theme = candidate.theme === 'light' ? 'light' : 'dark';

  const sources = { ...DEFAULT_APP_SETTINGS.sources };
  if (candidate.sources && typeof candidate.sources === 'object') {
    for (const key of Object.keys(sources) as (keyof typeof sources)[]) {
      const value = candidate.sources[key];
      if (value && typeof value.enabled === 'boolean') {
        sources[key] = { enabled: value.enabled };
      }
    }
  }

  return { theme, sources, mapping: normalizeMapping(candidate.mapping) };
}

export async function loadSettings(dir: string = settingsDir()): Promise<AppSettings> {
  try {
    const raw = await readFile(settingsFile(dir), 'utf8');
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export async function saveSettings(
  dir: string,
  settings: AppSettings
): Promise<AppSettings> {
  const normalized = normalizeSettings(settings);
  await mkdir(dir, { recursive: true });
  await writeFile(settingsFile(dir), `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

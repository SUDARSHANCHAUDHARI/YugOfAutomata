import type { AppSettings, BuildingId, BuildingMapping } from '@yug-of-automata/shared';

export interface BuildingStats {
  current: Partial<Record<BuildingId, number>>;
  day: Partial<Record<BuildingId, number>>;
  week: Partial<Record<BuildingId, number>>;
  month: Partial<Record<BuildingId, number>>;
}

export async function getBuildingStats(): Promise<BuildingStats> {
  const response = await fetch('/building-stats');
  if (!response.ok) throw new Error(`getBuildingStats failed: ${response.status}`);
  return (await response.json()) as BuildingStats;
}

export async function getSettings(): Promise<AppSettings> {
  const response = await fetch('/settings');
  if (!response.ok) throw new Error(`getSettings failed: ${response.status}`);
  return (await response.json()) as AppSettings;
}

export async function putSettings(settings: AppSettings): Promise<AppSettings> {
  const response = await fetch('/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!response.ok) throw new Error(`putSettings failed: ${response.status}`);
  return (await response.json()) as AppSettings;
}

export async function putMapping(mapping: BuildingMapping): Promise<BuildingMapping> {
  const response = await fetch('/mapping', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(mapping)
  });
  if (!response.ok) throw new Error(`putMapping failed: ${response.status}`);
  return (await response.json()) as BuildingMapping;
}

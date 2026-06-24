import {
  DEFAULT_BUILDING_MAPPING,
  type AutomatonSnapshot,
  type AutomatonState,
  resolveBuilding
} from '@yug-of-automata/shared';
import type { World } from './world.js';

const tools = [
  ['read_file', 'Inspecting project files'],
  ['rg', 'Finding source references'],
  ['apply_patch', 'Editing renderer'],
  ['shell', 'npm test'],
  ['web_search', 'Researching docs'],
  ['mcp__github__list_prs', 'Checking pull requests'],
  ['shell', 'git push origin main']
] as const;

const states: AutomatonState[] = ['thinking', 'working', 'working', 'awaiting-input', 'returning'];

export function startDemoWorld(world: World): () => void {
  let tick = 0;
  const startedAt = new Date().toISOString();

  const update = () => {
    const now = new Date().toISOString();
    for (let index = 0; index < 4; index += 1) {
      const [tool, detail] = tools[(tick + index) % tools.length];
      const state = states[(tick + index) % states.length];
      const currentBuilding = state === 'working'
        ? resolveBuilding(tool, detail, DEFAULT_BUILDING_MAPPING)
        : state === 'awaiting-input'
          ? 'shrine'
          : state === 'returning'
            ? 'storehouse'
            : 'core';

      const automaton: AutomatonSnapshot = {
        sessionId: `demo-${index + 1}`,
        source: index % 2 === 0 ? 'codex' : 'claude',
        title: ['Shape the city', 'Wire transcript parser', 'Polish command hall', 'Prepare release'][index],
        cityId: index < 2 ? 'city-yug' : 'city-sample',
        cityName: index < 2 ? 'YugOfAutomata' : 'SamplePlugin',
        workingDir: index < 2 ? '/demo/YugOfAutomata' : '/demo/SamplePlugin',
        model: index % 2 === 0 ? 'gpt-5.4-codex' : 'sonnet',
        state,
        currentTool: state === 'working' ? tool : undefined,
        toolDetail: state === 'working' ? detail : undefined,
        currentBuilding,
        tokens: {
          input: 5000 + tick * 120 + index * 900,
          output: 700 + tick * 45 + index * 120,
          context: 12000 + tick * 320 + index * 2000,
          contextWindow: 200000
        },
        recentActions: [
          {
            tool,
            detail,
            building: resolveBuilding(tool, detail, DEFAULT_BUILDING_MAPPING),
            ts: now
          }
        ],
        startedAt,
        lastActivityAt: now
      };
      world.upsertAutomaton(automaton);
    }
    tick += 1;
  };

  update();
  const interval = setInterval(update, 1500);
  return () => clearInterval(interval);
}

import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text } from 'pixi.js';
import type { AutomatonSnapshot, AutomatonState, BuildingId, WorkerSnapshot } from '@yug-of-automata/shared';

const stateColors: Record<AutomatonState, number> = {
  idle: 0x8b9bb4,
  thinking: 0x9fb7ff,
  working: 0xd8e6ff,
  'awaiting-input': 0xf2d16b,
  returning: 0xb88b4a,
  error: 0xef6f6c,
  recovering: 0xefc06c
};

const buildingPositions: Record<BuildingId, { x: number; y: number; label: string; color: number }> = {
  core: { x: 420, y: 260, label: 'Core', color: 0x8b9bb4 },
  forge: { x: 230, y: 180, label: 'Forge', color: 0xd96b3b },
  archive: { x: 610, y: 180, label: 'Archive', color: 0x58a6ff },
  mine: { x: 210, y: 390, label: 'Mine', color: 0xc9a227 },
  observatory: { x: 650, y: 380, label: 'Observatory', color: 0x8f7cf6 },
  guildhall: { x: 420, y: 110, label: 'Guildhall', color: 0x4ec9a2 },
  caravan: { x: 120, y: 280, label: 'Caravan', color: 0xe0b15a },
  workshop: { x: 730, y: 275, label: 'Workshop', color: 0x7cc66a },
  barracks: { x: 350, y: 430, label: 'Barracks', color: 0xc05c7e },
  shrine: { x: 500, y: 430, label: 'Shrine', color: 0xf2d16b },
  infirmary: { x: 560, y: 300, label: 'Infirmary', color: 0xef6f6c },
  storehouse: { x: 300, y: 300, label: 'Storehouse', color: 0xb88b4a }
};

export function GameCanvas({
  automata,
  workers,
  selectedId,
  onSelect
}: {
  automata: AutomatonSnapshot[];
  workers: WorkerSnapshot[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hostRef.current || appRef.current) return;
    const app = new Application();
    appRef.current = app;

    void app.init({ width: 900, height: 560, background: '#151a22', antialias: true }).then(() => {
      hostRef.current?.appendChild(app.canvas);
      setReady(true);
    });

    return () => {
      app.destroy(true);
      appRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    if (!app || !ready) return;
    app.stage.removeChildren();

    const world = new Container();
    app.stage.addChild(world);

    drawGround(world);
    for (const building of Object.values(buildingPositions)) {
      drawBuilding(world, building.x, building.y, building.label, building.color);
    }

    automata.forEach((automaton, index) => {
      const target = buildingPositions[automaton.currentBuilding] ?? buildingPositions.core;
      const angle = index * 1.7;
      const x = target.x + Math.cos(angle) * 34;
      const y = target.y + Math.sin(angle) * 24;
      drawAutomaton(world, x, y, automaton, automaton.sessionId === selectedId, onSelect);
    });

    workers.forEach((worker, index) => {
      const target = buildingPositions[worker.currentBuilding] ?? buildingPositions.barracks;
      const x = target.x - 30 + (index % 4) * 18;
      const y = target.y + 18 + Math.floor(index / 4) * 16;
      drawWorker(world, x, y);
    });
  }, [automata, workers, selectedId, onSelect, ready]);

  return <section className="game-frame" ref={hostRef} />;
}

function drawGround(stage: Container) {
  const ground = new Graphics();
  ground.roundRect(40, 40, 820, 480, 18).fill(0x202a25).stroke({ color: 0x30463b, width: 2 });
  for (let x = 100; x < 820; x += 80) {
    ground.moveTo(x, 70).lineTo(x - 90, 510).stroke({ color: 0x2d3b34, width: 1, alpha: 0.35 });
  }
  stage.addChild(ground);
}

function drawBuilding(stage: Container, x: number, y: number, label: string, color: number) {
  const building = new Graphics();
  building.roundRect(x - 42, y - 28, 84, 56, 6).fill(color).stroke({ color: 0x0f141b, width: 3 });
  building.moveTo(x - 42, y - 28).lineTo(x, y - 58).lineTo(x + 42, y - 28).fill(color + 0x101010);
  const text = new Text({ text: label, style: { fill: '#f4f1e8', fontSize: 11, fontFamily: 'Inter, sans-serif' } });
  text.anchor.set(0.5, 0);
  text.position.set(x, y + 34);
  stage.addChild(building, text);
}

function drawAutomaton(
  stage: Container,
  x: number,
  y: number,
  automaton: AutomatonSnapshot,
  selected: boolean,
  onSelect: (id: string) => void
) {
  const bodyColor = selected ? 0xf6d36b : stateColors[automaton.state] ?? 0xd8e6ff;
  const marker = new Graphics();
  marker.circle(x, y, selected ? 15 : 12).fill(bodyColor).stroke({ color: 0x0b0f16, width: 3 });
  marker.rect(x - 5, y - 24, 10, 16).fill(0x9fb7ff);
  marker.eventMode = 'static';
  marker.cursor = 'pointer';
  marker.on('pointertap', () => onSelect(automaton.sessionId));

  const text = new Text({ text: automaton.source, style: { fill: '#10151c', fontSize: 9, fontWeight: '700' } });
  text.anchor.set(0.5);
  text.position.set(x, y);
  stage.addChild(marker, text);
}

function drawWorker(stage: Container, x: number, y: number) {
  const marker = new Graphics();
  marker
    .poly([x, y - 7, x + 6, y + 5, x - 6, y + 5])
    .fill(0xc05c7e)
    .stroke({ color: 0x0b0f16, width: 2 });
  stage.addChild(marker);
}

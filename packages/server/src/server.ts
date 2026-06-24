import Fastify from 'fastify';
import { WebSocket, WebSocketServer } from 'ws';
import { SERVER_PORT, WS_PATH, type WorldEvent } from '@yug-of-automata/shared';
import { startDemoWorld } from './demo.js';
import { World } from './world.js';

export interface StartServerOptions {
  port?: number;
  host?: string;
  demo: boolean;
}

export interface RunningServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

export async function startServer(options: StartServerOptions): Promise<RunningServer> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? SERVER_PORT;
  const app = Fastify({ logger: false });
  const world = new World();

  app.get('/health', async () => ({ ok: true, demo: options.demo }));

  await app.listen({ host, port });
  const address = app.server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  const url = `http://${host}:${actualPort}`;

  const wss = new WebSocketServer({ server: app.server, path: WS_PATH });
  const send = (socket: WebSocket, event: WorldEvent): void => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
  };

  wss.on('connection', (socket) => {
    send(socket, { type: 'snapshot', ...world.snapshot() });
  });

  const offWorld = world.onEvent((event) => {
    for (const socket of wss.clients) send(socket, event);
  });
  const stopDemo = options.demo ? startDemoWorld(world) : undefined;

  return {
    url,
    port: actualPort,
    close: async () => {
      stopDemo?.();
      offWorld();
      await new Promise<void>((resolve, reject) => {
        wss.close((error) => (error ? reject(error) : resolve()));
      });
      await app.close();
    }
  };
}

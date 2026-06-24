import { WS_PATH, type WorldEvent } from '@yug-of-automata/shared';
import { useWorld } from './store';

export function connectWorld(): void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}${WS_PATH}`;
  let retryMs = 1000;

  const open = () => {
    const socket = new WebSocket(url);
    socket.onopen = () => {
      retryMs = 1000;
      useWorld.getState().setConnected(true);
    };
    socket.onmessage = (message) => {
      const event = JSON.parse(String(message.data)) as WorldEvent;
      useWorld.getState().apply(event);
    };
    socket.onclose = () => {
      useWorld.getState().setConnected(false);
      window.setTimeout(open, retryMs);
      retryMs = Math.min(retryMs * 2, 15000);
    };
  };

  open();
}

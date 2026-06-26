#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { platform } from 'node:os';
import { startServer } from '@yug-of-automata/server';
import { parseArgs } from './args.js';

export { parseArgs } from './args.js';

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const server = await startServer({
    demo: options.demo,
    sources: options.sources,
    port: options.port,
    host: options.host,
    proxy: options.proxy ? { port: options.proxyPort, upstream: options.proxyUpstream } : undefined
  });
  console.log(`Yug of Automata: ${server.url}`);
  console.log(`Mode: ${options.demo ? 'demo' : 'live'}`);
  if (!options.demo) console.log(`Sources: ${server.sources.join(', ') || 'none active'}`);
  if (server.proxyUrl) console.log(`Local-LLM proxy: ${server.proxyUrl}`);
  if (options.open) openBrowser(server.url);
}

function openBrowser(url: string): void {
  const command = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'cmd' : 'xdg-open';
  const args = platform() === 'win32' ? ['/c', 'start', url] : [url];
  execFile(command, args);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}

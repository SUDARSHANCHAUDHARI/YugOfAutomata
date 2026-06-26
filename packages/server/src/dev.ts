import { SERVER_PORT } from '@yug-of-automata/shared';
import { startServer } from './server.js';

const demo = process.argv.includes('--demo');
const server = await startServer({ port: SERVER_PORT, demo });

console.log(`Yug of Automata server: ${server.url}`);
console.log(`Mode: ${demo ? 'demo' : 'live'}`);
if (!demo) console.log(`Sources: ${server.sources.join(', ') || 'none active'}`);

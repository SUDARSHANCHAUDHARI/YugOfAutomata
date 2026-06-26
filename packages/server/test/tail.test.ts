import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileTailer } from '../src/adapters/tail.js';

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'yoa-tail-'));
  file = join(dir, 'log.jsonl');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('FileTailer', () => {
  it('reads only newly appended complete lines', async () => {
    const tailer = new FileTailer();
    await writeFile(file, '{"a":1}\n{"a":2}\n');
    expect(await tailer.readLines(file)).toEqual(['{"a":1}', '{"a":2}']);

    // No new content -> nothing.
    expect(await tailer.readLines(file)).toEqual([]);

    await appendFile(file, '{"a":3}\n');
    expect(await tailer.readLines(file)).toEqual(['{"a":3}']);
  });

  it('does not emit a partial trailing line until it is completed', async () => {
    const tailer = new FileTailer();
    await writeFile(file, '{"a":1}\n{"partial":');
    expect(await tailer.readLines(file)).toEqual(['{"a":1}']);

    await appendFile(file, 'true}\n');
    expect(await tailer.readLines(file)).toEqual(['{"partial":true}']);
  });

  it('resets when a file is truncated or rotated', async () => {
    const tailer = new FileTailer();
    await writeFile(file, '{"a":1}\n{"a":2}\n');
    await tailer.readLines(file);

    await writeFile(file, '{"fresh":1}\n');
    expect(await tailer.readLines(file)).toEqual(['{"fresh":1}']);
  });

  it('seekToEnd skips existing content so large files are not backfilled', async () => {
    const tailer = new FileTailer();
    await writeFile(file, '{"old":1}\n{"old":2}\n');
    await tailer.seekToEnd(file);
    expect(await tailer.readLines(file)).toEqual([]);

    await appendFile(file, '{"new":1}\n');
    expect(await tailer.readLines(file)).toEqual(['{"new":1}']);
  });
});

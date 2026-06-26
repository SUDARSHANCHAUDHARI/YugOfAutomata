import chokidar from 'chokidar';
import { open, stat } from 'node:fs/promises';

/**
 * Tracks a byte offset per file and returns only complete lines appended since
 * the last read. Never reads a file whole on subsequent reads, so multi-hundred
 * megabyte transcripts stay cheap. Tolerates truncation/rotation by resetting.
 */
export class FileTailer {
  private readonly offsets = new Map<string, number>();

  async seekToEnd(path: string): Promise<void> {
    try {
      const info = await stat(path);
      this.offsets.set(path, info.size);
    } catch {
      this.offsets.set(path, 0);
    }
  }

  async readLines(path: string): Promise<string[]> {
    let size: number;
    try {
      size = (await stat(path)).size;
    } catch {
      return [];
    }

    let offset = this.offsets.get(path) ?? 0;
    if (offset > size) offset = 0; // truncated or rotated
    if (offset >= size) {
      this.offsets.set(path, size);
      return [];
    }

    const buffer = Buffer.alloc(size - offset);
    const handle = await open(path, 'r');
    try {
      await handle.read(buffer, 0, buffer.length, offset);
    } finally {
      await handle.close();
    }

    const lastNewline = buffer.lastIndexOf(0x0a);
    if (lastNewline === -1) {
      return []; // only a partial line so far; leave the offset untouched
    }

    const consumed = buffer.subarray(0, lastNewline + 1);
    this.offsets.set(path, offset + consumed.length);
    return consumed
      .toString('utf8')
      .split('\n')
      .filter((line) => line.length > 0);
  }
}

export interface WatchOptions {
  /** Absolute glob pattern(s) of transcript files to watch. */
  patterns: string | string[];
  /** Files whose mtime is older than this are treated as inactive. */
  activeWindowMs: number;
  usePolling?: boolean;
  onLines: (path: string, lines: string[]) => void;
}

/**
 * Watches transcript files and streams newly appended lines. Files present at
 * startup are seeked to their end (no history backfill); files created or
 * changed afterwards are tailed from the last offset. Inactive files are
 * skipped based on mtime.
 */
export function watchTranscripts(options: WatchOptions): () => void {
  const tailer = new FileTailer();
  let ready = false;

  const isActive = async (path: string): Promise<boolean> => {
    try {
      const info = await stat(path);
      return Date.now() - info.mtimeMs <= options.activeWindowMs;
    } catch {
      return false;
    }
  };

  const emit = async (path: string): Promise<void> => {
    if (!(await isActive(path))) return;
    const lines = await tailer.readLines(path);
    if (lines.length > 0) options.onLines(path, lines);
  };

  const watcher = chokidar.watch(options.patterns, {
    ignoreInitial: false,
    usePolling: options.usePolling ?? false,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 }
  });

  watcher
    .on('add', (path) => {
      if (!ready) {
        void tailer.seekToEnd(path);
        return;
      }
      void emit(path);
    })
    .on('change', (path) => {
      void emit(path);
    })
    .on('ready', () => {
      ready = true;
    });

  return () => {
    void watcher.close();
  };
}

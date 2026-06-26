import chokidar from 'chokidar';
import { open, readFile, stat } from 'node:fs/promises';

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
  /**
   * Root director(ies) to watch recursively. chokidar v4+ does not support
   * globs, so we watch directories and filter files with `match`.
   */
  roots: string | string[];
  /** Returns true for files this watcher should tail (e.g. `*.jsonl`). */
  match: (path: string) => boolean;
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

  const watcher = chokidar.watch(options.roots, {
    ignoreInitial: false,
    usePolling: options.usePolling ?? false,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 }
  });

  watcher
    .on('add', (path) => {
      if (!options.match(path)) return;
      if (!ready) {
        void tailer.seekToEnd(path);
        return;
      }
      void emit(path);
    })
    .on('change', (path) => {
      if (!options.match(path)) return;
      void emit(path);
    })
    .on('ready', () => {
      ready = true;
    });

  return () => {
    void watcher.close();
  };
}

export interface WatchFilesOptions {
  /** Root director(ies) to watch recursively. */
  roots: string | string[];
  /** Returns true for files to read (e.g. `*.json`). */
  match: (path: string) => boolean;
  /** Files whose mtime is older than this are ignored. */
  activeWindowMs: number;
  usePolling?: boolean;
  onFile: (path: string, contents: string) => void;
}

/**
 * Watches a directory tree and reads whole files when they are created or
 * changed, for sources that store activity as many small per-event JSON files
 * (e.g. OpenCode). Files present at startup are ignored (no history backfill);
 * inactive files are skipped by mtime.
 */
export function watchFiles(options: WatchFilesOptions): () => void {
  const emit = async (path: string): Promise<void> => {
    try {
      const info = await stat(path);
      if (Date.now() - info.mtimeMs > options.activeWindowMs) return;
      const contents = await readFile(path, 'utf8');
      options.onFile(path, contents);
    } catch {
      // File vanished or unreadable; ignore.
    }
  };

  const watcher = chokidar.watch(options.roots, {
    ignoreInitial: true,
    usePolling: options.usePolling ?? false,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 }
  });

  watcher
    .on('add', (path) => {
      if (options.match(path)) void emit(path);
    })
    .on('change', (path) => {
      if (options.match(path)) void emit(path);
    });

  return () => {
    void watcher.close();
  };
}

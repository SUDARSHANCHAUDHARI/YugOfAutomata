import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseOpenCodeFile } from '../src/adapters/opencode.js';

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures/opencode', name), 'utf8');
}

describe('parseOpenCodeFile', () => {
  it('reads a session into cwd and title', () => {
    const obs = parseOpenCodeFile(fixture('session.json'));
    expect(obs?.source).toBe('opencode');
    expect(obs?.sessionId).toBe('ses_main');
    expect(obs?.cwd).toBe('/Users/dev/Widget');
    expect(obs?.title).toBe('Wire up the widget');
    expect(obs?.worker).toBeUndefined();
  });

  it('emits a sub-session as a worker linked to its parent', () => {
    const obs = parseOpenCodeFile(fixture('session-sub.json'));
    expect(obs?.sessionId).toBe('ses_main');
    expect(obs?.worker?.id).toBe('ses_sub');
  });

  it('reads model and context tokens from an assistant message', () => {
    const obs = parseOpenCodeFile(fixture('message-assistant.json'));
    expect(obs?.model).toBe('glm-4.7-flash:latest');
    expect(obs?.tokens?.context).toBe(1200 + 8000 + 500);
    expect(obs?.tokens?.output).toBe(300);
    expect(obs?.state).toBe('working');
  });

  it('captures the title from a user message', () => {
    const obs = parseOpenCodeFile(fixture('message-user.json'));
    expect(obs?.title).toBe('Wire up the widget');
    expect(obs?.state).toBe('thinking');
  });

  it('normalizes a tool part and extracts detail', () => {
    const obs = parseOpenCodeFile(fixture('part-tool.json'));
    expect(obs?.tool).toBe('edit_file');
    expect(obs?.toolDetail).toBe('src/widget.ts');
    expect(obs?.state).toBe('working');
  });

  it('marks an errored tool part as error', () => {
    const obs = parseOpenCodeFile(fixture('part-tool-error.json'));
    expect(obs?.tool).toBe('shell');
    expect(obs?.toolDetail).toBe('npm test');
    expect(obs?.state).toBe('error');
    expect(obs?.isError).toBe(true);
  });

  it('ignores non-tool parts', () => {
    expect(parseOpenCodeFile(fixture('part-text.json'))).toBeUndefined();
  });

  it('ignores unparseable input', () => {
    expect(parseOpenCodeFile('{not json')).toBeUndefined();
  });
});

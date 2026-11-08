import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { AgentRunRecord, IRunLog } from '../application/ports';

/** Appends one JSON line per agent run to `<runsDir>/runs.jsonl` (git-ignored). */
export class JsonlRunLog implements IRunLog {
  constructor(private readonly runsDir: string) {}

  async append(record: AgentRunRecord): Promise<void> {
    await mkdir(this.runsDir, { recursive: true });
    await appendFile(path.join(this.runsDir, 'runs.jsonl'), `${JSON.stringify(record)}\n`, 'utf8');
  }
}

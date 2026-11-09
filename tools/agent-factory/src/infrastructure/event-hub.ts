import { appendFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { FactoryEvent, IEventSink } from '../application/ports';

type Listener = (event: FactoryEvent) => void;

const MAX_FILE_BYTES_TO_LOAD = 20 * 1024 * 1024;

/**
 * In-process publish/subscribe for run events, with a bounded history. Every event is also appended to
 * `<runsDir>/events.jsonl`, and the last events are loaded from it at start, so the dashboard keeps its
 * history across restarts. One hub per process (see `eventHub`), shared by every route.
 */
export class EventHub implements IEventSink {
  private readonly events: FactoryEvent[] = [];
  private readonly listeners = new Set<Listener>();
  private writing: Promise<void> = Promise.resolve();

  constructor(
    private readonly file?: string,
    private readonly maxEvents = 5_000,
  ) {
    if (file) this.load(file);
  }

  publish(event: FactoryEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) this.events.splice(0, this.events.length - this.maxEvents);
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // A broken subscriber (closed stream) must not affect the run or other subscribers.
      }
    }
    if (this.file) {
      const file = this.file;
      const line = `${JSON.stringify(event)}\n`;
      this.writing = this.writing.then(() => mkdir(path.dirname(file), { recursive: true }).then(() => appendFile(file, line, 'utf8'))).catch(() => undefined);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  history(): readonly FactoryEvent[] {
    return [...this.events];
  }

  private load(file: string): void {
    try {
      if (!existsSync(file) || statSync(file).size > MAX_FILE_BYTES_TO_LOAD) return;
      const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(-this.maxEvents);
      for (const line of lines) {
        try {
          this.events.push(JSON.parse(line) as FactoryEvent);
        } catch {
          // Skip a torn line.
        }
      }
    } catch {
      // History is best effort.
    }
  }
}

const HUB_KEY = Symbol.for('hexablock.agent-factory.event-hub');

/** The process-wide hub. Stored on globalThis so Next.js dev reloads keep one hub and its subscribers. */
export function eventHub(runsDir: string): EventHub {
  const holder = globalThis as unknown as Record<symbol, EventHub | undefined>;
  holder[HUB_KEY] ??= new EventHub(path.join(runsDir, 'events.jsonl'));
  return holder[HUB_KEY];
}

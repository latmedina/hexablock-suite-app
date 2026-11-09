import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FactoryEvent } from '../src/application/ports';
import { EventHub } from '../src/infrastructure/event-hub';

const started = (runId: string): FactoryEvent => ({ type: 'run.started', runId, at: '2026-11-09T00:00:00.000Z', request: 'x' });

describe('EventHub', () => {
  it('should_deliver_event_to_subscriber_when_published', () => {
    // Arrange
    const hub = new EventHub();
    const seen: FactoryEvent[] = [];
    hub.subscribe((e) => seen.push(e));
    // Act
    hub.publish(started('r1'));
    // Assert
    expect(seen.map((e) => e.runId)).toEqual(['r1']);
  });

  it('should_keep_only_latest_events_when_history_is_full', () => {
    // Arrange
    const hub = new EventHub(undefined, 2);
    // Act
    ['r1', 'r2', 'r3'].forEach((id) => hub.publish(started(id)));
    // Assert
    expect(hub.history().map((e) => e.runId)).toEqual(['r2', 'r3']);
  });

  it('should_reload_history_from_file_when_a_new_hub_starts', async () => {
    // Arrange
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'hub-')), 'events.jsonl');
    const first = new EventHub(file);
    first.publish(started('r1'));
    await new Promise((r) => setTimeout(r, 50));
    // Act
    const second = new EventHub(file);
    // Assert
    expect(readFileSync(file, 'utf8')).toContain('"r1"');
    expect(second.history().map((e) => e.runId)).toEqual(['r1']);
  });

  it('should_keep_publishing_when_a_subscriber_throws', () => {
    // Arrange
    const hub = new EventHub();
    const seen: string[] = [];
    hub.subscribe(() => {
      throw new Error('closed stream');
    });
    hub.subscribe((e) => seen.push(e.runId));
    // Act
    hub.publish(started('r1'));
    // Assert
    expect(seen).toEqual(['r1']);
  });
});

import type { FactoryEvent, FactoryEventInput, IClock, IEventSink, IRunEvents } from './ports';

/** Binds an event sink to one run. */
export class RunEvents implements IRunEvents {
  constructor(
    private readonly sink: IEventSink,
    readonly runId: string,
    private readonly clock: IClock = { now: () => new Date() },
  ) {}

  emit(event: FactoryEventInput): void {
    try {
      this.sink.publish({ ...event, runId: this.runId, at: this.clock.now().toISOString() } as FactoryEvent);
    } catch {
      // Observability must never break a run.
    }
  }
}

/** Sink that drops everything (tests, scripts without a dashboard). */
export const NO_EVENTS: IEventSink = { publish: () => undefined };

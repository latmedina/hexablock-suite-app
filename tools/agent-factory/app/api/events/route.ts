import { isAuthorized } from '../../../src/infrastructure/auth';
import { eventHub } from '../../../src/infrastructure/event-hub';
import { resolveRunsDir } from '../../../src/config/env';
import type { FactoryEvent } from '../../../src/application/ports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/events  (Server-Sent Events) -> every stored event, then each new one as it happens.
 * The dashboard subscribes here; runs started from n8n, the web form or the API all show up.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return new Response('Unauthorized', { status: 401 });
  const hub = eventHub(resolveRunsDir());
  const encoder = new TextEncoder();
  let cleanup = () => undefined as void;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const sendEvent = (event: FactoryEvent) => send(`data: ${JSON.stringify(event)}\n\n`);
      send(`event: history\ndata: ${JSON.stringify(hub.history())}\n\n`);
      const unsubscribe = hub.subscribe(sendEvent);
      const heartbeat = setInterval(() => send(': keep-alive\n\n'), 15_000);
      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
      req.signal.addEventListener('abort', () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  });
}


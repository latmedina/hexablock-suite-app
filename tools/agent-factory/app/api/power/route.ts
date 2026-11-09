import { NextResponse } from 'next/server';
import { isAuthorized } from '../../../src/infrastructure/auth';
import { drainRuns, powerState } from '../../../src/infrastructure/run-registry';
import { localConfig } from '../../../src/infrastructure/ollama-gateway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const local = localConfig();
  let online = false;
  let loaded = false;
  if (local.enabled) {
    try {
      const response = await fetch(`${local.baseUrl}/api/ps`, { signal: AbortSignal.timeout(1000), cache: 'no-store' });
      if (response.ok) {
        const data = await response.json() as { models?: Array<{ name: string }> };
        online = true;
        loaded = data.models?.some(model => model.name === local.model) ?? false;
      }
    } catch { /* Local inference can be unavailable without taking the cloud dashboard down. */ }
  }
  return NextResponse.json({ ...powerState(), managed: process.env.FACTORY_MANAGED === '1', local: { enabled: local.enabled, model: local.model, online, loaded } });
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  drainRuns();
  return NextResponse.json({ ...powerState(), managed: process.env.FACTORY_MANAGED === '1' });
}

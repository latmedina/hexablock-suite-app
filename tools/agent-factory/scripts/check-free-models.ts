/**
 * Live check against https://openrouter.ai/api/v1/models (no API key needed):
 *  1. every model in agents.config.ts still exists,
 *  2. its prompt AND completion price are exactly 0,
 *  3. lists today's free models so the config can be updated.
 * Exit code 1 if any configured model is missing or not free.
 */
import { ALL_CONFIGURED_MODELS } from '../src/config/agents.config';

interface ModelInfo {
  id: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
}

const base = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';
const res = await fetch(`${base}/models`);
if (!res.ok) {
  console.error(`GET /models failed: ${res.status}`);
  process.exit(2);
}
const { data } = (await res.json()) as { data: ModelInfo[] };
const isZero = (v?: string) => v !== undefined && Number(v) === 0;
const free = data.filter((m) => isZero(m.pricing?.prompt) && isZero(m.pricing?.completion));
const byId = new Map(data.map((m) => [m.id, m]));

console.log(`Free models available now (${free.length}):`);
for (const m of free.sort((a, b) => a.id.localeCompare(b.id))) {
  const tools = m.supported_parameters?.includes('tools') ? 'tools' : '';
  console.log(`  ${m.id.padEnd(55)} ctx=${String(m.context_length ?? '?').padEnd(8)} ${tools}`);
}

let failed = false;
console.log('\nConfigured models:');
for (const id of ALL_CONFIGURED_MODELS) {
  const m = byId.get(id);
  const status = !m ? 'MISSING' : isZero(m.pricing?.prompt) && isZero(m.pricing?.completion) ? 'ok (free)' : 'NOT FREE';
  if (status !== 'ok (free)') failed = true;
  console.log(`  ${id.padEnd(55)} ${status}`);
}
if (failed) {
  console.error('\nUpdate src/config/agents.config.ts or set AGENT_<ID>_MODELS before running agents.');
  process.exit(1);
}

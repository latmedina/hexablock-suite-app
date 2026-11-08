/** CLI: npm run pipeline -- "your request"  (reads .env.local via node --env-file if present) */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AgentFactory } from '../src/main/agent-factory';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* optional */
}
const request = process.argv.slice(2).join(' ').trim();
if (!request) {
  console.error('Usage: npm run pipeline -- "<request>"');
  process.exit(1);
}
const factory = AgentFactory.fromEnv();
const { spec, patch } = await factory.architectToDev().run(request);
const outDir = path.resolve('.runs', factory.runId);
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'spec.json'), JSON.stringify(spec.output, null, 2));
for (const f of patch.output.files) {
  const target = path.join(outDir, 'patch', f.path);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, f.content);
}
console.log(`Architect: ${spec.modelUsed} | Dev: ${patch.modelUsed}`);
console.log(`Spec and patch written to ${outDir} — review, then copy into your dev/<name> branch.`);

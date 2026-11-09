/** CLI: npm run pipeline -- "your request"  (reads .env.local via node --env-file if present) */
import { readEnv } from '../src/config/env';
import { archiveRun } from '../src/infrastructure/run-archive';
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
const result = await factory.architectToDev().run(request, 'cli');
const outDir = await archiveRun(readEnv().runsDir, factory.runId, result);
const checks = result.verification ? result.verification.checks.map((c) => `${c.name} ${c.ok ? 'OK' : 'FAILED'}`).join(', ') : 'not run';
console.log(`Architect: ${result.spec.modelUsed} | Dev: ${result.patch.modelUsed} | repair rounds: ${result.repairRounds}`);
console.log(`Checks: ${checks}`);
console.log(result.status === 'ready' ? 'Status: READY (checks pass, no blocking review findings)' : 'Status: NEEDS HUMAN (see checks and review)');
if (result.review) console.log(`Reviewer (${result.review.modelUsed}): ${result.review.output.verdict} — ${result.review.output.summary}`);
console.log(`Spec and patch written to ${outDir} — review, then copy into your dev/<name> branch.`);

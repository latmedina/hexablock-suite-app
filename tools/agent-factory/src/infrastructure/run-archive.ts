import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ArchitectToDevResult } from '../application/pipeline';

/**
 * Writes one run to `<runsDir>/<runId>/`: result.json (everything), spec.json and the patch files under patch/,
 * so a human can review and copy them into a dev/<name> branch. Patch paths were validated by the contract.
 */
export async function archiveRun(runsDir: string, runId: string, result: ArchitectToDevResult): Promise<string> {
  const outDir = path.join(runsDir, runId);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2));
  await writeFile(path.join(outDir, 'spec.json'), JSON.stringify(result.spec.output, null, 2));
  for (const file of result.patch.output.files) {
    const target = path.resolve(outDir, 'patch', file.path);
    if (!target.startsWith(path.join(outDir, 'patch') + path.sep)) continue;
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content);
  }
  return outDir;
}

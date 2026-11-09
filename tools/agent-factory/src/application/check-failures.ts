import type { PatchFile, VerifyCheck, VerifyReport } from './ports';

const TS_ERROR = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm;
const MAX_TS_ERRORS = 15;
const MAX_TEST_FAILURES = 8;

/**
 * Turns failed checks into what the Dev agent needs to fix them: each type error with the offending lines of
 * the patched file, each failing test's own block, or (for anything else) the tail of the output.
 * Free models fix precise, local errors far better than they read a 6 000-character log.
 */
export function describeFailures(report: VerifyReport, files: readonly PatchFile[], budget = 7_000): string {
  const failed = report.checks.filter((c) => !c.ok);
  const perCheck = Math.floor(budget / Math.max(1, failed.length));
  return failed.map((check) => `### ${check.name}\n${clip(describeCheck(check, files), perCheck)}`).join('\n\n');
}

function describeCheck(check: VerifyCheck, files: readonly PatchFile[]): string {
  const tsErrors = [...check.output.matchAll(TS_ERROR)];
  if (tsErrors.length > 0) {
    const shown = tsErrors.slice(0, MAX_TS_ERRORS).map((m) => {
      const [, file = '', line = '0', col = '0', code = '', message = ''] = m;
      const path = file.trim().replace(/^\.\//, '');
      return `- ${path}:${line}:${col} ${code}: ${message}\n${snippet(files, path, Number(line))}`;
    });
    const more = tsErrors.length > MAX_TS_ERRORS ? `\n(${tsErrors.length - MAX_TS_ERRORS} more type errors)` : '';
    return shown.join('\n') + more;
  }
  const failures = check.output.split(/\n(?=\s*● )/).filter((block) => /^\s*● /.test(block));
  if (failures.length > 0) {
    return failures.slice(0, MAX_TEST_FAILURES).map((block) => clip(block.trim(), 900)).join('\n\n');
  }
  return tail(check.output, 3_000);
}

function snippet(files: readonly PatchFile[], path: string, line: number): string {
  const file = files.find((f) => f.path === path);
  if (!file) return '  (this file is not in your patch: the error comes from how other files use your code)';
  const lines = file.content.split('\n');
  const from = Math.max(1, line - 2);
  const to = Math.min(lines.length, line + 2);
  const out: string[] = [];
  for (let n = from; n <= to; n += 1) out.push(`  ${n === line ? '>' : ' '} ${String(n).padStart(4)} | ${lines[n - 1] ?? ''}`);
  return `\`\`\`ts\n${out.join('\n')}\n\`\`\``;
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n…`;
}

function tail(text: string, max: number): string {
  return text.length <= max ? text : `…${text.slice(-max)}`;
}

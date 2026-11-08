import { z } from 'zod';
import { MODULE_KEYS } from './modules';

/** Output contracts between agents. Each agent's JSON is validated against one of these. */

const testName = z.string().regex(/^should_[a-z0-9_]+_when_[a-z0-9_]+$/, 'test names must be should_<expected>_when_<condition>');
const repoPath = z.string().min(1).refine((p) => !p.startsWith('/') && !p.split('/').includes('..'), 'repo-relative path without ..');

export const RouterDecision = z.object({
  module: z.enum(MODULE_KEYS),
  package: z.string().regex(/^P([1-9]|10)$/),
  chain: z.array(z.enum(['architect', 'dev-app', 'dev-api', 'qa', 'reviewer', 'level-designer', 'docs'])).min(1),
  reason: z.string().min(1),
  needsHuman: z.boolean(),
});
export type RouterDecision = z.infer<typeof RouterDecision>;

export const ArchitectSpec = z.object({
  id: z.string().regex(/^P([1-9]|10)-[a-z0-9-]+$/),
  title: z.string().min(1),
  module: z.enum(MODULE_KEYS),
  layers: z.array(z.enum(['domain', 'application', 'adapters', 'infrastructure', 'ui', 'main'])).min(1),
  goal: z.string().min(1),
  interfaces: z.array(z.object({
    file: repoPath,
    name: z.string().min(1),
    kind: z.enum(['interface', 'class', 'type', 'function']),
    status: z.enum(['exists', 'to_create', 'to_modify']),
    signature: z.string().min(1),
  })).min(1),
  patterns: z.array(z.object({ name: z.string(), where: z.string(), why: z.string() })),
  rules: z.array(z.string()).min(1),
  acceptanceTests: z.array(testName).min(3),
  outOfScope: z.array(z.string()),
  openQuestions: z.array(z.string()),
});
export type ArchitectSpec = z.infer<typeof ArchitectSpec>;

export const FilePatch = z.object({
  files: z.array(z.object({
    path: repoPath,
    action: z.enum(['create', 'replace']),
    content: z.string(),
  })).min(1),
  notes: z.string(),
  assumptions: z.array(z.string()),
});
export type FilePatch = z.infer<typeof FilePatch>;

export const QaReport = z.object({
  files: z.array(z.object({ path: repoPath, action: z.enum(['create', 'replace']), content: z.string() })),
  addedTests: z.array(testName),
  uncoveredRisks: z.array(z.string()),
});
export type QaReport = z.infer<typeof QaReport>;

export const ReviewReport = z.object({
  verdict: z.enum(['approve', 'request_changes']),
  findings: z.array(z.object({
    severity: z.enum(['blocker', 'major', 'minor']),
    file: z.string(),
    rule: z.string(),
    message: z.string(),
    suggestion: z.string(),
  })),
  summary: z.string(),
});
export type ReviewReport = z.infer<typeof ReviewReport>;

export const LevelPack = z.object({
  gameId: z.enum(['hexa-fit', 'hexa-sort']),
  levels: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    gameId: z.enum(['hexa-fit', 'hexa-sort']),
    difficulty: z.number().int().min(1).max(10),
    board: z.object({ shape: z.enum(['hexagon', 'custom']), radius: z.number().int().min(1).optional(), cells: z.array(z.tuple([z.number().int(), z.number().int()])).optional() }),
    spec: z.record(z.string(), z.unknown()),
    solutionSketch: z.string(),
  })).min(1),
});
export type LevelPack = z.infer<typeof LevelPack>;

export const DocsOutput = z.object({
  files: z.array(z.object({ path: repoPath, action: z.enum(['create', 'replace']), content: z.string() })).min(1),
  summary: z.string(),
});
export type DocsOutput = z.infer<typeof DocsOutput>;

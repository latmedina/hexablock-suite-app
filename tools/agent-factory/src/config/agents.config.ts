import type { AgentDefinition, AgentId } from '../domain/agent';
import { ArchitectSpec, DocsOutput, FilePatch, LevelPack, QaReport, ReviewReport, RouterDecision } from '../domain/contracts';

/** Output type produced by each agent. */
export interface AgentOutputs {
  router: RouterDecision;
  architect: ArchitectSpec;
  'dev-app': FilePatch;
  'dev-api': FilePatch;
  qa: QaReport;
  reviewer: ReviewReport;
  'level-designer': LevelPack;
  docs: DocsOutput;
}
export type AgentDefinitions = { [K in AgentId]: AgentDefinition<AgentOutputs[K]> };
type Env = Readonly<Record<string, string | undefined>>;
import { assertFreeModel, type FreeModelId } from '../domain/free-model';

/**
 * THE ONLY PLACE WHERE MODELS ARE CHOSEN.
 * Free catalogue checked live on 2026-11-08 (Llama 3.1 / Gemma 2 free endpoints no longer exist).
 * Dev uses Nemotron Ultra first: in the first real P2 run north-mini-code failed 2 of 2 times
 * (invalid JSON, then an empty reply) while Nemotron Ultra produced a valid patch.
 * maxTokens is generous on purpose: reasoning models spend tokens thinking, and a reply cut at the
 * limit is invalid JSON (second real run). A cut reply now fails over to the next model.
 * Dev (2026-11-09 run 569dab9d): north-mini-code ran to 32k tokens and was cut off after the other two
 * stalled, burning ~8 min, so it is out of the Dev chain and Dev calls give up after 150 s.
 * Free models come and go: run `npm run models:check` before a work session, and override any
 * chain without touching code with AGENT_<ID>_MODELS="vendor/model:free,vendor/other:free".
 */
const M = {
  nemotronUltra: 'nvidia/nemotron-3-ultra-550b-a55b:free',
  nemotronSuperVl: 'nvidia/nemotron-3.5-super-vl:free',
  nemotronLightning: 'nvidia/nemotron-3.5-lightning:free',
  nemotronNanoReasoning: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  northMiniCode: 'cohere/north-mini-code:free',
  dots3Note: 'dots-studio/dots-3-note-preview:free',
  gemma4_31b: 'google/gemma-4-31b-it:free',
  gemma4_26b: 'google/gemma-4-26b-a4b-it:free',
  flint: 'recursive/flint-v1.0:free',
} as const;

const chain = (...ids: string[]): FreeModelId[] => ids.map(assertFreeModel);

const BASE_DEFINITIONS: AgentDefinitions = {
  router: { id: 'router', role: 'Router / dispatcher', models: chain(M.nemotronLightning, M.nemotronSuperVl), promptFile: 'router.md', output: RouterDecision, temperature: 0, maxTokens: 1500, needsModuleContext: false },
  architect: { id: 'architect', role: 'Software architect (spec author)', models: chain(M.nemotronUltra, M.dots3Note, M.nemotronSuperVl), promptFile: 'architect.md', output: ArchitectSpec, temperature: 0.2, maxTokens: 16000, needsModuleContext: false },
  'dev-app': { id: 'dev-app', role: 'Developer — app (Expo / generic engine)', models: chain(M.nemotronUltra, M.nemotronSuperVl, M.dots3Note), promptFile: 'dev-app.md', output: FilePatch, temperature: 0.1, maxTokens: 32000, timeoutMs: 150_000, needsModuleContext: true },
  'dev-api': { id: 'dev-api', role: 'Developer — api (NestJS / Prisma)', models: chain(M.nemotronUltra, M.nemotronSuperVl, M.dots3Note), promptFile: 'dev-api.md', output: FilePatch, temperature: 0.1, maxTokens: 32000, timeoutMs: 150_000, needsModuleContext: true },
  qa: { id: 'qa', role: 'QA / test engineer', models: chain(M.nemotronSuperVl, M.nemotronNanoReasoning, M.northMiniCode), promptFile: 'qa.md', output: QaReport, temperature: 0.1, maxTokens: 24000, needsModuleContext: true },
  reviewer: { id: 'reviewer', role: 'Code reviewer (different model family than Dev)', models: chain(M.dots3Note, M.nemotronUltra, M.flint), promptFile: 'reviewer.md', output: ReviewReport, temperature: 0, maxTokens: 16000, needsModuleContext: true },
  'level-designer': { id: 'level-designer', role: 'Level designer (Hexa Fit / Hexa Sort JSON)', models: chain(M.nemotronNanoReasoning, M.nemotronSuperVl), promptFile: 'level-designer.md', output: LevelPack, temperature: 0.4, maxTokens: 16000, needsModuleContext: true },
  docs: { id: 'docs', role: 'Technical writer (README, diagrams, EXTENSIBILITY, i18n)', models: chain(M.gemma4_31b, M.nemotronSuperVl, M.gemma4_26b), promptFile: 'docs.md', output: DocsOutput, temperature: 0.3, maxTokens: 16000, needsModuleContext: true },
};

/** Applies AGENT_<ID>_MODELS overrides (still validated as free). */
export function loadAgentDefinitions(env: Env = process.env): AgentDefinitions {
  const withOverride = <K extends AgentId>(id: K): AgentDefinitions[K] => {
    const override = env[`AGENT_${id.toUpperCase().replace(/-/g, '_')}_MODELS`];
    const base = BASE_DEFINITIONS[id];
    return override ? { ...base, models: chain(...override.split(',').map((s) => s.trim()).filter(Boolean)) } : base;
  };
  return {
    router: withOverride('router'),
    architect: withOverride('architect'),
    'dev-app': withOverride('dev-app'),
    'dev-api': withOverride('dev-api'),
    qa: withOverride('qa'),
    reviewer: withOverride('reviewer'),
    'level-designer': withOverride('level-designer'),
    docs: withOverride('docs'),
  };
}

export const ALL_CONFIGURED_MODELS: readonly string[] = [...new Set(Object.values(M))];

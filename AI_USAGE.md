# AI Usage Documentation

Required by section 7 of the assignment. Every team member logs their own significant AI usage.

## Tools

| Tool | Model / version | Role in the workflow |
| --- | --- | --- |
| Claude (claude.ai projects / Claude Code) | Claude Opus | Project planning, repository scaffold, contract drafts, code review |

## Usage log

| Date | Member | Task | Tool | Prompt (literal or faithful paraphrase) | Result | Team changes | Lessons / limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-31 | Luis | Project plan and work split | Claude | "Start with the points to develop, what to research and what to know; we are 3 members; create the GitHub repo with a branch per member" | Work plan (P1–P10), role split, repo layout, branch strategy, schedule | Pending team review | — |
| 2026-10-31 | Luis | Repository scaffold | Claude | Same request, with the TypeScript stack chosen | Folder structure by layer, CI, commitlint, dependency-cruiser rules, AGENTS.md, DRAFT P1 contract interfaces (no implementations) | Pending team review of the P1 contracts | — |
| 2026-11-08 | Luis | Review of last semester's project (ArrowMaze) | Claude | "Este es el proyecto de un semestre pasado, necesito que lo revises y veas cómo es la estructura, cómo se utilizó la IA y demás, para que aprendas de ahí" | Report of what to copy and what to avoid (no CI, wrong test names, framework imports in domain, README out of sync, stretched patterns) | Pending team review | A long, living agent context file (rules, contracts, what does NOT exist) was the most useful practice to copy |
| 2026-11-08 | Luis | Per-module agent setup and work split | Claude | "Empieza con todo lo que consideres necesario, distribuye las cosas en el grupo, separa por módulos para tener agentes, puedes usar claude, codex, gemini y openrouter" | Module AGENTS.md/CLAUDE.md files, docs/agents/README.md, Gemini and Aider config, CODEOWNERS, test-name check in CI, P2 spec, requirements tracker | Pending team review | — |
| 2026-11-08 | Luis | Agent factory on free OpenRouter models | Claude | "Actúa como Arquitecto de Software. Estructura mi proyecto como una 'Fábrica de Agentes' modular orquestada en Next.js/n8n. Restricción estricta: asigna SOLO modelos 100% gratuitos de OpenRouter" | `tools/agent-factory`: 8 agents, model per agent, system prompts, fetch-based OpenRouter gateway, Architect to Dev pipeline, n8n workflow, design doc | Pending team review; free models checked live with `npm run models:check` | Llama 3.1 / Gemma 2 free endpoints no longer existed; the AI had to verify the live catalogue instead of trusting the request |
| 2026-11-09 | Luis | P2 hex geometry (distance, neighbours, 60 degree rotation) | Agent factory, run `fca9797e` (free OpenRouter models: Architect dots-3-note-preview, Dev and Reviewer nemotron-3-ultra) | "Implement HexGeometry distance and neighbours as described in docs/specs/P2-hex-geometry.md" | `HexGeometry`, `HexCoord` helpers and unit tests (PR #24); 1 automatic repair round after the verifier; Reviewer approved | Verified with typecheck, lint:tests, lint:arch and jest; reviewed by Luis before merge | Earlier runs failed (truncated replies, broken imports, dropped exports) until the factory got a verifier, a reviewer-to-dev loop and an export check |

| 2026-11-09 | Luis | Manual factory lifecycle and local fallback | Codex | "Haz lo que necesites para que funcione" | Dashboard power controls, graceful HTTP draining, managed Ollama lifecycle, local JSON gateway and daily-quota fallback | Typecheck and 81 factory tests passed; real local JSON inference verified; pending owner review | Paid cloud models remain rejected; no login service installed |

## Critical evaluation

- Approximate share of AI-assisted code: _to be filled at delivery_.
- Cases where AI output was wrong or suboptimal and how we caught it: _to be filled_.
- Team reflection on productivity and quality: _to be filled_.

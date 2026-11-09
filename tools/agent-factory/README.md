# HexaBlock Agent Factory

Role-based AI agents for building HexaBlock Suite, running **only on free OpenRouter models** and orchestrated by a
small Next.js app (plain `fetch`, OpenAI-compatible API). Optional n8n workflow included.

This is a development tool. It is not part of the mobile app and is excluded from the app's `tsconfig`, Jest and
dependency-cruiser runs.

## Agents

| Id | Role | Primary free model | Fallbacks |
| --- | --- | --- | --- |
| `router` | Classifies a request into package P1–P10, module and agent chain | `nvidia/nemotron-3.5-lightning:free` | super-vl |
| `architect` | Agent 1: request → validated spec (interfaces, rules, `should_x_when_y` tests) | `nvidia/nemotron-3-ultra-550b-a55b:free` | dots-3-note, super-vl |
| `dev-app` | Agent 2 (app): spec → complete files inside the module | `nvidia/nemotron-3-ultra-550b-a55b:free` | super-vl, north-mini-code |
| `dev-api` | Agent 2 (api, NestJS/Prisma) | `nvidia/nemotron-3-ultra-550b-a55b:free` | super-vl, north-mini-code |
| `qa` | Adds missing tests under `test/` only | `nvidia/nemotron-3.5-super-vl:free` | nano-omni-reasoning, north-mini-code |
| `reviewer` | Reviews patch vs spec, layers, SOLID, patterns (different family from Dev) | `dots-studio/dots-3-note-preview:free` | nemotron-ultra, flint |
| `level-designer` | Solvable Hexa Fit / Hexa Sort level JSON | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | super-vl |
| `docs` | README, Mermaid diagrams, EXTENSIBILITY.md, i18n | `google/gemma-4-31b-it:free` | super-vl, gemma-4-26b |

Models are chosen in one file: [`src/config/agents.config.ts`](src/config/agents.config.ts). Prompts live in
[`prompts/`](prompts/). The JSON Schema of each agent's output contract ([`src/domain/contracts.ts`](src/domain/contracts.ts))
is appended to its system prompt automatically, and the root + module `AGENTS.md` are injected for agents that write code.

## Live dashboard

Open the app root (`http://localhost:3100`, or the machine's Tailscale name). It shows every run as it happens,
whether it was started from the page, from n8n or from the API: the pipeline track
(Architect → Dev → Verifier → Dev repair → … → Reviewer), each model reply and repair attempt with model, time and
tokens, the spec, the patch files, the tsc/jest/lint output and the review findings. Events are streamed with
Server-Sent Events from `GET /api/events` and kept in `.runs/events.jsonl`, so history survives restarts; each
run's full result is also written to `.runs/<runId>/`. When `FACTORY_TOKEN` is set the page asks for it once and
keeps it in an HttpOnly cookie. Under `next dev`, Next only serves its scripts to known hosts: Tailscale names
(`*.ts.net`) are allowed; add any other host or IP to `FACTORY_DEV_ORIGINS`, or the page stays on "Conectando…". Runs started with `npm run pipeline` (another process) only appear after a restart.

## Verification and review

After the Dev patch passes the guards, the pipeline applies it to a detached `git worktree` of the repo at
`HEAD` (in a temp folder, with the repo's `node_modules` linked) and runs the repo's own scripts:
`typecheck`, `lint:tests`, `lint:arch` and `test` for the app, `typecheck` and `test:unit` for the api. If any
fails, Dev gets each type error with its lines of code and each failing test, and returns a full corrected
patch. Once the checks pass, the Reviewer (another model family) reviews spec + patch; blocker and major
findings go back to Dev too, and the patch is checked again. Both kinds of repair share one budget,
`MAX_REPAIR_ROUNDS` (3). The run ends `ready` (checks pass, nothing blocking) or `needs_human`.
No repair round starts after `RUN_BUDGET_MINUTES` (12). A running run can be cancelled from the dashboard
(`POST /api/runs/<runId>/cancel`), or by the caller hanging up; the current model call or check stops at once. The real working copy is never modified, but the generated tests do run on your
machine. Turn either step off with `VERIFY_PATCHES=0` / `REVIEW_PATCHES=0`.

## Guarantees

- **Free only.** Every model id must end in `:free`; anything else throws `PaidModelError` at startup and again
  right before each request. `npm run models:check` verifies live against `/api/v1/models` that each configured
  model still exists with price 0.
- **Validated output.** Each reply is parsed and validated with zod; one repair turn, then a hard error.
- **Module boundary.** A Dev patch that writes outside the spec's module, or replaces an existing file the spec did not mark `to_modify`, goes back to the agent once and then fails.
- **Real context.** The Architect sees the file tree of both repos; the Dev sees the current content of every file the spec references.
- **Nothing is written to the repo.** You get a spec and a patch; a human reviews and commits on `dev/<name>`.
- **Rate limits.** OpenRouter falls back through the free chain (`models`); 429/5xx are retried with backoff.
- **Traceability.** Every run is appended to `.runs/runs.jsonl` (agent, model, prompt) for `AI_USAGE.md`.

## Use

```bash
cd tools/agent-factory
npm install
cp .env.example .env.local      # add OPENROUTER_API_KEY
npm run models:check            # are the configured models still free and online?
npm run dev                     # http://localhost:3100  (form: Architect -> Dev)
npm run pipeline -- "Implement HexBoard<TCell> as in docs/specs/P2-hex-geometry.md"
```

HTTP API: `POST /api/pipeline {"request": "..."}` and `POST /api/agents/<id> {"prompt": "...", "module": "app/hexa-fit"}`.
The Dev agents (`dev-app`, `dev-api`) only run through `/api/pipeline`, which feeds them the spec and repo context and
answers 422 when a patch writes outside its module, over an existing file, or drops an export of a file it modifies; `/api/agents/dev-*` answers 409.

Swap a model without code changes: `AGENT_REVIEWER_MODELS="google/gemma-4-31b-it:free,recursive/flint-v1.0:free"`.

## n8n (optional)

Import [`n8n/architect-to-dev.workflow.json`](n8n/architect-to-dev.workflow.json). It calls this app's
`/api/pipeline` once and returns its JSON and status code (200, or 422 when a guard blocked the patch). Run the app on the same server as n8n (or change the
URLs), and keep the OpenRouter key in this app's env, not in n8n.

## Free-tier caveats

Free endpoints are rate limited and may log prompts or use them for training: never send secrets, `.env` files or
user data. The free catalogue changes often; the list in `agents.config.ts` was checked on 2026-11-08.

## n8n over Tailscale

n8n runs on another machine, so the app must listen on the network. Then set a token:

```bash
FACTORY_TOKEN=$(openssl rand -hex 24)   # keep it in .env.local, never in the repo
npx next dev --port 3100 -H <this-machine-tailscale-ip>
```

Import `n8n/architect-to-dev.workflow.json` after replacing `127.0.0.1` with this machine's Tailscale name and
`__FACTORY_TOKEN__` with the token. Protect the n8n webhook itself with Header Auth.

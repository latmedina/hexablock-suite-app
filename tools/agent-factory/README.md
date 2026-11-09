# HexaBlock Agent Factory

Role-based AI agents for building HexaBlock Suite, running **only on free OpenRouter models or local Ollama models** and orchestrated by a
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
Each repair round is led by the next model in the chain; when the rounds run out and the checks still fail, Dev
starts over from the spec with another model (`MAX_FRESH_STARTS`, 1), and the best patch is kept.
No repair round or fresh start begins after `RUN_BUDGET_MINUTES` (25). A running run can be cancelled from the dashboard
(`POST /api/runs/<runId>/cancel`), or by the caller hanging up; the current model call or check stops at once. The real working copy is never modified, but the generated tests do run on your
machine. Turn either step off with `VERIFY_PATCHES=0` / `REVIEW_PATCHES=0`.

## Guarantees

- **Free cloud only.** Every OpenRouter model id must end in `:free`; anything else throws `PaidModelError` at startup and again
  right before each request. `npm run models:check` verifies live against `/api/v1/models` that each configured
  model still exists with price 0.
- **Validated output.** Each reply is parsed and validated with zod; one repair turn, then a hard error.
- **Module boundary.** A Dev patch that writes outside the spec's module, or replaces an existing file the spec did not mark `to_modify`, goes back to the agent once and then fails.
- **Real context.** The Architect sees the file tree of both repos; the Dev sees the current content of every file the spec references.
- **Nothing is written to the repo.** You get a spec and a patch; a human reviews and commits on `dev/<name>`.
- **Rate limits.** OpenRouter falls back through the free chain (`models`); transient 429/5xx are retried within a 3-minute model budget. Daily free-quota exhaustion skips the remaining cloud models and uses Ollama until UTC midnight, if enabled.
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

## Manual power controls (macOS)

These commands do not install a login item or start anything at boot. Run them from
`tools/agent-factory`:

```bash
npm run power:on                # foreground; keep this terminal open
npm run power:status            # in another terminal
npm run power:off               # in another terminal; waits for active HTTP runs
npm run power:on -- --local     # also start Ollama, if installed
```

Control + C in the startup terminal also requests a graceful shutdown. New HTTP
runs receive 503 while shutting down; existing pipeline and standalone-agent HTTP
runs finish before the managed Next.js process is stopped. Closing the terminal or
forcing a process to quit bypasses this protection. CLI `npm run pipeline` processes
are separate and are not controlled by these commands.

The default address is `127.0.0.1:3100`. For n8n over Tailscale, set
`FACTORY_HOST=100.117.196.35` in `.env.local` alongside the existing `FACTORY_TOKEN`.
Use the same host when starting, checking and stopping. An older server started
with `npm run dev` must first be stopped with Control + C after its runs finish;
the power script never kills an unrelated listener.

`--local` (or `OLLAMA_ENABLED=1`) starts `ollama serve` only for this session and stops that server after
the factory finishes. It refuses to adopt an already running Ollama service. Do not
configure Ollama to open at login or run it through `brew services start` if you want
this manual lifecycle. Model files stay on disk after shutdown. With `OLLAMA_ENABLED=1`, local inference automatically backs up failed cloud calls; it also works without an OpenRouter key. Ollama is bound to loopback with cloud features disabled and one parallel request. The default model is `qwen2.5-coder:7b`, downloaded separately into the git-ignored `.models/` folder. Models unload after 30 seconds without inference. The existing JSON contracts, module guards and patch verification apply to local replies too.


The dashboard includes an **Apagar fábrica** control and shows the local model's
memory state. It is enabled only under the managed launcher. Once the server stops,
use **HexaBlock** on the Desktop to start it again; an offline webpage cannot start
a server by itself. No lightweight background service or login item is installed.
The same `.runs/` directory and token are retained when the runtime is updated.

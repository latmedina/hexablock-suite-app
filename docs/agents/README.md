# Working with AI agents in this repo

Every agent (Claude Code, Codex, Gemini CLI, or any model through OpenRouter) reads the same rules:
the root [`AGENTS.md`](../../AGENTS.md) plus the `AGENTS.md` of the module it is working in. Rules
live in one place; each tool only gets a thin pointer to them.

## Modules, owners and their agent context

| Module | Path | Owner | Package | Module rules |
| --- | --- | --- | --- | --- |
| Geometry, board, engine core | `src/domain/{geometry,board,engine,commands,capabilities,pieces,scoring}` | @latmedina | P2, P3 | [`src/domain/AGENTS.md`](../../src/domain/AGENTS.md) |
| Hexa Lines, Hexa Merge | `src/domain/variants/{hexa-lines,hexa-merge}` | @latmedina | P4 | [`src/domain/variants/AGENTS.md`](../../src/domain/variants/AGENTS.md) |
| Hexa Fit, Hexa Sort | `src/domain/variants/{hexa-fit,hexa-sort}` | @Arnoldo182 | P5 | [`src/domain/variants/AGENTS.md`](../../src/domain/variants/AGENTS.md) |
| Levels (JSON + builder) | `assets/levels`, `src/adapters/level-builder` | @Arnoldo182 | P6 | [`assets/levels/AGENTS.md`](../../assets/levels/AGENTS.md) |
| Use cases and aspects (AOP) | `src/application` | @latmedina | P7 | [`src/application/AGENTS.md`](../../src/application/AGENTS.md) |
| ViewModels, presenters, mappers, repositories | `src/adapters` | shared (see CODEOWNERS) | P8 | [`src/adapters/AGENTS.md`](../../src/adapters/AGENTS.md) |
| Screens and board renderer | `src/ui` | @latmedina (game screen, `BoardRenderer`), @Arnoldo182 (level select, victory, defeat) | P8 | [`src/ui/AGENTS.md`](../../src/ui/AGENTS.md) |
| Storage, HTTP, audio, i18n | `src/infrastructure` | @luisloaiza2 (i18n: @Arnoldo182) | P8 | [`src/infrastructure/AGENTS.md`](../../src/infrastructure/AGENTS.md) |
| Tests | `test` | everyone (their own module) | all | [`test/AGENTS.md`](../../test/AGENTS.md) |
| CI, Pact consumer, release | `.github`, `test/contract` | @luisloaiza2 | P10 | root `AGENTS.md` |

Ownership is enforced for reviews by [`.github/CODEOWNERS`](../../.github/CODEOWNERS).

## How each tool picks up the rules

| Tool | What it reads | Setup |
| --- | --- | --- |
| Claude Code | `CLAUDE.md` in the root and in each module folder; each one only imports `@AGENTS.md` | nothing extra |
| Codex (CLI / IDE / cloud) | `AGENTS.md` natively, root plus the folder it works in | nothing extra |
| Gemini CLI | `AGENTS.md`, because [`.gemini/settings.json`](../../.gemini/settings.json) sets it as the context file | nothing extra |
| OpenRouter models | OpenRouter is a gateway, not an agent: use it through **OpenCode** (reads `AGENTS.md` natively) or **Aider** (reads `AGENTS.md` through [`.aider.conf.yml`](../../.aider.conf.yml)) | `export OPENROUTER_API_KEY=...` in your shell, never in the repo |

## Which tool for which job (default, not mandatory)

| Job | Default tool | Why |
| --- | --- | --- |
| Engine, geometry, generics, use cases, aspects | Claude Code | Architecture-heavy work, long reasoning over contracts |
| Variant rules (one folder per variant) | Claude Code or Codex | Self-contained module with a spec and its tests |
| Second-opinion review of a PR | A different model family from the one that wrote it | Cross-model review catches errors the author model repeats |
| README / diagrams vs code audit, whole-repo questions | Gemini CLI | Large context window: reads the whole repo at once |
| Repetitive work: i18n strings, level JSON drafts, mappers, DTOs | Cheap model via OpenRouter (OpenCode / Aider) | Low cost; CI and the owner's review are the safety net |

## Workflow per task

1. **Spec first.** The owner writes or approves `docs/specs/P<n>-<name>.md` (template in `docs/specs/TEMPLATE.md`).
   Acceptance criteria are written as test names `should_<expected>_when_<condition>`.
2. **Implementer agent** works on the owner's branch `dev/<name>`, only inside the module paths of the spec.
3. **Tester agent** proposes extra edge cases; the base tests from the spec are written or checked by the owner.
4. **Reviewer agent** (different model family) reviews the diff against SOLID, the layer rules and the spec.
5. **Human review**: PR to `develop`, CI green, one approval from another member.
6. **Log it**: one row per significant AI use in [`AI_USAGE.md`](../../AI_USAGE.md), with the literal prompt.

## Hard limits for every agent

- Never commit to `main` or `develop`; work on `dev/<name>` and open a PR.
- Never edit another owner's module without telling them; never edit `src/domain/engine` for a variant.
- Never invent API endpoints or classes. If something is not in the code or in a spec, ask.
- Never paste secrets, `.env` contents or user data into a prompt.
- Do not leave agent reports (`*_SUMMARY.md`, `*_IMPLEMENTATION.md`) in the repo.

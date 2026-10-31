# Agent instructions — hexablock-suite-app

Read this before writing any code. These rules are non-negotiable; CI enforces most of them.

## What this project is

A React Native (Expo) app with four hexagonal puzzle variants (Hexa Lines, Hexa Fit, Hexa Sort,
Hexa Merge) built on ONE generic engine. The grade depends on the engine being generic, not on
having four games. Full assignment: see `docs/specs/` and the team plan.

## Architecture (Clean Architecture, dependency rule points inwards)

| Folder | Layer | May import |
| --- | --- | --- |
| `src/domain` | 1. Entities | only `src/domain` — no npm packages, no React |
| `src/application` | 2. Use cases + ports + aspects | `src/domain`, `src/application` |
| `src/adapters` | 3. ViewModels, presenters, mappers, repositories | layers 1–3 |
| `src/infrastructure`, `src/ui` | 4. Frameworks & drivers | anything |
| `src/main` | Composition root (DI, `VariantRegistry`) | anything |

`npm run lint:arch` (dependency-cruiser) fails the build on any violation.

## Rules

1. Never add `if`/`switch` on the variant inside `src/domain/engine`, `board`, `geometry` or any use case.
   Variant behaviour lives in `src/domain/variants/<variant>/` behind `IGameRules`, `IPieceSource`,
   `IScoringPolicy`, `IProgressModel`, created by that variant's `IVariantFactory`.
2. Variants never import each other.
3. A new variant = new folder + new factory + one line in `src/main`. If you need to edit the engine,
   stop and ask the human owner.
4. Cross-cutting concerns (logging, profiling, retry, auth, cache) are Decorators over `IUseCase`
   in `src/application/aspects`. Never call a logger from domain or use-case code.
5. Prefer immutable state; `IHexBoard.with()` returns a new board.
6. Tests: `test/unit|integration|ui|contract`, named `should_<expected>_when_<condition>`, AAA blocks
   with `// Arrange`, `// Act`, `// Assert` comments. Test behaviour, not implementation.
7. Commits: Conventional Commits in English with an allowed scope (see `commitlint.config.js`).
8. Implement from a spec in `docs/specs/`. If there is no spec, write or ask for one first.
9. Never put secrets, `.env` contents or user data in code, prompts or logs.

## Before finishing

Run `npm run typecheck && npm run lint:arch && npm test`. Tell the human which parts you generated
so they can log it in `AI_USAGE.md`.

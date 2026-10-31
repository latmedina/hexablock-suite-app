# HexaBlock Suite

![CI](https://github.com/latmedina/hexablock-suite-app/actions/workflows/ci.yml/badge.svg)
![Tests](https://img.shields.io/badge/tests-unit%20%7C%20integration%20%7C%20ui%20%7C%20contract-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Four casual hexagonal puzzle games (Hexa Lines, Hexa Fit, Hexa Sort, Hexa Merge) built as
instantiations of **one generic game engine**. Mobile app written in TypeScript with React Native
(Expo). Backend: [hexablock-suite-api](https://github.com/latmedina/hexablock-suite-api).

> Status: scaffold. Sections marked TODO are filled as the project advances.

## Demo / Screenshots

TODO: one GIF per variant.

## Architecture

Clean Architecture with four concentric layers; dependencies only point inwards and the rule is
enforced in CI by dependency-cruiser (`npm run lint:arch`).

| Layer | Folder |
| --- | --- |
| Entities | `src/domain` |
| Use cases | `src/application` |
| Interface adapters | `src/adapters` |
| Frameworks & drivers | `src/infrastructure`, `src/ui` |
| Composition root | `src/main` |

TODO: embed `docs/diagrams/clean-architecture.png`.

## Generic Engine

TODO: `HexBoard<TCell>`, `IGameRules<TCell, TMove, TState>`, `GameEngine<TCell, TMove, TState>`,
`IPieceSource<TPiece>`, `IScoringPolicy<TState>`, `IProgressModel`, type constraints and why.
See [docs/EXTENSIBILITY.md](docs/EXTENSIBILITY.md).

## Design Patterns

TODO: table pattern → class → justification.

## SOLID Principles

TODO: one real example per principle.

## AOP

TODO: aspects implemented as Decorators over `IUseCase`.

## Getting Started

Prerequisites: Node.js 22, npm 10, Expo Go or an Android emulator.

```bash
npm ci
npm start
```

## Running Tests

```bash
npm test              # all tests
npm run test:coverage
npm run typecheck
npm run lint:arch     # Clean Architecture dependency rule
```

## AI Usage Documentation

See [AI_USAGE.md](AI_USAGE.md). Rules for AI agents: [AGENTS.md](AGENTS.md).

## Contributing

- Branches: `main` (releases, protected), `develop` (integration, protected), `dev/<member>` (personal work).
- Open a PR from `dev/<member>` to `develop` at least every 2–3 days; one approval from another member and green CI are required. Squash merge.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org) in English, validated by commitlint, e.g. `feat(engine): add generic HexBoard with axial coordinates`.
- Each feature starts from a spec in `docs/specs/`.

## License

[MIT](LICENSE)

# Requirements tracker

Single list of what the assignment asks for and where it stands. Agents read this to know what exists
and what does not. Update the status in the same PR that changes it.

Status: `todo` · `doing` · `done`

## Functional (app)

| # | Requirement (assignment section) | Package | Owner | Status |
| --- | --- | --- | --- | --- |
| RF01 | Home with suite name, settings and selector of the 4 games (5.1) | P8 | @latmedina | todo |
| RF02 | Level select for Hexa Fit and Hexa Sort with progress and locked levels (5.1) | P8 | @Arnoldo182 | todo |
| RF03 | Generic engine shared by the 4 variants (3.1, 5.1) | P2, P3 | @latmedina | todo |
| RF04 | Hexa Lines playable, endless, high score (1.1) | P4 | @latmedina | todo |
| RF05 | Hexa Merge playable, endless, seeded RNG, undo 1 move (1.4) | P4 | @latmedina | todo |
| RF06 | Hexa Fit, 15 hand-made levels from config, undo/redo, stars (1.2) | P5, P6 | @Arnoldo182 | todo |
| RF07 | Hexa Sort, 10 hand-made levels from config (1.3) | P5, P6 | @Arnoldo182 | todo |
| RF08 | Scoring per variant, documented (5.1) | P4, P5 | variant owner | todo |
| RF09 | Victory screen (next level / new game) and defeat screen (retry) (5.1) | P8 | @Arnoldo182 | todo |
| RF10 | Local progress per variant: levels, stars, scores (5.1) | P8 | @luisloaiza2 | todo |
| RF11 | Sound effects and music with mute (5.1) | P8 | @luisloaiza2 | todo |
| RF12 | Spanish and English (5.1) | P8 | @Arnoldo182 | todo |
| RF13 | Login/registration and progress sync with the API | P8, P9 | @luisloaiza2 | todo |

## Non-functional

| # | Requirement | Package | Owner | Status |
| --- | --- | --- | --- | --- |
| RNF01 | Generic types with documented bounds (3.1) | P1–P3 | @latmedina | doing (draft contracts) |
| RNF02 | Clean Architecture, dependency rule checked in CI (3.4) | P10 | everyone | done (dependency-cruiser) |
| RNF03 | Strategy + Abstract Factory, patterns of the 3 GoF families (3.3) | all | everyone | todo |
| RNF04 | 3+ aspects as decorators over the generic use case (3.5) | P7 | @latmedina | todo |
| RNF05 | Unit (AAA, should_X_when_Y), integration, UI, Pact tests in CI (3.6) | all | everyone | doing (CI + naming check) |
| RNF06 | Class, Clean layers and extensibility diagrams in `docs/diagrams` (4) | P10 | see plan | todo |
| RNF07 | `docs/EXTENSIBILITY.md` with real class names (3.1) | P10 | @latmedina | doing (skeleton) |
| RNF08 | README in English with all sections (6) | P10 | everyone | doing (skeleton) |
| RNF09 | `AI_USAGE.md` with literal prompts per entry (7) | all | everyone | doing |
| RNF10 | APK release with the 4 variants (8) | P10 | @luisloaiza2 | todo |

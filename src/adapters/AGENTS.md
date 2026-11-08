# Module: adapters — shared, see `.github/CODEOWNERS`

Layer 3. Also read the root `AGENTS.md`.

1. May import layers 1–3; never `src/infrastructure`, `src/ui` or `src/main`.
2. ViewModels expose plain data and commands to the UI; they never render.
3. Repositories implement ports from `src/application/ports` and talk to infrastructure through
   interfaces injected from `src/main`.
4. Mappers convert domain state of each variant to DTOs and back; one mapper per variant state is fine,
   a `switch` over game ids is not (register mappers by game id instead).
5. `level-builder/` is the Builder that assembles a level from the generic JSON schema
   (owner @Arnoldo182, see `assets/levels/AGENTS.md`).

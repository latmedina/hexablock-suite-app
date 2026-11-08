# Module: use cases and aspects — owner @latmedina

Layer 2. Also read the root `AGENTS.md`.

1. Imports only `src/domain` and `src/application`. No React, no storage, no HTTP, no npm packages.
2. Every use case implements `IUseCase<TIn, TOut>` and is generic over the variant
   (`StartGame`, `ApplyMove`, `UndoMove`, `SaveProgress`, `SyncLeaderboard`, `GetLeaderboard`).
   Never write one use case per game.
3. Use cases depend on ports declared in `ports/`; adapters implement them.
4. Aspects live in `aspects/` as Decorators that implement `IUseCase` and wrap another `IUseCase`
   (logging, profiling, retry/fallback, auth, cache). Use cases never call a logger or a timer.
5. Aspects are composed in `src/main`, not inside the use case.

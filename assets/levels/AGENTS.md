# Levels — owner @Arnoldo182

Also read the root `AGENTS.md` and `src/domain/variants/AGENTS.md`.

1. One JSON file per level: `assets/levels/<game-id>/<NN>.json` (`hexa-fit`: 15 levels, `hexa-sort`: 10).
2. Generic schema shared with the API: a common header (`gameId`, `levelId`, `order`, `difficulty`)
   plus a `spec` object specific to the game id. The same schema is served by the API's levels endpoint.
3. Coordinates use the axial `(q, r)` convention of `src/domain/AGENTS.md`.
4. Every Hexa Fit level must be solvable (piece area = figure area and a known solution kept in the file
   for tests). Difficulty grows with the level number.

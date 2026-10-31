# Extensibility guide: adding a fifth variant

> Skeleton. Fill with real class names once the engine exists (owner: I1).

Example: **Hexa Fill** (paint cells under constraints).

## Files to CREATE

1. `src/domain/variants/hexa-fill/HexaFillRules.ts` — implements `IGameRules<TCell, TMove, TState>`.
2. `src/domain/variants/hexa-fill/HexaFillFactory.ts` — implements `IVariantFactory`.
3. `src/domain/variants/hexa-fill/...` — scoring policy, piece source, cell/move/state types.
4. `assets/levels/hexa-fill/*.json` — levels using the generic level schema with a `hexa-fill` section.
5. `test/unit/hexa-fill/*.test.ts`.

## Files to MODIFY

1. `src/main/VariantRegistry.ts` — one registration line.
2. i18n strings for the new game name.

## Files that must NOT change

`src/domain/engine/**`, `src/domain/board/**`, `src/domain/geometry/**`, `src/application/**`,
`src/ui/screens/**`. If they do, the design is wrong.

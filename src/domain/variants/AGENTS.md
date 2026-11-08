# Module: variants — owners @latmedina (hexa-lines, hexa-merge), @Arnoldo182 (hexa-fit, hexa-sort)

Layer 1. Also read the root `AGENTS.md` and `src/domain/AGENTS.md` (hex conventions).

## A variant is a folder, never a fork of the engine

Each `variants/<game-id>/` contains only:

- `<Name>Rules.ts` implementing `IGameRules<TCell, TMove, TState>` (Strategy).
- `<Name>Factory.ts` implementing `IVariantFactory` (Abstract Factory): rules, piece source, scoring
  policy, progress model and board shape for that game.
- Its own cell, move and state types, scoring policy and piece source.

## Rules

1. Never import another variant; never edit `engine/`, `board/` or `geometry/` to make a variant work.
   If the engine is missing something, stop and ask @latmedina.
2. Opt into capabilities by implementing them (`IUndoable`, `ITimed`, `IRandomSeeded`, `IMergeable`);
   Hexa Lines does not implement `IUndoable`.
3. Randomness only through the injected seeded source, so tests are deterministic.
4. Each variant has its own tests in `test/unit/<game-id>/` covering its resolution rule
   (lines on 3 axes, exact cover, cascade transfer, merge on collision) and its end condition.

## Game rules summary (from the assignment)

| Game | Board | Move | Resolution | End | Undo |
| --- | --- | --- | --- | --- | --- |
| hexa-lines | hexagon radius 4 | place piece from a tray of 3 | clear full lines on 3 axes, combos | no piece fits | no |
| hexa-fit | figure per level | place / remove / rotate (60°) | none, check exact cover | figure covered | unlimited undo/redo |
| hexa-sort | hexagon radius 2 | place stack | cascade transfer to neighbour with most of that colour; 10 same colour clears | goals met / board full | no |
| hexa-merge | hexagon radius 2 | slide in 6 directions | equal tiles merge, then spawn 2 or 4 | target tile / no move changes the board | 1 move |

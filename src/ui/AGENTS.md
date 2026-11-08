# Module: UI — owners @latmedina (game screen, BoardRenderer), @Arnoldo182 (level select, victory, defeat)

Layer 4. Also read the root `AGENTS.md`.

1. Screens get everything through ViewModels; no domain logic or HTTP in components.
2. One generic `BoardRenderer` draws any `HexBoard<TCell>` through a cell renderer registered per game id.
   Never copy the board renderer per variant.
3. All visible text goes through i18n keys (ES and EN). No hard-coded strings.
4. Navigation covers: home, game selector, level select, game, victory, defeat, settings.

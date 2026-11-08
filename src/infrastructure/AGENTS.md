# Module: infrastructure — owner @luisloaiza2 (i18n: @Arnoldo182)

Layer 4. Also read the root `AGENTS.md`.

1. `storage/`, `http/`, `audio/`, `i18n/` wrap libraries behind the ports of `src/application/ports`
   (Adapter). Swapping a library must not touch layers 1–3.
2. `http/` calls only endpoints that exist in the API's OpenAPI document. Never invent an endpoint;
   if it is missing, ask the API owner.
3. Audio and session managers have a single instance provided by `src/main` (DI scope), behind a Facade.
4. No secrets in code; the API base URL comes from Expo config.

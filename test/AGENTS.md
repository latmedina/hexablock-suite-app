# Tests — every owner tests their own module

Also read the root `AGENTS.md`.

1. Folders: `unit/`, `integration/`, `ui/`, `contract/` (Pact consumer), `doubles/` (fakes and stubs).
2. Names: `should_<expected>_when_<condition>`, lowercase snake_case. `npm run lint:tests` enforces it.
3. Every test has `// Arrange`, `// Act`, `// Assert` comments.
4. The engine is tested with a fake cell type from `doubles/`, never with a real variant.
5. Randomness uses a fixed seed; time uses an injected clock. No sleeps.
6. Test behaviour, not private details. AI-generated code must be covered by tests the owner reviewed.

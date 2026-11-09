# Agent factory: manual runtime and local fallback

Owner: @latmedina. Scope: `tools/agent-factory` only.

- Keep the existing dashboard and Tailscale address. Show whether the factory is
  running, shutting down or stopped, its active HTTP runs, and local-model status.
- A dashboard or terminal shutdown refuses new HTTP runs and waits for active
  pipeline and standalone-agent calls before stopping the managed server.
- Provide a visible Mac launcher. Starting twice must not create duplicate servers.
  Services must not start at login. Preserve existing run history and secrets.
- Ollama is optional, loopback-only and cloud-disabled. Load a model only on an
  inference request; release model memory shortly after inactivity. Stop the
  Ollama process owned by this launcher when the factory shuts down.
- Continue to reject paid OpenRouter models. Use local inference if cloud models
  fail or the account daily quota is exhausted; do not retry account-wide quota
  exhaustion on each cloud model. Cancellation must not trigger another provider.
- Validate locally generated JSON through the same schemas, guards and verifier.
- Verify graceful draining, authentication, quota fallback, local-only configuration,
  cancellation and one real local inference before using the updated runtime.

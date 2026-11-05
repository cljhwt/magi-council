# v0.2.0-preview.1 — Context-aware Agent plugin

- Add a Codex local plugin bundle, repository marketplace, skill and local-service client.
- Carry sourced facts, constraints, prior decisions and unknowns into all six deliberation calls.
- Require context in the Harness tool and reject empty background before paid calls.
- Bound context size, validate source fields and apply best-effort credential masking.
- Include provided background in result records and distinguish runs without conversation context.

Fourteen automated checks pass. The Codex CLI installed the local plugin; the Harness SDK accepted the updated tool definition. Desktop new-chat skill invocation and complete Harness lifecycle validation remain pending. This is a host-provided-context workflow, not automatic access to all local conversations or a native MCP server.

One live end-to-end sample through the installed client and the user's configured Qwen model completed all six calls with three sourced facts and explicit unknowns. This validates the request path, not general decision quality.

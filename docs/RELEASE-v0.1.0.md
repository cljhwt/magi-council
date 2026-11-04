# v0.1.0-preview.1

First runnable developer preview of MAGI Council, an unofficial EVA-inspired three-perspective AI terminal.

- Original responsive terminal UI, with a labeled no-Key scripted replay.
- Three isolated first-round evaluations, one review round, deterministic majority/unanimous voting.
- Per-unit Chat Completions-compatible model configuration and connection tests.
- Cancellation, timeouts, six-call limit, masked configuration responses.
- Markdown export including initial and final opinions.
- Optional DeepSeek Harness tool adapter and setup guide.
- Desktop/mobile screenshots, silent walkthrough, Chinese/English launch copy.

Validation: seven automated tests pass, including all 27 vote combinations and a real HTTP pipeline against a mock provider. Browser replay and Markdown download checked. Harness tool definition accepted by local SDK 0.1.5-rc.2.

Known limits: no live paid-model quality evaluation yet; no complete Harness host installation/lifecycle validation; no web retrieval, persistent sessions or voice. Configure your own API Key for live use. This is a developer preview, not a claim that multi-agent agreement guarantees correctness.

Run `npm start` with Node 24+, open http://127.0.0.1:3088.

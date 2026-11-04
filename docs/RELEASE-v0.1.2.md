# v0.1.2-preview.1 — Clear first-run setup

Fixes the silent-looking start failure when no model credentials are configured.

- Check credentials before closing the proposal dialog or starting a live run.
- Show missing configuration inline, with direct model-setup and no-Key replay actions.
- Copy the first unit's connection to all three; return to the original proposal after saving complete credentials.
- Keep empty-input and connection errors visible in the proposal dialog.
- Open failure details when a council run is incomplete.
- Update the default official DeepSeek model to `deepseek-flash`; disable long thinking for short official DeepSeek responses.
- Add actionable provider authentication, balance, permission and endpoint error messages.

Validation: nine Node checks pass. Browser regression covers empty input, missing and partial credentials, connection copy, preserving the proposal after setup, visible server errors, and no-Key replay. Browser tests mock the API; live paid-model quality remains unverified.

# Contributing

Run with Node.js 24+: `npm start`. Run checks with `npm test`.

Keep the decision core independent of UI and provider SDKs. Any change to voting must cover all 27 vote combinations, abstentions, and missing units. Never fabricate successful votes for failed calls.

Do not commit API keys, `.env`, original EVA media, or voice recordings. Describe model quality tests separately from mocked provider tests. Keep replay clearly labeled.

Bug reports should include Node version, OS, steps, expected/actual behavior, and model/provider ID if relevant. Remove keys and personal prompts from logs before posting.

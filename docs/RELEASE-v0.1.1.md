# v0.1.1-preview.1 — Classic MAGI screen

Replaces the original landing page and card layout with a recreation of the classic anime MAGI voting screen: BALTHASAR above, CASPER bottom-left, MELCHIOR bottom-right; cyan polygons, orange connections and borders, Japanese headings and a double-frame decision stamp.

The screen is interactive SVG, not a screenshot background. Proposal input, per-unit opinions, model settings and exports are available in dialogs. The 4:3 composition scales intact on mobile. Keyboard interaction, fullscreen and reduced motion are supported. Replay remains labeled and votes still reflect the deterministic decision rules.

Validation: all seven automated checks pass; desktop/mobile rendering, replay colors and verdict, proposal dialog and opinion dialog checked in Chromium. Runtime behavior and live-model/Harness validation limits remain as described in the previous preview.

See docs/UI-REFERENCE.md for references and fidelity limits. System font rendering and differences between anime frames mean this is not a claim of pixel-perfect identity to every source frame.

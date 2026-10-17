# 0.3.3 acceptance and privacy status — 2026-10-17

This remains a private **refinement preview**. [validation-0.3.3.json](validation-0.3.3.json) is historical evidence for its exact build, not a claim that this maintenance branch passed native acceptance.

Confirmed open items include `visual.humanAccepted=false`, `productionBuild.installerExecuted=false`, and `physicalInput.retested=false`. Synthetic pointer/click trials and visible native frames do not establish physical game input or installer acceptance. The full `notTested` array remains authoritative. Runtime supplements do not constitute new CMO3 exports or continuous native eyelid geometry.

Maintenance checks: frontend 15 tests, Windows Rust 16 unit tests and production build passed on 2026-10-17. CI outcomes are reported separately; no installer, actual game, login autostart, physical controller, manual audio or human artwork acceptance was performed this round.

CI runs only when this exact repository reports private. Permissions are read-only; there are no upload-artifact, cache or publish steps. Do not copy models, screenshots, source art, logs or private Release assets to public projects. No release mirroring script was found in the current scripts directory; this does not authorize adding one. Normal runtime input remains ephemeral in process memory, without persisted text/key history or network transmission.

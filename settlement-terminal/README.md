# Friendly mission-control terminal / Guide look 02

Standalone comparison candidate at `settlement-terminal/`. Navy console, mint wireframes, amber controls, subtle scanlines and a two-by-two mission layout. Mobile reflows to one column below 720 px. Reduced-motion preferences disable the cursor and status-light animation.

Four independently reversible confirmations drive the readiness meter. Towel packing is a separate toggle. New planet resets both; state is session-only. All controls are native buttons with pressed states, and the console message is announced through a live status region. This is a playful guide, not a connection to game progress or a completed Dyson system.

Reuses the derived static SVGs in `../settlement-guide/wireframes/`; their generator and original GLB references are documented there. No models or game mechanics are changed. Both looks link to each other. Look 03, the galactic holiday brochure, is now available at `../settlement-brochure/`. All three candidates remain available before selection for the game.

Validation: desktop Safari visual review, four confirmations reaching 100%, reopening a task to 75%, towel toggle and complete reset passed. Shared navigation validation, JavaScript syntax, local-resource/link and HTTP checks passed. Phone layout is implemented but not visually verified on a phone.

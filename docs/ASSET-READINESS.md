# Asset readiness states

Workshop status is evidence, not a quality adjective. Capability labels such as “Animated” and folder names such as `assets/game-ready/` do not establish runtime acceptance.

| State | Meaning |
| --- | --- |
| Original | Preserved authoring export, concept, detailed source or prototype. It may be useful and visually complete, but has not passed the current runtime contract. |
| Legacy derivative | An older reduced or engine-oriented export made under a previous target. It remains for compatibility or comparison and is not a current runtime recommendation. |
| Contract candidate | The declared files pass current repository validation and measured export budgets. Game-camera, selection-threshold or reference-phone acceptance can still be pending. |
| Reviewed runtime | The consuming game has accepted the pinned files with representative camera evidence, LOD thresholds and reference-phone measurements. |

No collection is labeled Reviewed runtime yet because the repository does not contain that full game-side acceptance evidence.

## Workshop collection status

| Route | Current state | Scope and remaining review |
| --- | --- | --- |
| `korp/` | Contract candidate | D0 LOD0/1/2 naming and mechanics validate; game-camera and reference-phone acceptance are pending. |
| `fabrication-lab/` | Contract candidate | Canonical Stålheart LOD0/1/2 composition and wireframe-only MÖRK one-shot validate; LOD1 byte/draw cost and final game-camera sequence remain under review. |
| `ammunition/` | Original | Reusable game/display package, but its current naming migration and consuming-weapon review are pending. |
| `hugin-flight/` | Contract candidate | Animated D0 source plus static landing-island LOD2; map threshold and phone review are pending. |
| `antenna-array/` | Original | Multi-detail animated prototype; current naming/schema migration is pending. |
| `missile-lab/` | Original | Reusable motion study, not a full weapon runtime acceptance claim. |
| `hover-tank/` | Contract candidate | Detailed/game assets plus D0 static distance tier; canonical LOD filename migration and game thresholds remain pending. |
| `sentries/` | Original | Procedural prototype families; current contract LOD, manifest and naming review is pending. |
| `reckon-guard/` | Original | Interactive prototype without a formal current-contract LOD family. |
| `isao-birudoron/` | Contract candidate | Production alpha with LOD0/1/2; art, damage, draw-call and game-performance review remain pending. |
| `game-assets/` | Contract candidate | HUGIN/Stålheart LOD1/2 across D0–D3; game-camera and reference-phone review are pending. |
| `launchpad/` | Contract candidate | Detailed originals plus current HUGIN LOD1/2 candidates; older 40k reductions remain legacy. |
| `terraformer/` | Contract candidate | Detailed originals plus current Stålheart LOD1/2 candidates; older 40k reductions remain legacy. |
| `assembly-line/` | Contract candidate | D0–D3 LOD1/2 validate; belt treatment, game camera and phone review are pending. |
| `warehouse-props/` | Original | Modular authored set awaiting current schema/naming/LOD review. |
| `solar-power/` | Contract candidate | Reference three-tier D0–D3 export set; game-side camera/threshold/phone evidence is still required for Reviewed runtime. |
| `micro-reactor/` | Original | Authored damage family awaiting current schema/naming/LOD review. |
| `research-outpost/` | Original | Broad modular prototype library awaiting optimization and current contract review. |
| `base-kit/` | Legacy derivative | The viewer mixes detailed originals with older reduced exports from `assets/base-kit-game/`; no current runtime acceptance claim. |
| `ctf-flags/` | Original | Animated gameplay prototype awaiting current schema/naming/LOD review. |
| `station-crew/` | Original | Animated character prototypes awaiting current runtime/LOD review. |
| `animation-tests/` | Original | Detailed KESTREL animation study, not a runtime-ready character tier. |

The generated repository-wide evidence is in `docs/ASSET-AUDIT.md` and `docs/generated/asset-contract-audit.json`. The per-file report records hashes, bytes, triangles, draw calls, materials, textures, animations, skins and naming findings for all GLBs.

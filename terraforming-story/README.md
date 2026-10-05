# From Landing to Starlight

An eleven-chapter interactive story at `terraforming-story/`, composed from existing A6 Workshop assets. It adds no GLB and does not change asset geometry, clips, sockets, score logic or gameplay inventories. The data source is `story-data.js`; `story.js` renders the selected chapter; `story.css` lays out the story and orbit diagram.

| Chapters | Causal handoff | Library status |
| --- | --- | --- |
| 01–02 | SH02 lands; ISAO and AFR-01 turn selected rocket sections plus local regolith into Stålheart feedstock | Existing assets and a visual salvage cycle; inventory remains game-side |
| 03–04 | Solar array/station power the first site; ISAO assembles Stålheart from the bootstrap stock | Existing power and construction families |
| 05–06 | Drill, cassette, hauler and crucible establish local material throughput; chip writing, assembly and fabrication expand output | Existing visual cycles; physical refining and inventory remain game-side |
| 07 | Greenhouse, stores, research and crew sustain a protected biological foothold | Existing assets; no planet-wide habitability claim |
| 08 | Water, atmosphere, temperature, soil and biosphere works extend beyond the protected outpost | Story proposal; processors and climate gameplay unauthored |
| 09 | ARC-01/SEED-01 and First Light demonstrate launches and a planet-orbit constellation | Existing assets/cinematic; no interplanetary transfer claim |
| 10 | Collectors move to heliocentric orbits and grow into a Dyson swarm | Story proposal; star-side transfer, station-keeping and collector network unauthored |
| 11 | Power is transmitted to receivers on/near the planet and feeds ongoing planetary works | Story proposal; receiver, relays and safety systems unauthored |

The scientific distinction matters: a Dyson swarm captures energy around a star, while the existing First Light reflector heads orbit the planet. The latter are an orbital prototype in this story, not the Dyson endpoint. NASA describes a Dyson swarm as a theoretical array of collectors encircling a star:

https://ntrs.nasa.gov/api/citations/20170004543/downloads/20170004543.pdf

The story is intentionally a production sequence and narrative presentation, not a claim that a complete physical terraforming pipeline, release-ready game integration, atmospheric model, launch mechanics or Dyson power transmission has been delivered. The final infrastructure is a clear brief for new assets.

Run `python3 tools/build-workshop-docs.py` and `python3 tools/validate-workshop-navigation.py` after editing routes or Devlog. The Workshop catalog card uses the existing First Light image as an illustration. No derived 3D asset handoff is needed; hand off the containing commit plus `terraforming-story/` and `docs/DEVLOG.md`.

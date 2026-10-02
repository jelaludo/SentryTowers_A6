# Dyson Command / post-terraforming strategy prototype

A standalone, turn-based browser design sketch at `dyson-command/`. The **Rules** tab at `dyson-command/?tab=rules` gives a worked opening, a glossary, all action rules and costs, collector rotation order, beam status meanings and both win conditions. Switching between the map and rules preserves the current run. It begins after the first world, Eos, has been terraformed in the [landing-to-starlight story](../terraforming-story/). The star map deliberately simplifies six planets; it does not import or alter any 3D asset. Galcon's official description of fleets sent planet to planet is a mechanical reference, while the optical routing and terraforming sequence are original A6 rules:

https://www.galcon.com/classic/index.html

## Frontier campaign

- Choose a controlled source world and destination. Send 1–N available ships; travel takes 1–3 abstract turns. A fleet must exceed defenders to secure a foothold. Surviving ships remain there.
- A foothold becomes a productive, receiver-equipped world after a 40-power terraforming action. It then builds ships each turn. This is a board-game transformation, not a simulated planetary climate.
- Four independent star-orbit collectors can be aimed only at specified receivers. A receiver accepts one beam. Unowned, unterraformed and saturated destinations produce zero. The four yields are 16, 18, 22 and 26 abstract power units per turn.
- A SOL orbital-laser pulse costs 24 stored power and removes seven defenders from a rival garrison. It is an optional tactic, not a physical energy/weapon model for the SOL-82 or SOL-88 GLBs.
- Win after terraforming four worlds and routing at least 75 output. Rival worlds can be fought, but the objective can also be reached through neutral worlds and light-routing choices.

## Optics challenge

Four receiver worlds start online. Fleets and lasers are disabled. Rotate the collectors until their beams reach four distinct worlds for 82 total output; 80 wins. This is the user's light-puzzle-only option.

`game-core.js` owns deterministic state and rules; `game.js` handles the interface. Reset and mode switching start a new scenario. No user account, save file, network play, random opponents, real orbital mechanics, Dyson completion claim or measured performance is implied. The four collector nodes are a speculative stellar network inspired by the HEL/SEED language; the existing First Light reflector ring remains in planetary orbit. Planet-side receptors/receivers are represented by abstract map state and have no authored GLB yet.

Use `node --test dyson-command/game-core.test.mjs` to check both win paths, fleet resolution, laser cost and receiver saturation. After route or Devlog changes, run `python3 tools/build-workshop-docs.py` and `python3 tools/validate-workshop-navigation.py`. Hand off the commit containing this folder plus `dyson-command/`; no asset export or compressed derivative was created.

# Your new planet / A6 pocket guide

A four-step retro instruction card at `settlement-guide/`, linked from the Workshop and the terraforming story. Ivory paper, orange headings, teal wireframes, reversible completion stamps and the towel reminder. Desktop uses four columns; below 1000 px it uses two, and below 560 px one. Narrow screens intentionally scroll for legibility.

`guide.js` toggles session-only stamps and resets them. Native buttons support keyboard activation, pressed state and an announced completion count. Each named machine links to its original viewer. The Dyson connection is future story intent; SOL-88 is orbital defence, not a stellar collector.

The six SVG illustrations in `wireframes/` are **derived static presentation assets**, projected from the unchanged plain GLBs listed in `wireframes/sources.json`. They are not model revisions or LOD exports. Rebuild from the repository root with:

```
node tools/asset-pipeline/build-guide-wireframes.mjs
python3 tools/build-workshop-docs.py
python3 tools/validate-workshop-navigation.py
```

Validation: navigation validator, guide local-link/resource checks, HTTP preview, JavaScript syntax and stamp/reset state checks pass. Wireframe raster previews were visually inspected. Live desktop/mobile browser layout review remains pending because the browser surface was unavailable during authoring. No 3D runtime dependencies or GLB downloads are needed to view this guide.

5 October follow-up: KORP and MÖRK now use different camera angles and separate flight/ground lanes in step 03. Desktop Safari visual review passed for the updated field card. The second candidate is at `../settlement-terminal/`; the third candidate is now at `../settlement-brochure/`.

# Workshop asset pipeline

Install the pinned dependencies with `npm install` in this directory. The asset-specific packers combine static geometry within moving assemblies and retain animation controls. The matching validators check exported geometry, metadata and animation contracts.

Original character assets are built with `tools/blender/build_station_characters.py` and `tools/blender/build_kestrel.py`. Their motion previews share `workshop/circular-travel.js`; walk/run clips remain reusable in place while the optional travel mode follows a circle.

The Stålheart / MÖRK fabrication family is derived directly from the existing plain GLB sources and does not require a Blender background session. Rebuild it with `node build-stalheart-mork-fabrication.mjs`; validate plain and decoded Meshopt exports with `node validate-stalheart-mork-fabrication.mjs`.

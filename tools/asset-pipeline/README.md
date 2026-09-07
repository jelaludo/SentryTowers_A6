# Workshop asset pipeline

Install the pinned dependencies with `npm install` in this directory. The asset-specific packers combine static geometry within moving assemblies and retain animation controls. The matching validators check exported geometry, metadata and animation contracts.

Original character assets are built with `tools/blender/build_station_characters.py` and `tools/blender/build_kestrel.py`. Their motion previews share `workshop/circular-travel.js`; walk/run clips remain reusable in place while the optional travel mode follows a circle.

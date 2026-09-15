const collectionImages={
'fabrication-lab':'assets/workshop/terraformer.jpg',
'isao-birudoron':'assets/workshop/isao-birudoron.jpg',
'arrival-foundry':'assets/workshop/arrival-foundry.jpg'
};

export const collections=[
['korp','KORP / Heavy gunship','Combat','MÖRK-family assault aircraft with forward rotary cannons, a downward-aiming heavy gun, tilting engines and mechanical animations.','3 LODs · 7 clips · Engine-driven aiming','Contract candidate'],
['sol82','SOL-82 / Orbital laser','Combat','A 52.55 m stored-energy combat satellite with an armored pulse spine, deployable arrays, thermal radiators and a gimbaled ventral aperture.','3 LODs · 4 clips · Primary wireframe presentation','Contract candidate'],
['fabrication-lab','Stålheart / MÖRK wireframe fabrication','Industry','The canonical complete Stålheart builds a recognizable MÖRK from bottom-to-top cyan linework; the one-shot deliberately ends at the full wireframe.','3 LODs · wireframe-only 16-second one-shot · Meshopt','Contract candidate'],
['arrival-foundry','AFR-01 / Seed Foundry','Industry','ISAO’s first build dismantles SH02 panels, processes recovered structure and local mineral feed, and fills ferroceramic barrels for Stålheart.','3 LODs · 2 clips · SH02 context · review pending','Contract candidate'],
['ammunition','Ammunition / bullets, shells & missiles','Missile','Companion ammunition for Rotor, Needle, MÖRK and mortar sentries. Inspect flight projectiles, complete rounds, empty cases and missiles.','21 families · Game + display tiers · naming migration pending','Original'],
['hugin-flight','HUGIN / SH02 · 3D rocket','Industry','Orbit the standalone rocket, inspect its tripod joints, play landing animations, or review its static map-view landing island.','5 clips · D0 landing-island LOD2 · review pending','Contract candidate'],
['antenna-array','SKYWARD / Antenna array','Infrastructure','Steerable radio dishes with continuous reflector shells, three detail levels, destruction states and a lightweight synchronized seven-dish scene.','3 detail levels · 4 states · animated','Original'],
['missile-lab','Missile motion lab','Combat','Three reusable projectiles. Soft launch, nose-up coast and accelerating flight arcs.','3 mesh budgets · 3 flight profiles · animated','Original'],
['hover-tank','MÖRK','Combat','MÖRK hover tank plus fitted armored transport containers: empty, loaded and a numbered three-bay deployment diorama.','Detailed + game + static distance · review pending','Contract candidate'],
['sentries','Sentry families','Combat','Eleven articulated tower families, from Needle to the six-legged Heptapod A6.','33 equipment variants · animated prototypes','Original'],
['reckon-guard','Reckon-Guard','Combat','Inspect the autonomous guard drone and its moving assemblies.','Interactive animated model','Original'],
['isao-birudoron','ISAO-Birudorōn / ビルドローン','Characters','Production-alpha Japanese construction character with animated LED emotions, limb acting, rotors and fabrication tool.','3 production tiers · 17 clips · review pending','Contract candidate'],
['game-assets','HUGIN + Stålheart / Landmark LODs','Industry','Current-contract LOD1/LOD2 candidates beside preserved legacy and detailed geometry.','D0–D3 · review pending','Contract candidate'],
['launchpad','HUGIN','Industry','Reusable entry vehicle, launch platform and articulated cargo-catching arm.','Detailed originals + LOD1/LOD2 candidates · 4 states','Contract candidate'],
['terraformer','Stålheart / Terraformer 3000','Industry','An imposing rail-mounted printer with a six-joint arm and twin material reservoirs.','Detailed originals + LOD1/LOD2 candidates · 4 states','Contract candidate'],
['assembly-line','Robotic assembly line','Industry','A long conveyor, eight articulated robots, gantries and reusable factory modules.','D0–D3 · LOD1/LOD2 · review pending','Contract candidate'],
['warehouse-props','Logistics & cargo','Industry','A roofless loading-bay diorama with a container, loaded pallet, cases and fuel barrels.','Modular authored collection','Original'],
['solar-power','Solar power network','Infrastructure','Solar arrays and tower grids with detailed, game and distance models, Meshopt downloads and automatic LOD preview.','3 LODs · Meshopt · 4 damage states · review pending','Contract candidate'],
['micro-reactor','Open micro-reactor','Infrastructure','An exposed reactor core and its surrounding machinery.','Power systems · animated','Original'],
['research-outpost','Alien research outpost','Infrastructure','Labs, habitats, utilities and service structures for an extraterrestrial settlement.','12 families · 48 prototype models','Original'],
['base-kit','Foundations & walls','Infrastructure','Lightweight foundations, walls, corners and an animated gate. Compare original meshes and inspect up to 1,000 GPU-instanced modules.','8 modules · Original + older reduced tiers','Legacy derivative'],
['ctf-flags','Capture the Flag','Props','Faction banners, pole styles and capture sockets with animated flag behavior.','6 banners · 3 pole styles · animated','Original'],
['station-crew','Station crew','Characters','Suited astronauts, scientists and workers with shared animation controls.','3 roles · 7 clips · animated','Original'],
['animation-tests','KESTREL / Frontier EVA','Characters','An original detailed astronaut with a lean weathered suit, opaque visor and circular walk/run previews.','Original EVA · 7 clips · animated','Original']
].map(([id,title,category,description,meta,tag])=>({id,title,category,description,meta,tag,image:collectionImages[id]||`assets/workshop/${id}.jpg`,url:`${id}/`}));

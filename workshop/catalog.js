export const collections=[
['antenna-array','SKYWARD / Antenna array','Infrastructure','Large steerable radio dishes with three mesh-detail levels, destruction states and a synchronized seven-dish scene.','3 detail levels · 4 states','Animated'],
['missile-lab','Missile motion lab','Combat','Three reusable projectiles. Soft launch, nose-up coast and accelerating flight arcs.','3 mesh budgets · 3 flight profiles','Animated'],
['hover-tank','MÖRK','Combat','Lean hover tank with heavy recoil, twin plasma mounts and a rear-deck ammunition display.','2 detail levels · 4 states','Animated'],
['sentries','Sentry families','Combat','Eleven articulated tower families, from Needle to the six-legged Heptapod A6.','33 equipment variants','Animated'],
['reckon-guard','Reckon-Guard','Combat','Inspect the autonomous guard drone and its moving assemblies.','Interactive model','Animated'],
['game-assets','HUGIN + Stålheart / Game editions','Industry','Reduced-mesh editions of the launchpad and planetary printer, together for comparison.','Around 40K triangles each','Game-ready'],
['launchpad','HUGIN','Industry','Reusable entry vehicle, launch platform and articulated cargo-catching arm.','2 detail levels · 4 states','Animated'],
['terraformer','Stålheart / Terraformer 3000','Industry','An imposing rail-mounted printer with a six-joint arm and twin material reservoirs.','2 detail levels · 4 states','Animated'],
['assembly-line','Robotic assembly line','Industry','A long conveyor, articulated robots, gantries and reusable factory modules.','Complete line + modules','Animated'],
['warehouse-props','Logistics & cargo','Industry','A roofless loading-bay diorama with a container, loaded pallet, cases and fuel barrels.','Modular collection','Props'],
['solar-power','Solar power network','Infrastructure','Solar arrays and tower grids for building a connected power site.','Power systems','Modular'],
['micro-reactor','Open micro-reactor','Infrastructure','An exposed reactor core and its surrounding machinery.','Power systems','Animated'],
['research-outpost','Alien research outpost','Infrastructure','Labs, habitats, utilities and service structures for an extraterrestrial settlement.','12 families · 48 models','Modular'],
['base-kit','Base construction kit','Infrastructure','Walls, corners, foundations and an animated vehicle gate.','Walls + gate + foundations','Modular'],
['ctf-flags','Capture the Flag','Props','Faction banners, pole styles and capture sockets with animated flag behavior.','6 banners · 3 pole styles','Animated'],
['station-crew','Station crew','Characters','Suited astronauts, scientists and workers with shared animation controls.','3 roles · 7 clips','Animated'],
['animation-tests','KESTREL / Frontier EVA','Characters','An original detailed astronaut with a lean weathered suit, opaque visor and circular walk/run previews.','Original EVA · 7 clips','Animated']
].map(([id,title,category,description,meta,tag])=>({id,title,category,description,meta,tag,image:`assets/workshop/${id}.jpg`,url:`${id}/`}));

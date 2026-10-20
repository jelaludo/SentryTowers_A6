import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions';
import {dedup,reorder} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {
  buildReconRover,
  buildCollisionProxies,
  ENGINE_NODES,
  WHEEL_SPECS,
  THRUSTER_SPECS,
  DAMAGE_ZONES,
  DEBRIS_SPECS
} from './recon-rover-s-shape.mjs';

const out=new URL('../../assets/recon-rover-s/',import.meta.url);
await fs.mkdir(out,{recursive:true});

globalThis.FileReader=class{
  readAsArrayBuffer(b){b.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}
  readAsDataURL(b){b.arrayBuffer().then(x=>{this.result=`data:${b.type};base64,${Buffer.from(x).toString('base64')}`;this.onloadend?.();});}
};

await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const assets=[];

for(const damage_level of [0,1,2,3]){
  for(const lod of [0,1,2]){
    const root=buildReconRover(lod,damage_level);
    root.updateMatrixWorld(true);
    let triangles=0,draw_calls=0;
    const names=[],sockets=[],mats=new Set();
    root.traverse(o=>{
      names.push(o.name);
      if(o.isMesh){
        triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
        draw_calls++;
        mats.add(o.material);
      }
      if(o.name.startsWith('SOCKET_')){
        const entry={
          id:o.name.slice(7),
          node:o.name,
          parent:o.parent?.name||null,
          kind:o.userData.kind,
          position_m:o.getWorldPosition(new T.Vector3()).toArray().map(v=>+v.toFixed(4)),
          normal:o.userData.normal||[0,0,1]
        };
        if(o.userData.exhaust_axis_local){
          entry.exhaust_axis_local=o.userData.exhaust_axis_local;
          entry.pitch_limit_deg=o.userData.pitch_limit_deg;
          entry.roll_limit_deg=o.userData.roll_limit_deg;
        }
        if(o.userData.zone){
          entry.zone=o.userData.zone;
        }
        sockets.push(entry);
      }
    });
    const bounds=new T.Box3().setFromObject(root);
    const file=`lod${lod}/r47xs_recon_rover_d${damage_level}_lod${lod}.glb`;
    await fs.mkdir(new URL(`lod${lod}/`,out),{recursive:true});
    const bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,trs:true}));
    await fs.writeFile(new URL(file,out),bytes);

    const doc=await io.readBinary(bytes);
    await doc.transform(dedup(),reorder({encoder:MeshoptEncoder,target:'size'}));
    doc.createExtension(EXTMeshoptCompression)
      .setRequired(true)
      .setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.FILTER});
    const packed=Buffer.from(await io.writeBinary(doc));
    const meshopt_file=`derived/meshopt/lod${lod}/r47xs_recon_rover_d${damage_level}_lod${lod}.meshopt.glb`;
    await fs.mkdir(new URL(`derived/meshopt/lod${lod}/`,out),{recursive:true});
    await fs.writeFile(new URL(meshopt_file,out),packed);

    const proxies=buildCollisionProxies({},damage_level);

    const entry={
      id:`r47xs_recon_rover_d${damage_level}_lod${lod}`,
      family:'recon_rover_s',
      file,
      lod,
      damage_level,
      static:lod===2,
      derived:false,
      review_status:'contract_candidate_pending_game_review',
      bytes:bytes.length,
      sha256:sha(bytes),
      triangles:Math.round(triangles),
      draw_calls,
      materials:mats.size,
      textures:0,
      meshopt_file,
      meshopt_bytes:packed.length,
      meshopt_sha256:sha(packed),
      meshopt_derived:true,
      plot_m:[6,8],
      bounds:{
        min:bounds.min.toArray().map(v=>+v.toFixed(4)),
        max:bounds.max.toArray().map(v=>+v.toFixed(4)),
        dimensions_m:bounds.getSize(new T.Vector3()).toArray().map(v=>+v.toFixed(4))
      },
      sockets,
      colliders:proxies.filter(p=>!p.fragment_node),
      debris_colliders:proxies.filter(p=>Boolean(p.fragment_node)),
      clips:[],
      engine_nodes:ENGINE_NODES,
      required_nodes:names.filter(Boolean),
      credit:'Models by jelaludo'
    };
    assets.push(entry);
    console.log(entry.id,entry.triangles,'tris',entry.draw_calls,'draws',entry.bytes,'bytes','meshopt:',entry.meshopt_bytes,'bytes');
  }
}

const manifest={
  schema:'jelaludo.asset-family/v2-candidate',
  family:'recon_rover_s',
  category:'mobile_unit_with_optional_static_distance',
  label:'R-47X-S / 6x6 Unmanned Reconnaissance Rover with Graduated & Localized Damage (D0–D3), XB-12-style Swing-Arm Suspension, 8 Gimbaled Thrusters & Onboard Telemetry',
  status:'contract_candidate_pending_game_review',
  plain_glb_source_of_truth:true,
  coordinate_system:{
    units:'meters',
    up:'+Y',
    forward:'+Z',
    origin:'ground at plot centre',
    lateral_convention:'-X is rover left flank (appears on screen-right from -Z rear chase camera); +X is rover right flank (appears on screen-left from -Z rear chase camera).'
  },
  supported_damage_levels:[0,1,2,3],
  damage_states:{
    D0:{
      level:0,
      id:'D0',
      label:'Intact',
      summary:'Clean nominal chassis, open wheel arches, true 6x6 wheel geometry, straight 8 thruster bells, upright sensor mast, uncracked display covers.',
      capabilities:{drive_factor:1.0,steer_factor:1.0,suspension_factor:1.0,thrust_factor:1.0,sensor_sector_deg:360,cold_gas_leak:false,detachable_debris:false}
    },
    D1:{
      level:1,
      id:'D1',
      label:'Battered',
      summary:'Dented/bent nose and flank armor plates, scuffed titanium edges, and cracked display protective covers (DISPLAY_CRACK_OVERLAY). Full articulation preserved.',
      capabilities:{drive_factor:1.0,steer_factor:1.0,suspension_factor:1.0,thrust_factor:1.0,sensor_sector_deg:360,cold_gas_leak:false,detachable_debris:false}
    },
    D2:{
      level:2,
      id:'D2',
      label:'Component Damage',
      summary:'Visibly buckled suspension arm, flat-spotted/cambered tire, bent/crimped nozzle bell, tilted sensor head with exposed internals, and optional COPV manifold cold-gas leak.',
      capabilities:{drive_factor:0.45,steer_factor:0.5,suspension_factor:0.40,thrust_factor:0.5,sensor_sector_deg:150,cold_gas_leak:true,detachable_debris:false}
    },
    D3:{
      level:3,
      id:'D3',
      label:'Disabled Wreck',
      summary:'Collapsed suspension/axle posture, sheared/missing hull panels, crushed nozzle bells, snapped sensor mast, and 5 bounded detachable debris fragments.',
      capabilities:{drive_factor:0.0,steer_factor:0.0,suspension_factor:0.0,thrust_factor:0.0,sensor_sector_deg:0,cold_gas_leak:false,detachable_debris:true}
    }
  },
  damage_zones:DAMAGE_ZONES.map(z=>({
    ...z,
    supported_levels:[0,1,2,3],
    debris_node:DEBRIS_SPECS.find(d=>d.zone===z.id)?.id||null,
    colliders_by_state:[0,1,2,3].map(lvl=>buildCollisionProxies({[z.id]:lvl},0).find(c=>c.zone===z.id&&!c.fragment_node))
  })),
  detachable_debris:DEBRIS_SPECS.map(d=>({
    ...d,
    max_fragments_budget:5
  })),
  localized_presets:[
    {id:'d0_intact',label:'Whole Rover — D0 Intact',default_level:0,overrides:{}},
    {id:'d1_battered',label:'Whole Rover — D1 Battered',default_level:1,overrides:{}},
    {id:'d2_component',label:'Whole Rover — D2 Component Damage + Gas Leak',default_level:2,overrides:{}},
    {id:'d3_wreck',label:'Whole Rover — D3 Disabled Wreck + Debris',default_level:3,overrides:{}},
    {
      id:'front_left_impact',
      label:'Localized — Front-Left Impact (-X / Chase-Right)',
      default_level:0,
      overrides:{FRONT_BUMPER:2,WHEEL_FL:3,NOZZLE_V_FL:2,NOZZLE_L_FL:2,FLANK_NEG_X:1,SENSOR_MAST:1}
    },
    {
      id:'flank_gas_leak',
      label:'Localized — Left Flank COPV Breach (-X / Chase-Right)',
      default_level:0,
      overrides:{FLANK_NEG_X:2,WHEEL_ML:2,NOZZLE_L_FL:2,NOZZLE_L_RL:3,SENSOR_MAST:2}
    },
    {
      id:'rear_shunt',
      label:'Localized — Rear Bulkhead & Thruster Shunt',
      default_level:0,
      overrides:{REAR_PANEL:2,WHEEL_RL:2,WHEEL_RR:1,NOZZLE_V_RL:3,NOZZLE_V_RR:2}
    }
  ],
  budgets:{
    lod1:{triangles:25000,category:"unit articulated; draw and byte measurements reported separately"},
    lod2:{triangles:3000,draw_calls:1,bytes:250000}
  },
  lod_selection:{
    initial:2,
    approach_distance_m:140,
    hysteresis_m:20,
    provisional:true,
    detailed:'Close inspection, localized damage zone swapping, suspension/thruster engineering cutaways and cinematic recordings',
    distance:'Static merged rest pose per damage state (D0–D3) with one material and one draw call. Swap to LOD1 before spinning wheels, steering, articulating suspension, rotating sensor mast, swapping localized zones, or firing cold-gas thrusters.'
  },
  articulation:{
    dampers:{count:6,upper_socket:'SOCKET_DAMPER_UPPER_{wheel}',lower_socket:'SOCKET_DAMPER_LOWER_{wheel}',aim:'DAMPER_AIM_{wheel}',rod_slide:'DAMPER_ROD_SLIDE_{wheel}',barrel_length_m:0.34,rod_length_m:0.34,solver:'runtime.js solveDampers; solve chassis-local upper/lower endpoints after suspension and chassis transforms',travel_sign:'Positive suspension travel lowers wheel hub (R-47X adapter convention)',static_distance:true},
    wheels:WHEEL_SPECS.map(w=>({
      id:w.id,
      zone:`WHEEL_${w.id}`,
      side_sign:w.side<0?'-X':'+X',
      chase_camera_side:w.side<0?'right':'left',
      suspension_pivot:`SUSP_PIVOT_${w.id}`,
      suspension_arm:`SUSP_ARM_${w.id}`,
      steering_pivot:`WHEEL_STEER_${w.id}`,
      spin_pivot:`WHEEL_SPIN_${w.id}`,
      wheel_mesh:`WHEEL_${w.id}`,
      steerable:w.steerable,
      steer_axis:'+Y',
      steer_limit_deg:[-w.steerLimitDeg,w.steerLimitDeg],
      spin_axis:'+X',
      wheel_radius_m:0.48,
      suspension_swing_z_deg:[-16,14],
      suspension_travel_y_m:[-0.12,0.14],
      capabilities_by_state:{
        D0:{spin_rate_factor:1.0,steer_limit_factor:1.0,travel_factor:1.0,wobble_rad:0.0},
        D1:{spin_rate_factor:1.0,steer_limit_factor:1.0,travel_factor:1.0,wobble_rad:0.015},
        D2:{spin_rate_factor:0.45,steer_limit_factor:0.5,travel_factor:0.40,wobble_rad:0.085},
        D3:{spin_rate_factor:0.0,steer_limit_factor:0.0,travel_factor:0.0,wobble_rad:0.0,collapsed:true}
      }
    })),
    thrusters:THRUSTER_SPECS.map(t=>({
      id:t.id,
      zone:`NOZZLE_${t.id}`,
      group:t.group,
      side_sign:t.pos[0]<0?'-X':'+X',
      chase_camera_side:t.pos[0]<0?'right':'left',
      gimbal_pivot:`GIMBAL_${t.id}`,
      nozzle_mesh:`THRUSTER_${t.id}`,
      exit_socket:`SOCKET_THRUSTER_${t.id}`,
      exhaust_axis_local:[0,-1,0],
      rest_cant_rad:t.cant,
      pitch_axis:'+X',
      pitch_limit_deg:t.pitchLimitDeg,
      roll_axis:'+Z',
      roll_limit_deg:t.rollLimitDeg,
      capabilities_by_state:{
        D0:{gimbal_factor:1.0,thrust_factor:1.0,sputter:false},
        D1:{gimbal_factor:1.0,thrust_factor:0.95,sputter:false},
        D2:{gimbal_factor:0.45,thrust_factor:0.5,sputter:true},
        D3:{gimbal_factor:0.0,thrust_factor:0.0,disabled:true}
      }
    })),
    sensor_mast:{
      zone:'SENSOR_MAST',
      yaw_pivot:'SENSOR_MAST_YAW',
      yaw_axis:'+Y',
      yaw_limit_deg:[-180,180],
      yaw_continuous:true,
      pitch_pivot:'OPTICS_HEAD_PITCH',
      pitch_axis:'+X',
      pitch_limit_deg:[-38,28],
      head_mesh:'SENSOR_MAST_HEAD',
      optics_socket:'SOCKET_SENSOR_MAST',
      capabilities_by_state:{
        D0:{yaw_rate_factor:1.0,sector_deg:360,pitch_factor:1.0},
        D1:{yaw_rate_factor:0.95,sector_deg:360,pitch_factor:1.0},
        D2:{yaw_rate_factor:0.42,sector_deg:150,pitch_factor:0.5},
        D3:{yaw_rate_factor:0.0,sector_deg:0,pitch_factor:0.0,disabled:true}
      }
    },
    cold_gas_leaks:[
      {zone:'FLANK_NEG_X',socket:'SOCKET_GAS_LEAK_NEG_X',side_sign:'-X',chase_camera_side:'right',active_in_states:['D2']},
      {zone:'FLANK_POS_X',socket:'SOCKET_GAS_LEAK_POS_X',side_sign:'+X',chase_camera_side:'left',active_in_states:['D2']},
      {zone:'REAR_PANEL',socket:'SOCKET_GAS_LEAK_REAR',side_sign:'0',chase_camera_side:'center',active_in_states:['D2']}
    ],
    onboard_displays:[
      {
        id:'speed_left',
        mesh:'DISPLAY_SPEED_LEFT',
        socket:'SOCKET_DISPLAY_SPEED_L',
        material:'DISPLAY_SPEED_ORANGE_MAT',
        crack_overlay:'DISPLAY_CRACK_OVERLAY',
        location:'Left rear wheel cover (-X side; screen-right from -Z rear chase camera)',
        color_hex:'#d98a2b',
        uv_mapped:true
      },
      {
        id:'thrust_right',
        mesh:'DISPLAY_THRUST_RIGHT',
        socket:'SOCKET_DISPLAY_THRUST_R',
        material:'DISPLAY_THRUST_CYAN_MAT',
        crack_overlay:'DISPLAY_CRACK_OVERLAY',
        location:'Right rear wheel cover (+X side; screen-left from -Z rear chase camera)',
        color_hex:'#38e8ff',
        uv_mapped:true
      },
      {
        id:'gas_reserve_rear',
        mesh:'DISPLAY_GAS_RESERVE_REAR',
        socket:'SOCKET_DISPLAY_GAS_REAR',
        material:'DISPLAY_GAS_RESERVE_MAT',
        crack_overlay:'DISPLAY_CRACK_OVERLAY',
        location:'Rear central bulkhead panel',
        color_hex:'#46f09a',
        uv_mapped:true
      },
      {
        id:'fdai_telemetry_panel',
        mesh:'DISPLAY_FDAI_TELEMETRY_PANEL',
        socket:'SOCKET_DISPLAY_FDAI_REAR',
        material:'DISPLAY_FDAI_TELEMETRY_MAT',
        crack_overlay:'DISPLAY_CRACK_OVERLAY',
        location:'Rear dorsal black panel (NASM Apollo FDAI-inspired codified yaw/pitch/roll rate & height/level indicator)',
        color_hex:'#e6eef2',
        uv_mapped:true
      }
    ]
  },
  runtime:{
    adapter:'runtime.js',
    particle_helper:'thruster-fx.js',
    particle_texture:'cold-gas-puff.png',
    baked_clips:[],
    demonstration:{name:'Low_Gravity_Recon_Jump_Cycle',duration_s:16,loop:true},
    scope:'No baked vehicle movement. Supports whole-rover D0–D3 exports across LOD0–LOD2 AND zero-reload in-place localized zone swapping (applyLocalizedDamage) across 19 addressable zones, optional bounded D2 cold-gas COPV leak plumes, 5 detachable D3 debris fragments with convex collision proxies, and 4 UV-mapped onboard telemetry displays with separate crack overlays.'
  },
  assets
};

await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');

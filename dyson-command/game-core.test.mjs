import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGame,planet,beamLinks,powerOutput,launchFleet,terraform,laserPulse,rotateCollector,waitTurn,objective} from './game-core.js';

test('optics challenge needs four distinct live receivers',()=>{
 const state=makeGame('optics');assert.equal(powerOutput(state),16);assert.equal(beamLinks(state)[1].reason,'receiver saturated');
 rotateCollector(state,'hel2');rotateCollector(state,'seed1');rotateCollector(state,'seed1');rotateCollector(state,'seed2');assert.equal(powerOutput(state),56);assert.equal(state.won,false);
 rotateCollector(state,'seed2');assert.equal(powerOutput(state),82);assert.equal(state.won,true);assert.equal(launchFleet(state,'eos','vesper',5).ok,false);
});

test('fleet capture needs a follow-up terraform action and power routing',()=>{
 const state=makeGame();assert.equal(launchFleet(state,'eos','iona',9).ok,true);assert.equal(planet(state,'iona').owner,'neutral');waitTurn(state);assert.equal(planet(state,'iona').owner,'player');assert.equal(planet(state,'iona').terraform,false);assert.equal(powerOutput(state),16);
 assert.equal(terraform(state,'iona').ok,true);rotateCollector(state,'seed1');rotateCollector(state,'seed1');assert.equal(powerOutput(state),38);
 launchFleet(state,'eos','talus',10);waitTurn(state);assert.equal(terraform(state,'talus').ok,true);rotateCollector(state,'hel2');assert.equal(powerOutput(state),56);
 launchFleet(state,'talus','kora',6);assert.equal(planet(state,'kora').owner,'player');assert.equal(terraform(state,'kora').ok,true);assert.equal(objective(state).worlds,4);assert.equal(state.won,false);
 rotateCollector(state,'seed2');rotateCollector(state,'seed2');assert.equal(powerOutput(state),82);assert.equal(state.won,true);
});

test('orbital pulse spends power and weakens only a rival',()=>{
 const state=makeGame(),before=state.power,defenders=planet(state,'vesper').ships;assert.equal(laserPulse(state,'iona').ok,false);assert.equal(state.power,before);const result=laserPulse(state,'vesper');assert.equal(result.ok,true);assert.equal(planet(state,'vesper').ships,defenders-7+1);assert.equal(state.power,before-24+16);
});

test('invalid orders do not advance the turn',()=>{
 const state=makeGame(),turn=state.turn;assert.equal(launchFleet(state,'eos','eos',3).ok,false);assert.equal(launchFleet(state,'eos','iona',99).ok,false);assert.equal(terraform(state,'iona').ok,false);assert.equal(state.turn,turn);
});

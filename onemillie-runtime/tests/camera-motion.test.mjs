import test from 'node:test';import assert from 'node:assert/strict';import {sampleCameraTransition,CAMERA_DURATION} from '../lib/camera-motion.mjs';
const from={position:[0,0,0],look:[0,0,-6],fov:55},to={position:[-.03,.005,-.035],look:[-1,0,-3],fov:23};
test('zoom reaches its exact endpoint after 1150ms even with only one rendered frame',()=>{const p=sampleCameraTransition(from,to,CAMERA_DURATION);assert.deepEqual(p.position,to.position);assert.deepEqual(p.look,to.look);assert.equal(p.fov,to.fov);assert.equal(p.progress,1);});
test('zoom has continuous midpoint and clamped endpoints',()=>{assert.deepEqual(sampleCameraTransition(from,to,-1).position,from.position);assert.equal(sampleCameraTransition(from,to,575).fov,39);assert.equal(sampleCameraTransition(from,to,9000).fov,23);});

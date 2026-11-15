import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {viewMatrix} from '../assets/starter/lib/spatial.js';
import {createInput,createKeys} from '../assets/starter/lib/input.js';
import {drawScene} from '../assets/starter/lib/scene.js';
const pageFile=new URL('../assets/starter/pages/index/index.ink',import.meta.url);
function setup(){
 let time=1000,id=0;const timers=new Map(),sensors=[];
 const setTimer=fn=>{timers.set(++id,fn);return id;},clearTimer=n=>timers.delete(n);
 const ctx=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 class Sensor{constructor(){this.handlers=new Map();sensors.push(this);this.started=0;this.stopped=0;}addEventListener(k,f){this.handlers.set(k,f);}removeEventListener(k){this.handlers.delete(k);}start(){this.started++;}stop(){this.stopped++;}}
 class Clock extends Date{static now(){return time;}}
 const source=fs.readFileSync(pageFile,'utf8').match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*;\s*$/gm,'').replace('export default','globalThis.page =');
 const sandbox={wx:{createCanvasContext:()=>ctx},viewMatrix,createInput,createKeys:(input,o)=>createKeys(input,{...o,setTimer,clearTimer,now:()=>time}),drawScene,AbsoluteOrientationSensor:Sensor,Date:Clock,setTimeout:setTimer,clearTimeout:clearTimer,Set,Math,console};
 vm.runInNewContext(source,sandbox);return{page:sandbox.page,timers,sensors,ctx,setTime:t=>time=t};
}
test('actual Page waits for canvas, suspends sensors/timers, and reopens once',()=>{
 const {page,timers,sensors}=setup();page.onLoad();page.onShow();assert.equal(timers.size,0);assert.equal(sensors.length,1);page.onReady();assert.equal(timers.size,1);
 sensors[0].handlers.get('reading')({quaternion:[0,0,0,1]});const late=sensors[0].handlers.get('reading');page.onHide();assert.equal(timers.size,0);assert.equal(sensors[0].stopped,1);assert.equal(sensors[0].handlers.size,0);late({quaternion:[1,0,0,0]});assert.equal(page.input.state.readingAt,null);
 page.onShow();page.startLoop();page.startSensor();assert.equal(timers.size,1);assert.equal(sensors.length,2);page.onUnload();assert.equal(timers.size,0);assert.equal(sensors[1].stopped,1);
});
test('actual renderer exposes no head targets in menu mode',()=>{const {ctx}=setup(),input=createInput();input.open();const result=drawScene(ctx,input,new Set(),viewMatrix([0,0,0,1],[0,0,0,1]));assert.deepEqual(result.targets,[]);assert.equal(result.hit,null);});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {viewMatrix} from '../assets/starter/lib/spatial.js';
import {createInput,createKeys} from '../assets/starter/lib/input.js';
import {drawScene} from '../assets/starter/lib/scene.js';
import {createStore,encodeSave,decodeSave} from '../assets/starter/lib/store.js';
const pageFile=new URL('../assets/starter/pages/index/index.ink',import.meta.url);
const SLOTS=['spatial-save-a.json','spatial-save-b.json'];

// Minimal OPFS stand-in: real readback semantics, in-memory files.
function setup(files=new Map()){
 let time=1000,id=0,flushes=0;const timers=new Map(),sensors=[];
 const setTimer=fn=>{timers.set(++id,fn);return id;},clearTimer=n=>timers.delete(n);
 const base={flush(){flushes++;}};
 const ctx=new Proxy(base,{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const handle=name=>({
   getFile:async()=>{const text=files.get(name);if(text===undefined){const error=new Error('NotFoundError');error.name='NotFoundError';throw error;}return{size:text.length,arrayBuffer:async()=>new TextEncoder().encode(text).buffer};},
   createWritable:async()=>{let buffer='';return{truncate:async()=>{buffer='';},write:async text=>{buffer=text;},close:async()=>{files.set(name,buffer);}};},
 });
 const storage={getDirectory:async()=>({getFileHandle:async(name,options={})=>{
   if(!options.create&&!files.has(name)){const error=new Error('NotFoundError');error.name='NotFoundError';throw error;}
   return handle(name);
 }})};
 class Sensor{constructor(){this.handlers=new Map();sensors.push(this);this.started=0;this.stopped=0;}addEventListener(k,f){this.handlers.set(k,f);}removeEventListener(k){this.handlers.delete(k);}start(){this.started++;}stop(){this.stopped++;}}
 class Clock extends Date{static now(){return time;}}
 const source=fs.readFileSync(pageFile,'utf8').match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*;\s*$/gm,'').replace('export default','globalThis.page =');
 const sandbox={wx:{createCanvasContext:()=>ctx},viewMatrix,createInput,createKeys:(input,o)=>createKeys(input,{...o,setTimer,clearTimer,now:()=>time}),drawScene,createStore,navigator:{storage},AbsoluteOrientationSensor:Sensor,Date:Clock,setTimeout:setTimer,clearTimeout:clearTimer,Set,Math,console};
 vm.runInNewContext(source,sandbox);return{page:sandbox.page,timers,sensors,ctx,files,setTime:t=>time=t,flushes:()=>flushes};
}

test('actual Page waits for canvas, suspends sensors/timers, and reopens once',async()=>{
 const {page,timers,sensors}=setup();page.onLoad();await page.ready;
 page.onShow();assert.equal(timers.size,0);assert.equal(sensors.length,1);page.onReady();assert.equal(timers.size,1);
 sensors[0].handlers.get('reading')({quaternion:[0,0,0,1]});const late=sensors[0].handlers.get('reading');page.onHide();assert.equal(timers.size,0);assert.equal(sensors[0].stopped,1);assert.equal(sensors[0].handlers.size,0);late({quaternion:[1,0,0,0]});assert.equal(page.input.state.readingAt,null);
 page.onShow();page.startLoop();page.startSensor();assert.equal(timers.size,1);assert.equal(sensors.length,2);page.onUnload();assert.equal(timers.size,0);assert.equal(sensors[1].stopped,1);
});

test('actual renderer exposes no head targets in menu mode',()=>{const {ctx}=setup(),input=createInput();input.open();const result=drawScene(ctx,input,new Set(),viewMatrix([0,0,0,1],[0,0,0,1]));assert.deepEqual(result.targets,[]);assert.equal(result.hit,null);});

test('restored state is on screen before the first frame, and edits are committed',async()=>{
 const files=new Map([[SLOTS[0],encodeSave({cells:['cell:0:1','cell:2:3'],dwell:true},1)]]);
 const {page,timers,files:disk}=setup(files);
 page.onLoad();
 // The load is still in flight: the loop must present a loading frame, not the scene.
 assert.equal(page.settled,false);
 page.onShow();page.onReady();assert.equal(timers.size,0);
 await page.ready;
 assert.equal(page.settled,true);
 assert.deepEqual([...page.enabled],['cell:0:1','cell:2:3']);
 assert.equal(page.input.state.dwell,true);
 page.startLoop();assert.equal(timers.size,1);
 page.activate({kind:'activate',id:'cell:0:1'});
 await page.store.flush();
 const committed=decodeSave(disk.get(SLOTS[1]));
 assert.equal(committed.generation,2);
 assert.deepEqual(committed.data,{cells:['cell:2:3'],dwell:true});
});

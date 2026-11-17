import test from 'node:test';
import assert from 'node:assert/strict';
import {fitQuadText,drawQuadLabel} from '../assets/starter/lib/text.js';
import {createStore,checksum,encodeSave,decodeSave} from '../assets/starter/lib/store.js';
import {createInput} from '../assets/starter/lib/input.js';
import {inside,inflate,hitTest,project,viewMatrix} from '../assets/starter/lib/spatial.js';

const identity=[0,0,0,1];
const rect=(w,h,cx=0,cy=0)=>[[cx-w/2,cy-h/2],[cx+w/2,cy-h/2],[cx+w/2,cy+h/2],[cx-w/2,cy+h/2]];
const rotate=(points,degrees,cx=0,cy=0)=>{
  const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return points.map(([x,y])=>{const dx=x-cx,dy=y-cy;return [cx+dx*c-dy*s,cy+dx*s+dy*c];});
};

test('text layout fits the quad, follows its roll and refuses unreadable scales',()=>{
  const flat=fitQuadText(rect(100,40),80,16);
  assert.equal(flat.scale,1);assert(Math.abs(flat.angle)<1e-9);
  const rolled=fitQuadText(rotate(rect(100,40),30),80,16);
  assert.equal(rolled.scale,1);assert(Math.abs(rolled.angle-30*Math.PI/180)<1e-9);
  // Narrow quad: the same text must shrink rather than overflow.
  const narrow=fitQuadText(rect(30,40),80,16,{minScale:0.05});
  assert(narrow.scale<1&&narrow.scale>0.05);assert(narrow.width<=30);
  assert.equal(fitQuadText(rect(30,40),80,16),null);
  assert.equal(fitQuadText([[0,0],[1,1]],80,16),null);
  assert.equal(fitQuadText([[NaN,0],[1,0],[1,1],[0,1]],80,16),null);
});

test('every fitted label stays inside its projected cell under real poses',()=>{
  const cells=[];for(let row=0;row<3;row++)for(let col=0;col<4;col++)cells.push([(col-1.5)*.24,-.55,-2.7+row*.43]);
  const box=(corners,{angle,scale,width,height})=>{
    const cx=corners.reduce((s,p)=>s+p[0],0)/corners.length,cy=corners.reduce((s,p)=>s+p[1],0)/corners.length;
    const c=Math.cos(angle),s=Math.sin(angle);
    return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{
      const x=u*width/2,y=v*height/2;
      return [cx+x*c-y*s,cy+x*s+y*c];
    });
  };
  let fitted=0;
  for(const angle of [-40,-15,0,22,45]){
    const a=viewMatrix([...([0,0,1].map(x=>x*Math.sin(angle*Math.PI/360))),Math.cos(angle*Math.PI/360)],identity);
    for(let row=0;row<3;row++)for(let col=0;col<4;col++){
      const x=(col-1.5)*.24,z=-2.7+row*.43,half=.105;
      const corners=[[x-half,-.55,z-.18],[x+half,-.55,z-.18],[x+half,-.55,z+.18],[x-half,-.55,z+.18]].map(p=>project(p,a));
      const layout=fitQuadText(corners,14,16,{pad:2,minScale:0.2});
      if(!layout)continue;
      fitted++;
      for(const point of box(corners,layout))assert(inside(point[0],point[1],corners),`label escaped at ${row},${col} roll ${angle}`);
    }
  }
  assert(fitted>40,'most cells should carry a fitted index');
});

test('labelled drawing is skipped when the target cannot hold the text',()=>{
  const calls=[];const ctx={save(){},restore(){},translate(){},rotate(){},fillText(t,x,y){calls.push([t,x,y]);},measureText:t=>({width:Array.from(t).length*12}),set font(v){calls.push(['font',v]);},set fillStyle(v){},set textAlign(v){},set textBaseline(v){}};
  assert(drawQuadLabel(ctx,rect(120,60),'01',{size:12}));
  assert.equal(calls.filter(c=>c[0]==='01').length,1);
  const before=calls.filter(c=>c[0]!=='font').length;
  assert.equal(drawQuadLabel(ctx,rect(6,60),'SPATIAL / 01',{size:12}),null);
  assert.equal(calls.filter(c=>c[0]!=='font').length,before);
});

test('quad labels measure FusionPixel and apply the fitted scale without rounding',()=>{
  const ctx={font:'4px sans-serif',save(){},restore(){this.font='4px sans-serif';},translate(){},rotate(){},
    measureText(){assert.equal(this.font,'12px FusionPixel'); assert.equal(this.textAlign,'center');return {width:96};},
    scale(x,y){this.scaling=[x,y];},fillText(){assert.equal(this.font,'12px FusionPixel');}};
  const layout=drawQuadLabel(ctx,rect(60,30),'SPATIAL / 01 0123',{pad:2});
  assert.equal(layout.width,56);
  assert.deepEqual(ctx.scaling,[layout.scale,layout.scale]);
  assert.equal(ctx.font,'4px sans-serif');
});

test('hit tolerance widens the settled target without moving its centre',()=>{
  const poly=rect(24,24,240,176);
  assert(inside(...inflate(poly,8)[0],poly)===false);
  assert(inside(240,176,poly));
  assert.equal(hitTest([{id:'a',polygon:poly}],240,188),null);
  assert.equal(hitTest([{id:'a',polygon:poly}],240,188,8)?.id,'a');
  assert.equal(hitTest([{id:'a',polygon:[[1,1],null,[3,3]]}],240,176,8),null);
});

function memoryStorage(files=new Map(),control={}){
  const handle=name=>({
    getFile:async()=>{
      const text=files.get(name);
      if(text===undefined){const error=new Error('NotFoundError');error.name='NotFoundError';throw error;}
      return {size:text.length,arrayBuffer:async()=>new TextEncoder().encode(text).buffer};
    },
    createWritable:async()=>{
      let buffer='';
      return {
        truncate:async()=>{buffer='';},
        write:async text=>{buffer=text;},
        close:async()=>{
          if(control.closeFailure){control.closeFailure=false;throw new Error('interrupted');}
          files.set(name,buffer);
        },
      };
    },
  });
  return {files,control,storage:{getDirectory:async()=>({getFileHandle:async(name,options={})=>{
    if(!options.create&&control.failRead===name){control.failRead=null;throw new Error('transient I/O failure');}
    if(!options.create&&!files.has(name)){const error=new Error('NotFoundError');error.name='NotFoundError';throw error;}
    return handle(name);
  }})}};
}
const payload=cells=>({cells,dwell:true});
const valid=value=>value&&Array.isArray(value.cells)?{cells:value.cells,dwell:value.dwell===true}:null;

test('save is acknowledged only after readback and survives one damaged slot',async()=>{
  const {files,storage}=memoryStorage();
  const store=createStore({storage,debounceMs:0,validate:valid});
  const first=await store.save(payload(['cell:0:0']));
  assert.equal(first.ok,true);assert.equal(first.generation,1);
  assert.equal(decodeSave(files.get('spatial-save-a.json')).data.cells[0],'cell:0:0');
  const second=await store.save(payload(['cell:1:2']));
  assert.equal(second.generation,2);
  assert.equal(decodeSave(files.get('spatial-save-b.json')).generation,2);
  // Damage the newest record: the loader must fall back to the older commit.
  files.set('spatial-save-b.json',files.get('spatial-save-b.json').replace('cell:1:2','cell:9:9'));
  const reopened=createStore({storage,validate:valid});
  const loaded=await reopened.load();
  assert.equal(loaded.ok,true);assert.equal(loaded.data.cells[0],'cell:0:0');assert.equal(loaded.recovered,true);assert.equal(loaded.generation,1);
});

test('an interrupted write leaves the previous commit loadable and reports failure',async()=>{
  const {files,storage,control}=memoryStorage();
  const store=createStore({storage,debounceMs:0,validate:valid});
  await store.save(payload(['cell:0:0']));
  control.closeFailure=true;
  const result=await store.save(payload(['cell:2:2']));
  assert.equal(result.ok,false);
  assert.equal(store.metrics.failures,1);
  const reopened=createStore({storage,validate:valid});
  assert.deepEqual((await reopened.load()).data,payload(['cell:0:0']));
});

test('rapid edits coalesce into one commit and flush resolves after it',async()=>{
  const {storage}=memoryStorage();
  const store=createStore({storage,debounceMs:40,validate:valid});
  store.save(payload(['cell:0:0']));
  store.save(payload(['cell:0:1']));
  const pending=store.save(payload(['cell:0:2']));
  await store.flush();
  assert.equal(store.metrics.commits,1);
  assert(store.metrics.coalesced>=1);
  assert.equal((await pending).ok,true);
  const reopened=await store.load();
  assert.equal(checksum(JSON.stringify(reopened.data)),checksum(JSON.stringify(payload(['cell:0:2']))));
});

test('an invalid payload is refused before any write',async()=>{
  const {storage}=memoryStorage();
  const store=createStore({storage,debounceMs:0,validate:value=>value&&Array.isArray(value.cells)?value:null});
  const result=await store.save({cells:'nope'});
  assert.equal(result.ok,false);assert.equal(store.metrics.writes,0);
});

test('missing OPFS degrades to an explicit failure instead of throwing',async()=>{
  const store=createStore({storage:undefined,debounceMs:0,validate:payload});
  const result=await store.load();
  assert.equal(result.ok,false);assert.match(result.error,/OPFS/);
});

test('an I/O error during restore preserves the original save and blocks writes',async()=>{
  const name='spatial-save-a.json', original=encodeSave(payload(['cell:0:0']),8);
  const {files,storage}=memoryStorage(new Map([[name,original]]),{failRead:name});
  const store=createStore({storage,debounceMs:0,validate:valid});
  assert.match((await store.load()).error,/transient I\/O/);
  assert.equal((await store.save(payload(['cell:2:2']))).ok,false);
  assert.equal((await store.flush()).ok,false);
  assert.deepEqual([...files],[[name,original]]);
  assert.equal((await createStore({storage,validate:valid}).load()).generation,8);
});

test('restore validates the payload before selecting a generation and preserves two invalid slots',async()=>{
  const a='spatial-save-a.json',b='spatial-save-b.json';
  const {files,storage}=memoryStorage(new Map([[a,encodeSave(payload(['cell:0:0']),8)],[b,encodeSave({cells:'broken'},9)]]));
  assert.deepEqual(await createStore({storage,validate:valid}).load(),{ok:true,data:payload(['cell:0:0']),generation:8,recovered:true});
  files.set(a,'corrupt');
  const before=[...files],store=createStore({storage,debounceMs:0,validate:valid});
  assert.match((await store.load()).error,/no intact/);
  assert.equal((await store.save(payload(['cell:2:2']))).ok,false);
  assert.deepEqual([...files],before);
});

test('ordinary OPFS NotFoundError starts a fresh journal without a recovery warning',async()=>{
  const storage={getDirectory:async()=>({getFileHandle:async()=>{
    throw new DOMException('The requested file does not exist.','NotFoundError');
  }})};
  assert.deepEqual(await createStore({storage}).load(),{ok:true,data:null,generation:0,recovered:false});
});

test('a long frame or stale pose breaks gaze continuity',()=>{
  const c=createInput();c.state.dwell=true;
  const step=(id,t)=>{c.sample(identity,t);return c.target(id,t);};
  step('a',0);step('a',200);step('a',400);
  assert(Math.abs(c.state.progress-400/850)<1e-9);
  // 500 ms without a pose reading: the dwell must restart, not complete.
  assert.equal(c.target('a',900),null);
  assert.equal(c.state.progress,0);assert.equal(c.state.candidate,null);
  step('a',1000);step('a',1100);step('a',1200);
  assert(Math.abs(c.state.progress-200/850)<1e-9);
});

test('a stall resets dwell progress but never rearms a target until a valid look-away',()=>{
  const c=createInput();c.state.dwell=true;
  const step=(id,t)=>{c.sample(identity,t);return c.target(id,t);};
  for(let t=1000;t<1900;t+=100)assert.equal(step('a',t),null);
  assert.equal(step('a',1900)?.id,'a');
  for(let t=2300;t<=3300;t+=100)assert.equal(step('a',t),null);
  step(null,3400);
  for(let t=3500;t<4400;t+=100)assert.equal(step('a',t),null);
  assert.equal(step('a',4400)?.id,'a');
});

test('edge tolerance holds focus without granting dwell time',()=>{
  const c=createInput();c.state.dwell=true;
  const step=(id,t,near=null)=>{c.sample(identity,t);return c.target(id,t,near);};
  for(let t=0;t<=400;t+=100)step('a',t);
  assert.equal(c.confirm(400)?.id,'a');
  const before=c.state.progress;
  assert.equal(step(null,450,'a'),null);
  assert.equal(c.state.candidate,'a');
  assert.equal(c.state.progress,before);
  assert.equal(c.confirm(450),null);
  // Beyond the grace window the candidate is cleared and the ring restarts.
  step(null,700,'a');
  assert.equal(c.state.candidate,null);assert.equal(c.state.progress,0);
  for(let t=800;t<=1700;t+=100)step('a',t);
  assert.equal(c.state.progress,1);
});

test('requirePainted withholds activation until a Canvas draw was submitted',()=>{
  const c=createInput({requirePainted:true});c.state.dwell=true;
  const step=(t)=>{c.sample(identity,t);return c.target('a',t);};
  for(let t=0;t<=900;t+=100)assert.equal(step(t),null);
  assert.equal(c.state.progress,1);
  c.painted();
  assert.equal(step(950).id,'a');
  // Activation is consumed once; a stall without painting cannot re-arm it.
  c.painted();
  assert.equal(step(1000),null);
});

test('menu still owns the frame: no gaze progress and no activation',()=>{
  const c=createInput();c.state.dwell=true;c.sample(identity,0);c.open();
  for(let t=0;t<=1200;t+=100){c.painted();assert.equal(c.target('a',t,'a'),null);}
  assert.equal(c.state.progress,0);
});

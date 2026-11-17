<script def>
{"navigationBarTitleText":"Spatial Scene","description":"A fixed-eye 3DoF reference scene with a horizontal pad and swipe-only menu."}
</script>
<script setup>
import wx from 'wx';
import {viewMatrix} from '../../lib/spatial.js';
import {createInput,createKeys} from '../../lib/input.js';
import {drawScene} from '../../lib/scene.js';
import {createStore} from '../../lib/store.js';
export default {
  data:{},
  onLoad(){
    this.input=createInput({requirePainted:true});this.enabled=new Set();this.message='';this.visible=false;this.dead=false;this.sensorEpoch=0;this.frame=null;this.sensor=null;this.settled=false;
    this.keys=createKeys(this.input,{onAction:a=>this.activate(a)});
    // Durable state is optional: without OPFS the scene still runs, unsaved.
    this.store=createStore({storage:typeof navigator!=='undefined'?navigator.storage:undefined,validate:value=>{
      if(!value||!Array.isArray(value.cells))return null;
      const cells=value.cells.filter(id=>typeof id==='string'&&/^cell:\d+:\d+$/.test(id)).slice(0,24);
      return {cells,dwell:value.dwell===true};
    }});
    this.ready=this.restore();
  },
  async restore(){
    let result={ok:false};
    try{result=await this.store.load();}catch(e){result={ok:false,error:String(e)};}
    if(this.dead)return result;
    if(result.ok&&result.data){this.enabled=new Set(result.data.cells);this.input.state.dwell=result.data.dwell===true;this.message=result.recovered?'已恢复上一份完整存档':'';}
    else this.message=result.ok?'':'存档不可用 · 本次不保存';
    // Nothing is presented before the load resolves, so a restored pad cannot
    // flash an empty state or be overwritten by the first frame.
    this.settled=true;this.startLoop();return result;
  },
  save(){if(!this.settled||!this.store)return Promise.resolve({ok:false});return this.store.save({cells:[...this.enabled],dwell:!!this.input.state.dwell});},
  drawLoading(){const ctx=this.ctx;if(!ctx)return;ctx.fillStyle='#000000';ctx.fillRect(0,0,480,352);ctx.font='12px FusionPixel';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#429b62';ctx.fillText('正在读取存档',240,176);ctx.flush?.();},
  onShow(){this.visible=true;this.startSensor();this.startLoop();},
  onReady(){this.ctx=wx.createCanvasContext('scene');if(!this.ctx){this.message='画布不可用';return;}this.startLoop();},
  onHide(){this.visible=false;this.release();},
  onUnload(){this.dead=true;this.visible=false;this.release();},
  startSensor(){
    if(this.sensor||this.dead)return;const epoch=++this.sensorEpoch;
    if(typeof AbsoluteOrientationSensor!=='function'){this.message='姿态不可用 · 长按可打开菜单';return;}
    try{
      const sensor=new AbsoluteOrientationSensor({frequency:60});this.sensor=sensor;
      this.reading=e=>{if(this.dead||!this.visible||epoch!==this.sensorEpoch)return;
        if(this.input.sample(e?.quaternion||sensor.quaternion,Date.now()))this.message='';};
      this.sensorError=()=>{if(epoch===this.sensorEpoch)this.message='姿态暂不可用';};
      sensor.addEventListener('reading',this.reading);sensor.addEventListener('error',this.sensorError);sensor.start();
    }catch(e){this.stopSensor();this.message='姿态启动失败';}
  },
  stopSensor(){this.sensorEpoch++;if(this.sensor){try{this.sensor.removeEventListener('reading',this.reading);this.sensor.removeEventListener('error',this.sensorError);this.sensor.stop();}catch(e){}}this.sensor=null;},
  startLoop(){
    if(this.frame!==null||!this.visible||!this.ctx||this.dead)return;
    if(!this.settled){this.drawLoading();return;}
    const tick=()=>{this.frame=null;if(!this.visible||this.dead)return;
      const now=Date.now(),s=this.input.state;
      if(!this.input.fresh(now)&&s.readingAt!==null)this.message='等待姿态恢复';
      const matrix=viewMatrix(s.q,s.anchor||s.q);
      const result=drawScene(this.ctx,this.input,this.enabled,matrix,this.message);
      // drawScene flushed the canvas: this frame counts as presented evidence.
      this.input.painted();
      this.activate(this.input.target(s.menu?null:result.hit?.id||null,now,result.near?.id||null));
      this.frame=setTimeout(tick,Math.max(1,33-(Date.now()-now)));
    };tick();
  },
  activate(action){if(!action)return;if(action.kind==='activate'){
    if(this.enabled.has(action.id))this.enabled.delete(action.id);else this.enabled.add(action.id);
    this.save();
  }else if(action.kind==='dwell'){this.save();}else if(action.kind==='stale')this.message='等待新鲜姿态后再回中';else if(action.kind==='recenter')this.message='视角已校准';},
  onKeyDown(e){if(this.visible&&!this.dead)this.keys.down(e);},
  onKeyUp(e){if(this.visible&&!this.dead)this.keys.up(e);},
  onVoiceWakeup(e){if(this.visible&&!this.dead)this.keys.wake(e);},
  release(){if(this.frame!==null)clearTimeout(this.frame);this.frame=null;this.keys?.dispose();this.stopSensor();this.input?.suspend();this.store?.flush();}
};
</script>
<page><view class="screen"><canvas id="scene" class="canvas" width="480" height="352"></canvas></view></page>
<style>
.screen { width:480px; height:352px; background-color:#000000; overflow:hidden; }
.canvas { width:480px; height:352px; }
</style>

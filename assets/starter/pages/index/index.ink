<script def>
{"navigationBarTitleText":"Spatial Scene","description":"A fixed-eye 3DoF reference scene with a horizontal pad and swipe-only menu."}
</script>
<script setup>
import wx from 'wx';
import {viewMatrix} from '../../lib/spatial.js';
import {createInput,createKeys} from '../../lib/input.js';
import {drawScene} from '../../lib/scene.js';
import {createStore} from '../../lib/store.js';
const nowMs=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now();
export default {
  data:{},
  onLoad(){
    this.input=createInput({requirePainted:true});this.enabled=new Set();this.message='';this.visible=false;this.dead=false;this.sensorEpoch=0;this.frame=null;this.sensor=null;this.settled=false;
    this.storageReady=false;this.storageMessage='';this.saveRevision=0;this.savedRevision=0;
    this.exiting=false;this.exitWithoutSave=false;
    this.keys=createKeys(this.input,{now:nowMs,onAction:a=>this.activate(a),onExit:e=>this.exit(e)});
    // Durable state is optional: without OPFS the scene still runs, unsaved.
    this.store=createStore({storage:typeof navigator!=='undefined'?navigator.storage:undefined,validate:value=>{
      if(!value||!Array.isArray(value.cells)||typeof value.dwell!=='boolean')return null;
      const cells=value.cells;
      if(cells.some(id=>typeof id!=='string'||!/^cell:[0-2]:[0-3]$/.test(id)))return null;
      return {cells:[...new Set(cells)],dwell:value.dwell};
    }});
    this.ready=this.restore();
  },
  async restore(){
    let result={ok:false};
    try{result=await this.store.load();}catch(e){result={ok:false,error:String(e)};}
    if(this.dead)return result;
    this.storageReady=result.ok;
    if(result.ok&&result.data){this.enabled=new Set(result.data.cells);this.input.state.dwell=result.data.dwell;}
    this.storageMessage=result.ok?(result.recovered?'已恢复上一份完整存档':''):'存档不可用 · 本次不保存';
    // Show only the loading frame and keep edits disabled until restore settles.
    this.settled=true;this.startLoop();return result;
  },
  save(){
    if(!this.settled||!this.storageReady)return;
    const revision=++this.saveRevision;
    return this.store.save({cells:[...this.enabled],dwell:this.input.state.dwell}).then(result=>{
      if(result.ok){
        this.savedRevision=Math.max(this.savedRevision,revision);
        if(!this.dead&&this.savedRevision===this.saveRevision)this.storageMessage='';
      }else this.showSaveFailure(result);
      return result;
    });
  },
  showSaveFailure(result){
    if(this.dead){console.warn('Save could not be verified on exit: '+result.error);return;}
    this.storageMessage='存档未写入 · 请重试';
  },
  async flushSave(){
    if(!this.storageReady)return {ok:false};
    const result=await this.store.flush();
    if(!result.ok)this.showSaveFailure(result);
    return result;
  },
  async exit(event){
    if(this.exiting){event.preventDefault?.();return;}
    if(!this.storageReady||this.savedRevision===this.saveRevision||this.exitWithoutSave)return;
    if(typeof window==='undefined'||typeof window.close!=='function')return;
    event.preventDefault?.();
    this.exiting=true;
    try {
      let result=await this.flushSave();
      if((!result.ok||this.savedRevision!==this.saveRevision)&&this.visible&&!this.dead){this.save();result=await this.flushSave();}
      if(!this.visible||this.dead)return;
      if(result.ok&&this.savedRevision===this.saveRevision)window.close();
      else {
        this.storageMessage='存档未写入 · 再按返回退出';
        this.exitWithoutSave=true;
      }
    } catch(error){
      if(!this.dead)this.message='暂无法退出 · 请重试';
      console.warn('Close request failed: '+error);
    } finally {this.exiting=false;}
  },
  drawLoading(){const ctx=this.ctx;if(!ctx)return;ctx.fillStyle='#000000';ctx.fillRect(0,0,480,352);ctx.font='12px FusionPixel';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#429b62';ctx.fillText('正在读取存档',240,176);ctx.flush?.();},
  onShow(){this.visible=true;this.startSensor();this.startLoop();},
  onReady(){this.ctx=wx.createCanvasContext('scene');if(!this.ctx){this.message='画布不可用';return;}this.startLoop();},
  onHide(){this.visible=false;return this.release();},
  onUnload(){this.dead=true;this.visible=false;return this.release();},
  startSensor(){
    if(this.sensor||this.dead)return;const epoch=++this.sensorEpoch;
    if(typeof AbsoluteOrientationSensor!=='function'){this.message='姿态不可用 · 长按可打开菜单';return;}
    try{
      const sensor=new AbsoluteOrientationSensor({frequency:60});this.sensor=sensor;
      this.reading=e=>{if(this.dead||!this.visible||epoch!==this.sensorEpoch)return;
        if(this.input.sample(e?.quaternion||sensor.quaternion,nowMs()))this.message='';};
      this.sensorError=()=>{if(epoch===this.sensorEpoch)this.message='姿态暂不可用';};
      sensor.addEventListener('reading',this.reading);sensor.addEventListener('error',this.sensorError);sensor.start();
    }catch(e){this.stopSensor();this.message='姿态启动失败';}
  },
  stopSensor(){this.sensorEpoch++;if(this.sensor){try{this.sensor.removeEventListener('reading',this.reading);this.sensor.removeEventListener('error',this.sensorError);this.sensor.stop();}catch(e){}}this.sensor=null;},
  startLoop(){
    if(this.frame!==null||!this.visible||!this.ctx||this.dead)return;
    if(!this.settled){this.drawLoading();return;}
    const tick=()=>{this.frame=null;if(!this.visible||this.dead)return;
      const now=nowMs(),s=this.input.state;
      if(!this.input.fresh(now)&&s.readingAt!==null)this.message='等待姿态恢复';
      const matrix=viewMatrix(s.q,s.anchor||s.q);
      const result=drawScene(this.ctx,this.input,this.enabled,matrix,this.storageMessage||this.message);
      // Submission is observable here. The display presentation time is separate.
      if(result.submitted)this.input.painted();
      const hit=this.exiting?null:result.hit?.id||null;
      this.activate(this.input.target(hit,now,result.near?.id||null));
      this.frame=setTimeout(tick,Math.max(1,33-(nowMs()-now)));
    };tick();
  },
  activate(action){if(!action||!this.settled||this.exiting)return;
    if(action.kind==='activate'){
      if(this.enabled.has(action.id))this.enabled.delete(action.id);else this.enabled.add(action.id);
    }
    if(action.kind==='activate'||action.kind==='dwell'){this.exitWithoutSave=false;this.save();}
    else if(action.kind==='stale')this.message='等待新鲜姿态后再回中';else if(action.kind==='recenter')this.message='视角已校准';
  },
  acceptsInput(){return this.visible&&!this.dead&&this.settled&&!this.exiting;},
  onKeyDown(e){if(this.acceptsInput())this.keys.down(e);},
  onKeyUp(e){
    if(this.acceptsInput())this.keys.up(e);
    else if(this.visible&&!this.dead&&(['Enter','ArrowUp','ArrowDown'].includes(e.code)||this.exiting&&e.code==='Backspace'))e.preventDefault?.();
  },
  onVoiceWakeup(e){if(this.acceptsInput())this.keys.wake(e);},
  release(){if(this.frame!==null)clearTimeout(this.frame);this.frame=null;this.keys?.dispose();this.stopSensor();this.input?.suspend();return this.flushSave();}
};
</script>
<page><view class="screen"><canvas id="scene" class="canvas" width="480" height="352"></canvas></view></page>
<style>
.screen { width:480px; height:352px; background-color:#000000; overflow:hidden; }
.canvas { width:480px; height:352px; }
</style>

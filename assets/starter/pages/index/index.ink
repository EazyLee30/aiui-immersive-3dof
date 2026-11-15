<script def>
{"navigationBarTitleText":"Spatial Scene","description":"A fixed-eye 3DoF reference scene with a horizontal pad and swipe-only menu."}
</script>
<script setup>
import wx from 'wx';
import {viewMatrix} from '../../lib/spatial.js';
import {createInput,createKeys} from '../../lib/input.js';
import {drawScene} from '../../lib/scene.js';
export default {
  data:{},
  onLoad(){
    this.input=createInput();this.enabled=new Set();this.message='';this.visible=false;this.dead=false;this.sensorEpoch=0;this.frame=null;this.sensor=null;
    this.keys=createKeys(this.input,{onAction:a=>this.activate(a)});
  },
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
    const tick=()=>{this.frame=null;if(!this.visible||this.dead)return;
      const now=Date.now(),s=this.input.state;
      if(!this.input.fresh(now)&&s.readingAt!==null)this.message='等待姿态恢复';
      const matrix=viewMatrix(s.q,s.anchor||s.q);
      const result=drawScene(this.ctx,this.input,this.enabled,matrix,this.message);
      this.activate(this.input.target(s.menu?null:result.hit?.id||null,now));
      this.frame=setTimeout(tick,Math.max(1,33-(Date.now()-now)));
    };tick();
  },
  activate(action){if(!action)return;if(action.kind==='activate'){
    if(this.enabled.has(action.id))this.enabled.delete(action.id);else this.enabled.add(action.id);
  }else if(action.kind==='stale')this.message='等待新鲜姿态后再回中';else if(action.kind==='recenter')this.message='视角已校准';},
  onKeyDown(e){if(this.visible&&!this.dead)this.keys.down(e);},
  onKeyUp(e){if(this.visible&&!this.dead)this.keys.up(e);},
  onVoiceWakeup(e){if(this.visible&&!this.dead)this.keys.wake(e);},
  release(){if(this.frame!==null)clearTimeout(this.frame);this.frame=null;this.keys?.dispose();this.stopSensor();this.input?.suspend();}
};
</script>
<page><view class="screen"><canvas id="scene" class="canvas" width="480" height="352"></canvas></view></page>
<style>
.screen { width:480px; height:352px; background-color:#000000; overflow:hidden; }
.canvas { width:480px; height:352px; }
</style>

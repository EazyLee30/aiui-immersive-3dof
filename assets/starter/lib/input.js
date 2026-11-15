import {normalizeQuaternion} from './spatial.js';

export function createInput({freshMs=400,focusMs=100,dwellMs=850,visibleRows=3}={}) {
  const s={q:[0,0,0,1],anchor:null,readingAt:null,menu:false,menuIndex:0,menuTop:0,
    candidate:null,focus:null,since:0,latched:null,progress:0,dwell:false};
  const items=()=>['continue','recenter','dwell'];
  const fresh=now=>s.readingAt!==null && now>=s.readingAt && now-s.readingAt<freshMs;
  function reset(){s.candidate=null;s.focus=null;s.latched=null;s.progress=0;}
  function close(){s.menu=false;reset();}
  return {
    state:s,items,fresh,
    sample(q,now){const value=normalizeQuaternion(q);if(!value||!Number.isFinite(now))return false;s.q=value;s.readingAt=now;if(!s.anchor)s.anchor=value.slice();return true;},
    open(){s.menu=true;s.menuIndex=0;s.menuTop=0;reset();},
    close,
    swipe(direction){if(!s.menu)return false;s.menuIndex=(s.menuIndex+Math.sign(direction)+items().length)%items().length;s.menuTop=Math.max(0,Math.min(items().length-visibleRows,s.menuIndex-1));reset();return true;},
    recenter(now){if(!fresh(now))return false;s.anchor=s.q.slice();close();return true;},
    target(id,now){
      if(s.menu||!fresh(now)){reset();return null;}
      if(id!==s.candidate){s.candidate=id;s.since=now;s.focus=null;s.progress=0;if(id!==s.latched)s.latched=null;}
      if(!id){s.focus=null;return null;}
      if(now-s.since>=focusMs)s.focus=id;
      s.progress=Math.min(1,(now-s.since)/dwellMs);
      if(s.dwell&&s.progress>=1&&s.latched!==id){s.latched=id;return{kind:'activate',id};}
      return null;
    },
    confirm(now){
      if(s.menu){const item=items()[s.menuIndex];
        if(item==='continue'){close();return{kind:'continue'};}
        if(item==='recenter')return{kind:this.recenter(now)?'recenter':'stale'};
        s.dwell=!s.dwell;reset();return{kind:'dwell'};
      }
      return fresh(now)&&s.focus?{kind:'activate',id:s.focus}:null;
    },
    back(){if(!s.menu)return false;close();return true;},
    suspend(){s.readingAt=null;close();}
  };
}

// Host mapping is intentionally separate. Verify it on each target device.
export function createKeys(input,{now=()=>Date.now(),setTimer=setTimeout,clearTimer=clearTimeout,onAction=()=>{},holdMs=650,suppressMs=450}={}) {
  let timer=null,down=false,longHold=false,suppressUntil=0,lastCode='',lastAt=-Infinity;
  function cancel(){if(timer!==null)clearTimer(timer);timer=null;down=false;}
  function stop(event){event.preventDefault?.();}
  function duplicate(code,t){if(lastCode===code&&t-lastAt<140)return true;lastCode=code;lastAt=t;return false;}
  return {
    down(event){if(['Enter','ArrowUp','ArrowDown'].includes(event.code))stop(event);
      if(event.code!=='Enter'||down||event.repeat)return;
      down=true;longHold=false;timer=setTimer(()=>{timer=null;longHold=true;input.open();},holdMs);
    },
    up(event){const code=event.code,t=now();
      if(code==='Backspace'){
        cancel();longHold=false;suppressUntil=t+320;
        // A duplicate back after closing the menu must not leak into host exit.
        if(lastCode==='handled-back'&&t-lastAt<320){stop(event);return;}
        if(input.back()){stop(event);lastCode='handled-back';lastAt=t;}return;
      }
      if(!['Enter','ArrowUp','ArrowDown'].includes(code))return;
      stop(event);if(event.repeat)return;
      if(code==='Enter'){
        cancel();if(longHold){longHold=false;suppressUntil=Math.max(suppressUntil,t+320);lastCode=code;lastAt=t;return;}if(t<suppressUntil||duplicate(code,t))return;
        onAction(input.confirm(t));
      }else if(!duplicate(code,t))input.swipe(code==='ArrowDown'?1:-1);
    },
    wake(event){stop(event);cancel();longHold=true;suppressUntil=now()+suppressMs;input.open();},
    dispose(){cancel();longHold=false;suppressUntil=0;lastCode='';lastAt=-Infinity;}
  };
}

import {PROFILE,project,hitTest,tableCells} from './spatial.js';
import {drawQuadLabel} from './text.js';
const GREEN='#9aefae',cells=tableCells();
function path(ctx,poly){ctx.beginPath();poly.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();}
function text(ctx,str,x,y,color=GREEN){ctx.font='12px FusionPixel';ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle=color;ctx.fillText(str,x,y);}
export function drawScene(ctx,input,enabled,matrix,message=''){
  const s=input.state;ctx.fillStyle='#000000';ctx.fillRect(0,0,PROFILE.width,PROFILE.height);
  const portal=[[-.68,-.28,-3.4],[.68,-.28,-3.4],[.68,.62,-3.4],[-.68,.62,-3.4]].map(p=>project(p,matrix));
  if(portal.every(Boolean)){path(ctx,portal);ctx.fillStyle='#07140c';ctx.fill();ctx.strokeStyle='#456f50';ctx.stroke();}
  const center=project([0,.12,-3.4],matrix);
  if(center){ctx.strokeStyle=GREEN;ctx.beginPath();ctx.arc(center[0],center[1],24,0,Math.PI*2);ctx.stroke();}
  // A world-anchored caption: rotated into the panel and scaled to fit it, so a
  // rolled or edge-on portal cannot push the text outside its own quad.
  if(portal.every(Boolean))drawQuadLabel(ctx,[portal[2],portal[3],portal[0],portal[1]],'SPATIAL / 01',{size:12,pad:10,color:GREEN});
  const targets=[];
  for(const cell of cells){const polygon=cell.vertices.map(p=>project(p,matrix));if(polygon.some(p=>!p))continue;
    const index=cell.row*4+cell.col+1,focused=s.focus===cell.id;
    path(ctx,polygon);ctx.fillStyle=enabled.has(cell.id)?'#518b61':'#102b19';ctx.fill();ctx.strokeStyle=focused?GREEN:'#376744';ctx.stroke();
    drawQuadLabel(ctx,polygon,String(index).padStart(2,'0'),{size:12,pad:5,color:focused?'#d8ffe2':'#78c98c'});
    targets.push({...cell,polygon});
  }
  text(ctx,'转头选择 · 单击确认',12,18);text(ctx,message||'低头看桌面 · 长按菜单',12,334,'#78ad87');
  if(s.menu){
    ctx.fillStyle='#07110b';ctx.fillRect(60,62,360,228);ctx.strokeStyle='#598269';ctx.strokeRect(60,62,360,228);
    text(ctx,'SPATIAL / MENU',80,86);
    const labels=['继续','回中 · 校准当前视角','凝视触发 '+(s.dwell?'开':'关')];
    labels.forEach((label,i)=>{const y=126+i*44;if(i===s.menuIndex){ctx.fillStyle='#214a2d';ctx.fillRect(76,y-16,328,32);}text(ctx,label,90,y);});
    text(ctx,'滑动选择 · 单击确认 · 双击返回',80,266);
    ctx.flush?.();return{targets:[],hit:null,near:null};
  }
  ctx.strokeStyle=GREEN;ctx.beginPath();ctx.arc(240,176,s.focus?5:2,0,Math.PI*2);ctx.stroke();
  if(s.dwell&&s.focus){ctx.beginPath();ctx.arc(240,176,9,-Math.PI/2,-Math.PI/2+2*Math.PI*s.progress);ctx.stroke();}
  ctx.flush?.();
  const hit=hitTest(targets);
  // The same targets widened by a few pixels: the gaze state machine may hold
  // the previous focus through a brief edge wobble, but time there never counts.
  return{targets,hit,near:hitTest(targets,PROFILE.width/2,PROFILE.height/2,8)};
}

// Reference convention: +X right, +Y up, -Z forward. Matrices are row-major.
export const PROFILE = {width:480,height:352,focal:1000,near:0.025};
export function normalizeQuaternion(value) {
  if (!value || value.length !== 4) return null;
  const q=Array.from(value,Number);
  if (!q.every(Number.isFinite)) return null;
  const n=Math.hypot(...q);
  return n>1e-9 ? q.map(v=>v/n) : null;
}
export function rotation(value) {
  const q=normalizeQuaternion(value);
  if (!q) throw new Error('A finite non-zero quaternion is required.');
  const [x,y,z,w]=q;
  return [1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),
    2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),
    2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)];
}
export function viewMatrix(current,anchor) {
  const r=rotation(current),m=rotation(anchor),a=[];
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)
    a[i*3+j]=r[i]*m[j]+r[3+i]*m[3+j]+r[6+i]*m[6+j];
  return a;
}
export function transform(p,a) {
  return [a[0]*p[0]+a[1]*p[1]+a[2]*p[2],a[3]*p[0]+a[4]*p[1]+a[5]*p[2],a[6]*p[0]+a[7]*p[1]+a[8]*p[2]];
}
export function project(p,a,profile=PROFILE) {
  const [x,y,z]=transform(p,a);
  if (!Number.isFinite(x+y+z) || z>=-profile.near) return null;
  return [profile.width/2+profile.focal*x/-z,profile.height/2-profile.focal*y/-z,-z];
}
export function inside(x,y,polygon) {
  if (!polygon || polygon.length<3 || polygon.some(p=>!p)) return false;
  let hit=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
}
export function hitTest(targets,x=PROFILE.width/2,y=PROFILE.height/2) {
  for(let i=targets.length-1;i>=0;i--)if(inside(x,y,targets[i].polygon))return targets[i];
  return null;
}
export function tableCells() {
  const cells=[];
  for(let row=0;row<3;row++)for(let col=0;col<4;col++){
    const x=(col-1.5)*.24,z=-2.7+row*.43,half=.105;
    cells.push({id:`cell:${row}:${col}`,row,col,center:[x,-.55,z],
      vertices:[[x-half,-.55,z-.18],[x+half,-.55,z-.18],[x+half,-.55,z+.18],[x-half,-.55,z+.18]]});
  }
  return cells;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectMedia} from '../scripts/inspect_media.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(command,args)=>spawnSync(command,args,{encoding:'utf8',cwd:root});

test('initializer escapes names, carries font license, and refuses overwrite',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'aiui-init-'));
  try{
    const dest=path.join(tmp,'scene'),name='場景 "One"';
    const first=run('python3',['scripts/init_project.py',dest,'--name',name]);assert.equal(first.status,0,first.stderr);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dest,'agent.json'))).agentName,name);
    assert.equal(JSON.parse(JSON.stringify(JSON.parse(fs.readFileSync(path.join(dest,'app.json'))))).window.navigationBarTitleText,name);
    const page=fs.readFileSync(path.join(dest,'pages/index/index.ink'),'utf8');assert.equal(JSON.parse(page.match(/<script def>([\s\S]*?)<\/script>/)[1]).navigationBarTitleText,name);
    assert(fs.existsSync(path.join(dest,'assets/fonts/FusionPixel-OFL.txt')));
    const before=fs.readFileSync(path.join(dest,'agent.json'),'utf8');assert.notEqual(run('python3',['scripts/init_project.py',dest]).status,0);assert.equal(fs.readFileSync(path.join(dest,'agent.json'),'utf8'),before);
    const traditional=path.join(tmp,'traditional');assert.equal(run('python3',['scripts/init_project.py',traditional,'--font-locale','zh-TW']).status,0);
    assert(fs.readFileSync(path.join(traditional,'assets/fonts/FusionPixel12.otf')).equals(fs.readFileSync(path.join(root,'assets/fonts/FusionPixel12Traditional.otf'))));
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('manifest is reproducible, excludes identity/cache folders and refuses symlinks',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'aiui-manifest-'));
  try{
    fs.writeFileSync(path.join(tmp,'app.json'),'{}');fs.mkdirSync(path.join(tmp,'.aix'));fs.writeFileSync(path.join(tmp,'.aix','identity'),'not-for-export');
    const output=path.join(tmp,'manifest.json'),args=['scripts/asset_manifest.py',tmp,'--output',output];
    assert.equal(run('python3',args).status,0);const one=fs.readFileSync(output,'utf8');assert.equal(JSON.parse(one).count,1);
    assert.equal(run('python3',args).status,0);assert.equal(fs.readFileSync(output,'utf8'),one);
    fs.symlinkSync(path.join(tmp,'app.json'),path.join(tmp,'link'));assert.notEqual(run('python3',args).status,0);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
const mediaAvailable=run('ffmpeg',['-version']).status===0&&run('ffprobe',['-version']).status===0;
test('media inspection distinguishes sound, absent audio and a silent audio stream',{skip:!mediaAvailable},()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'aiui-media-'));
  try{
    const image=['-f','lavfi','-i','color=c=black:s=160x120:r=30:d=1'];
    const sound=path.join(tmp,'sound.mp4'),none=path.join(tmp,'none.mp4'),silent=path.join(tmp,'silent.mp4');
    for(const [out,audio] of [[sound,'sine=frequency=440:sample_rate=48000:duration=1'],[silent,'anullsrc=r=48000:cl=stereo']]){
      const p=run('ffmpeg',['-hide_banner','-loglevel','error','-y',...image,'-f','lavfi','-i',audio,'-t','1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',out]);assert.equal(p.status,0,p.stderr);
    }
    assert.equal(run('ffmpeg',['-hide_banner','-loglevel','error','-y',...image,'-an','-c:v','libx264','-pix_fmt','yuv420p',none]).status,0);
    assert(inspectMedia(sound,{requireAudio:true}).passed);
    assert(inspectMedia(none,{requireAudio:true}).errors.includes('No audio stream.'));
    assert(inspectMedia(silent,{requireAudio:true}).errors.includes('Audio is silent.'));
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

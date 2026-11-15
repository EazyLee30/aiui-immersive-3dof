#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

function run(command,args){
  const p=spawnSync(command,args,{encoding:'utf8',maxBuffer:8*1024*1024});
  if(p.error||p.status!==0)throw new Error(`${command}: ${p.error?.message||p.stderr}`);
  return p;
}
export function inspectMedia(filename,{requireAudio=false}={}){
  const file=path.resolve(filename);
  const probe=JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]).stdout);
  const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
  const errors=[],warnings=[];
  if(!video)errors.push('No video stream.');
  if(requireAudio&&!audio)errors.push('No audio stream.');
  let peakDb=null,rmsDb=null;
  if(audio){
    const stats=run('ffmpeg',['-hide_banner','-i',file,'-map','0:a:0','-af','astats=metadata=1:reset=0','-f','null','-']).stderr;
    const peaks=[...stats.matchAll(/Peak level dB:\s+(-?inf|-?[\d.]+)/g)].map(m=>Number(m[1]==='-inf'?-Infinity:m[1]));
    const levels=[...stats.matchAll(/RMS level dB:\s+(-?inf|-?[\d.]+)/g)].map(m=>Number(m[1]==='-inf'?-Infinity:m[1]));
    if(!peaks.length)errors.push('Could not measure decoded audio.');
    else{peakDb=Math.max(...peaks);if(!Number.isFinite(peakDb))errors.push('Audio is silent.');else if(peakDb>=0)errors.push('Decoded audio has no peak headroom.');}
    if(levels.length)rmsDb=Math.max(...levels);
  }
  const videoDuration=video&&Number(video.duration),audioDuration=audio&&Number(audio.duration);
  const durationDelta=Number.isFinite(videoDuration)&&Number.isFinite(audioDuration)?Math.abs(videoDuration-audioDuration):null;
  if(durationDelta!==null&&durationDelta>.1)errors.push('Audio/video durations differ by more than 100 ms.');
  if(audio&&durationDelta===null)warnings.push('Stream duration unavailable; inspect synchronization manually.');
  if(video&&video.pix_fmt!=='yuv420p')warnings.push('Pixel format differs from the portable yuv420p profile.');
  return {file,bytes:fs.statSync(file).size,passed:errors.length===0,errors,warnings,
    video:video?{codec:video.codec_name,width:video.width,height:video.height,fps:video.avg_frame_rate,duration:videoDuration,pixelFormat:video.pix_fmt}:null,
    audio:audio?{codec:audio.codec_name,sampleRate:audio.sample_rate,channels:audio.channels,duration:audioDuration,peakDb,rmsDb}:null,
    durationDelta,notice:'Stream and level checks do not prove perceptual synchronization or physical device capture.'};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2),file=args.find(a=>!a.startsWith('--'));
  if(!file){console.error('Usage: node scripts/inspect_media.mjs demo.mp4 [--require-audio]');process.exitCode=2;}
  else{try{const result=inspectMedia(file,{requireAudio:args.includes('--require-audio')});console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=1;}}
}

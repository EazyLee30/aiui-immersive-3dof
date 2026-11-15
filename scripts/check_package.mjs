#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ignore=new Set(['.git','node_modules','output','tmp','__pycache__']);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>ignore.has(e.name)?[]:e.isSymbolicLink()?(()=>{throw new Error('Unexpected symlink: '+e.name);})():e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(root),failures=[];
const skill=fs.readFileSync(path.join(root,'SKILL.md'),'utf8');
if(!/^---\nname: aiui-immersive-3dof\ndescription: .+\n---/m.test(skill))failures.push('Invalid skill frontmatter.');
for(const file of files){
  if(!/\.(md|mjs|js|json|yaml|yml|py|ink|svg)$/.test(file))continue;
  const content=fs.readFileSync(file,'utf8'),name=path.relative(root,file);
  if(/\/(?:Users|var\/folders)\//.test(content))failures.push(name+': machine-specific absolute path');
  if(/(?:gh[opusr]_[A-Za-z0-9]{20,}|sk-proj-[A-Za-z0-9]{20,}|BEGIN [A-Z ]*PRIVATE KEY)/.test(content))failures.push(name+': possible credential');
  if(file.endsWith('.json'))try{JSON.parse(content);}catch{failures.push(name+': invalid JSON');}
  if(file.endsWith('.md'))for(const match of content.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)){
    const link=match[1].split('#')[0];if(!link||/^[a-z]+:|^\//i.test(link))continue;
    if(!fs.existsSync(path.resolve(path.dirname(file),decodeURIComponent(link))))failures.push(name+': broken local link '+link);
  }
}
for(const required of ['README.md','README.zh-CN.md','README.zh-TW.md','agents/openai.yaml','docs/assets/banner.png','assets/starter/assets/fonts/FusionPixel-OFL.txt'])if(!fs.existsSync(path.join(root,required)))failures.push('Missing '+required);
console.log(JSON.stringify({passed:failures.length===0,files:files.length,failures},null,2));
if(failures.length)process.exitCode=1;

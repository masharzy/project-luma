#!/usr/bin/env node
/* Resume source-page download using the independently recorded exact hashes.
 * Run: node scripts/imports/fetch-reading-sources.cjs [output-directory]
 * No DB writes; refuses source changes and blocked pages.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const entries=require('../../data/imports/engnovate-reading/source-manifest.json');
const dir=process.argv[2]||'/tmp/luma-engnovate-reading';
fs.mkdirSync(dir,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 let verified=0,failed=[];
 for(const row of entries){
  const filename=path.join(dir,String(row.book).padStart(2,'0')+'-'+row.test+'.html');
  const check=data=>crypto.createHash('sha256').update(data).digest('hex')===row.sourceHash;
  if(fs.existsSync(filename)&&check(fs.readFileSync(filename))){verified++;continue;}
  try{
   if(new URL(row.url).hostname!=='engnovate.com')throw Error('Unexpected host');
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
   let response;
   try{response=await fetch(row.url,{signal:controller.signal,headers:{'User-Agent':'Mozilla/5.0 (compatible; CambridgeImporter/1.0)'}});}finally{clearTimeout(timer)}
   if(!response.ok)throw Error('HTTP '+response.status);
   const bytes=Buffer.from(await response.arrayBuffer());
   if(!check(bytes))throw Error('Source SHA256 differs from handoff: requires review');
   fs.writeFileSync(filename,bytes);verified++;
  }catch(e){failed.push({book:row.book,test:row.test,reason:e.message});}
  await sleep(350);
 }
 console.log(JSON.stringify({verified,total:entries.length,failed},null,2));
 if(failed.length)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1});

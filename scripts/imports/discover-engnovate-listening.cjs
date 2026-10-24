#!/usr/bin/env node
/**
 * Engnovate Cambridge Academic Listening source discovery.
 * Usage: node scripts/imports/discover-engnovate-listening.cjs
 * Writes data/imports/engnovate-listening-manifest.json
 * Never writes to the database or publishes question content.
 */
const fs=require('node:fs');
const path=require('node:path');
const base='https://engnovate.com';
const output=path.join(process.cwd(),'data/imports/engnovate-listening-manifest.json');
const agents={'user-agent':'Luma Cambridge importer/1.0 (source identification)'};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function load(url){
 let err;
 for(let i=0;i<3;i++){
  try{
   const controller=new AbortController();
   const tm=setTimeout(()=>controller.abort(),25000);
   try{
    const response=await fetch(url,{headers:agents,signal:controller.signal,redirect:'follow'});
    if(!response.ok)throw Error('HTTP '+response.status+' for '+url);
    return await response.text();
   }finally{clearTimeout(tm)}
  }catch(e){err=e;await delay(500*(i+1))}
 }
 throw err;
}
async function main(){
 const collected=new Map(),problems=[];
 // Enumerate all seven category archive pages instead of presuming every slug exists.
 for(let page=1;page<=12;page++){
  const url=base+'/ielts-listening-test-category/cambridge-academic/'+(page===1?'':'page/'+page+'/');
  let html;
  try{html=await load(url)}catch(e){if(page===1)throw e;break}
  const found=[...html.matchAll(/href=["']([^"']*\/ielts-listening-tests\/cambridge-ielts-(\d{1,2})-academic-listening-test-(\d)\/?(?:\?[^"']*)?)["']/gi)];
  let newly=0;
  for(const match of found){
   const book=Number(match[2]),test=Number(match[3]);
   if(book<1||book>21||test<1||test>4)continue;
   const key=book+':'+test;
   const link=new URL(match[1].replace(/&amp;/g,'&'),base);link.search='';
   if(!collected.has(key)){newly++;collected.set(key,{book,test,module:'listening',url:link.toString(),source:'engnovate',status:'discovered_unreviewed'})}
   else if(collected.get(key).url!==link.toString())problems.push({identity:key,type:'ambiguous_url',url:link.toString()});
  }
  process.stderr.write('Archive page '+page+': '+newly+' new tests\n');
  if(page>1&&newly===0)break;
  await delay(400);
 }
 const result=[...collected.values()].sort((a,b)=>a.book-b.book||a.test-b.test);
 const missing=[];
 for(let b=1;b<=21;b++)for(let t=1;t<=4;t++)if(!collected.has(b+':'+t))missing.push({book:b,test:t});
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,JSON.stringify({source:'Engnovate Cambridge Academic Listening archive',generatedAt:new Date().toISOString(),expected:84,found:result.length,missing,problems,tests:result},null,2)+'\n');
 console.log(JSON.stringify({expected:84,found:result.length,missing,problems,manifest:output}));
 if(missing.length||problems.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});

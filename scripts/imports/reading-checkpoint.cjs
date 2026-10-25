/* Saved public Reading answer-key checkpoint validation, read-only. */
const fs = require('node:fs');
const path = require('node:path');
function getCheckpoint(b,t,filename=path.join(__dirname,'../../data/imports/engnovate-reading/answer-key-checkpoint.json')){
  const rows=JSON.parse(fs.readFileSync(filename,'utf8'));
  const answers={},ownership=new Map(),issues=[];
  for(let part=1;part<=3;part++){
    const matches=rows.filter(x=>x.book===b&&x.test===t&&x.part===part);
    if(matches.length!==1){issues.push('Part '+part+': expected one key page, found '+matches.length);continue;}
    const x=matches[0];
    if(x.identityVerified!==true||x.status!=='retrieved'||!['public_html','public_web'].includes(x.retrieval)){
      issues.push('Part '+part+': identity or provenance not verified');continue;
    }
    for(const [number,value] of Object.entries(x.answers||{})){
      const n=Number(number);
      if(!Number.isInteger(n)||n<1||n>45||typeof value!=='string'||!value.trim()){
        issues.push('Part '+part+': invalid answer number or value '+number);continue;
      }
      if(ownership.has(n)){issues.push('Duplicate key '+n+' in Parts '+ownership.get(n)+' and '+part);continue;}
      ownership.set(n,part);answers[n]=value.trim();
    }
  }
  return {answers,ownership,issues};
}
module.exports={getCheckpoint};

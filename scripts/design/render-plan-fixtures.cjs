// Test-only renderings. Output remains outside public/ and is never part of the app build.
const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const cache=new Map();
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 const module={exports:{}};cache.set(file,module);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:n=>{
  if(!n.startsWith('@/'))return require(n);
  const base=path.resolve('src',n.slice(2));return load(fs.existsSync(base+'.tsx')?base+'.tsx':base+'.ts');
 }});return module.exports;
}
const {PlansPage}=load('src/components/plans-page.tsx');
const {presentPlans}=load('src/lib/plan-presentation.ts');
const out=process.argv[2];if(!out)throw Error('Provide an output directory');fs.mkdirSync(out,{recursive:true});
const style=['home-fonts','home-reference','plans-reference'].map(n=>fs.readFileSync(`src/styles/${n}.css`,'utf8').replaceAll('url(/','url(https://jumptonine.com/')).join('\n');
const header=fs.readFileSync('design-reference/plans.html','utf8').match(/<header[\s\S]*?<\/header>/)[0];
const footer=load('src/lib/home-prototype.ts').footerMarkup.replace('__YEAR__',new Date().getFullYear());
for(let n=0;n<=7;n++){
 const records=Array.from({length:n},(_,i)=>({id:'test-'+i,name:i===6?'A much longer plan name for wrapping':'QA Plan '+(i+1),description:i===5?'':'Real data shape, test fixture only.',price_bdt:1199*(i+1),writing_limit:i===0?0:(i+1)*10,speaking_limit:(i+1)*4,published:true,recommended:i===1,period:'month',features:['Task 1 and Task 2 Writing evaluation','Estimated band with criteria','Past feedback saved in your account']}));
 const data=presentPlans(records,{free_writing:5,free_speaking:2});
 const content=renderToStaticMarkup(React.createElement(PlansPage,{plans:data.paid,free:data.free}));
 fs.writeFileSync(path.join(out,`plans-${n}.html`),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Plan count ${n} QA only</title><style>body{margin:0;background:#FDFBF7} ${style}</style><main>${content}</main><footer class="jtn-design jtn-footer">${footer}</footer></html>`);
}

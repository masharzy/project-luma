import {build} from 'esbuild';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
await build({absWorkingDir:root,entryPoints:['services/speaking-worker/server.ts'],outfile:'services/speaking-worker/dist/worker.cjs',bundle:true,platform:'node',target:'node22',format:'cjs',packages:'external',tsconfig:resolve(root,'tsconfig.json'),plugins:[{name:'standalone-speaking',setup(b){
 b.onResolve({filter:/^server-only$/},()=>({path:'server-only',namespace:'empty'}));
 b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'',loader:'js'}));
 b.onResolve({filter:/^@\/lib\/evaluation\/provider$/},()=>({path:'speaking-model',namespace:'model'}));
 b.onLoad({filter:/.*/,namespace:'model'},()=>({contents:"export const speakingModel='xiaomi/mimo-v2.6-flash';",loader:'js'}));
}}]});

/** Canonical public paths; stored engine identifiers and saved attempt IDs stay stable. */
export function canonicalExamKind(kind:string){return kind==='practice'?'recent-tests':kind;}
export function storageExamKind(kind:string){return kind==='recent-tests'?'practice':kind;}
export function legacyPracticeDestination(params:Record<string,string|string[]|undefined>,base='/recent-tests'){
 const query=new URLSearchParams();for(const [key,value] of Object.entries(params)){if(key==='view')continue;for(const v of Array.isArray(value)?value:value===undefined?[]:[value])query.append(key,key==='collection'&&v==='practice'?'recent-tests':v);}
 if(params.view==='questions')query.set('view','questions');const path=params.view==='questions'?'/recent-tests':base;return path+(query.size?'?'+query.toString():'');
}

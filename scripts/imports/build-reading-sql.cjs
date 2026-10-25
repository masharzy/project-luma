/* Emits SQL only. Production replaces only the backed-up C1T1 sample, at its exact revision/hash. */
const fs=require('fs'),path=require('path'),{normalizeDocument}=require('./exam-loader.cjs')('document');
const book=Number(process.argv[2]),root=process.argv[3],mode=process.argv[4]||'validation';
if(!Number.isInteger(book)||book<1||book>21||!['validation','production'].includes(mode))throw Error('Invalid import scope');
const reports=JSON.parse(fs.readFileSync(path.join(root,'report.json'))),sql=[],quote=v=>"'"+String(v).replaceAll("'","''")+"'";
for(const r of reports.filter(r=>r.identity.book===book&&r.status==='validated')){
 const test=r.identity.test,doc=normalizeDocument(JSON.parse(fs.readFileSync(path.join(root,`${String(book).padStart(2,'0')}-${test}.json`))),'reading');
 const conflict=mode==='validation'?'DO UPDATE SET document=excluded.document,revision=exam_modules.revision+1,updated_at=now()':book===1&&test===1?"DO UPDATE SET document=excluded.document,revision=exam_modules.revision+1,updated_at=now() WHERE exam_modules.revision=2 AND md5(exam_modules.document::text)='3801812d7d324792a1a283e769f5b918'":'DO NOTHING';
 sql.push(`INSERT INTO public.exam_modules(kind,parent_id,module,cambridge_id,document) SELECT 'cambridge',id,'reading',id,${quote(JSON.stringify(doc))}::jsonb FROM public.cambridge_tests WHERE book_number=${book} AND test_number=${test} ON CONFLICT(kind,parent_id,module) ${conflict}`);
 sql.push(`UPDATE public.cambridge_tests t SET sections=sections||'["reading"]'::jsonb WHERE book_number=${book} AND test_number=${test} AND NOT sections @> '["reading"]'::jsonb AND EXISTS(SELECT 1 FROM public.exam_modules m WHERE m.kind='cambridge' AND m.parent_id=t.id AND m.module='reading' AND jsonb_array_length(m.document->'questions')>1)`);
}
process.stdout.write(JSON.stringify(sql));

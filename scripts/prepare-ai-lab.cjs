/* Run with an owner connection. Never prints credentials. */
const {readFileSync}=require('node:fs');
const {neon}=require('@neondatabase/serverless');
const url=process.env.DATABASE_URL_UNPOOLED;
if(!url||new URL(url).hostname.includes('-pooler'))throw Error('Set DATABASE_URL_UNPOOLED to the direct migration connection');
const sql=neon(url);
const source=readFileSync('migrations/018_ai_lab.sql','utf8');
const statements=source.split(';').map(s=>s.trim()).filter(s=>s&&!/^(BEGIN|COMMIT)$/i.test(s));
sql.transaction(statements.map(s=>sql.query(s))).then(()=>console.log('AI Lab tables and grants prepared.')).catch(()=>{console.error('AI Lab migration failed; check owner access and runtime role.');process.exitCode=1;});

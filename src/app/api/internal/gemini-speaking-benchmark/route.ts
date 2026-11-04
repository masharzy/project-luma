/** One-shot Gemini comparison completed. This endpoint is permanently disabled to prevent repeat charges. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(){return Response.json({status:'completed',enabled:false},{status:410,headers:{'Cache-Control':'no-store'}});}
export async function POST(){return Response.json({error:'Benchmark completed; no further calls allowed'},{status:410,headers:{'Cache-Control':'no-store'}});}

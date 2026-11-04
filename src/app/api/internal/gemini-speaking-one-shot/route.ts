/** Temporary Gemini benchmark disabled after provider rejected the request. */
export const runtime='nodejs';
export async function GET(){return Response.json({error:'Benchmark endpoint disabled'},{status:410,headers:{'Cache-Control':'no-store'}});}
export async function POST(){return Response.json({error:'Benchmark endpoint disabled'},{status:410,headers:{'Cache-Control':'no-store'}});}

import {NextRequest,NextResponse} from 'next/server';
const redirect=(req:NextRequest)=>{const url=req.nextUrl.clone();url.pathname='/api/type-wise-question-practice';return NextResponse.redirect(url,308);};
export const GET=redirect;export const POST=redirect;

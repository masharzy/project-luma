import { NextRequest } from 'next/server';
import { productUser,productError } from '@/lib/products/access';
import { requireSameOrigin,readBody,json,limitMany,networkKey } from '@/lib/auth/http';
import { startSpeaking } from '@/lib/products/speaking';
export async function POST(req:NextRequest){try{requireSameOrigin(req);const u=await productUser(),d=await readBody(req);await limitMany([{key:'speaking-start:'+u.id,max:10,seconds:86400},{key:'speaking-start-net:'+networkKey(req),max:60,seconds:86400}]);return json({id:await startSpeaking(String(d.testId),u.id)},201);}catch(e){return productError(e)}}

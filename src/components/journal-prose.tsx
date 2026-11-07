import {parseBody} from '@/lib/mdlite';
export function Prose({body}:{body:string}){
 return <>{parseBody(body).map((b,i)=>b.t==='h'?<h2 key={i}>{b.text}</h2>:b.t==='ul'?<ul key={i}>{b.items!.map(x=><li key={x}>{x}</li>)}</ul>:<p key={i}>{b.text}</p>)}</>;
}

const COL=['#c60936','#211e25','#d99a2b','#2f7d6d','#7a5ea8','#8a8187'];
type Series={name:string;values:number[]};
const W=640,H=300,L=52,R=16,T=16,B=44;
function scale(max:number){const m=Math.max(1,max);const p=Math.pow(10,Math.floor(Math.log10(m)));let s=Math.ceil(m/p)*p;if(s/m>1.6)s=Math.ceil(m/(p/2))*(p/2);return s;}
function Axes({max,x,unit}:{max:number;x:string[];unit?:string}){
 const top=scale(max),n=x.length;
 return <g fontSize="12" fill="#4a4249">
  {[0,.25,.5,.75,1].map(f=>{const y=T+(H-T-B)*(1-f);return <g key={f}><line x1={L} x2={W-R} y1={y} y2={y} stroke="#e7e0e2"/><text x={L-8} y={y+4} textAnchor="end">{+(top*f).toFixed(1)}</text></g>;})}
  {x.map((l,i)=>{const cx=L+(W-L-R)*(i+.5)/n;return <text key={l} x={cx} y={H-B+20} textAnchor="middle">{l}</text>;})}
  {unit&&<text x={L} y={10} fontSize="11">{unit}</text>}
 </g>;
}
function Legend({names}:{names:string[]}){return <div style={{display:'flex',gap:14,flexWrap:'wrap',justifyContent:'center',fontSize:13,marginTop:6}}>{names.map((n,i)=><span key={n} style={{display:'inline-flex',alignItems:'center',gap:6}}><i style={{width:12,height:12,borderRadius:3,background:COL[i%COL.length],display:'inline-block'}}/>{n}</span>)}</div>;}
export function Chart({type,data,unit}:{type:string;data:any;unit?:string}){
 if(type==='line'||type==='bar'){
  const x:string[]=data.x,s:Series[]=data.series,max=Math.max(...s.flatMap(a=>a.values)),top=scale(max),n=x.length;
  const yv=(v:number)=>T+(H-T-B)*(1-v/top),cx=(i:number)=>L+(W-L-R)*(i+.5)/n;
  return <figure style={{margin:0}}><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="chart" style={{width:'100%',height:'auto'}}>
   <Axes max={max} x={x} unit={unit}/>
   {type==='line'?s.map((a,k)=><g key={a.name}><polyline fill="none" stroke={COL[k%COL.length]} strokeWidth="2.6" strokeLinejoin="round" points={a.values.map((v,i)=>`${cx(i)},${yv(v)}`).join(' ')}/>{a.values.map((v,i)=><circle key={i} cx={cx(i)} cy={yv(v)} r="3.6" fill={COL[k%COL.length]}/>)}</g>)
   :s.map((a,k)=>{const slot=(W-L-R)/n,bw=Math.min(34,(slot*.78)/s.length);return <g key={a.name}>{a.values.map((v,i)=><rect key={i} x={cx(i)-bw*s.length/2+k*bw} y={yv(v)} width={bw-2} height={H-B-yv(v)} rx="3" fill={COL[k%COL.length]}/>)}</g>;})}
  </svg>{s.length>1||type==='line'?<Legend names={s.map(a=>a.name)}/>:null}</figure>;
 }
 if(type==='pie'){
  return <div style={{display:'flex',gap:24,flexWrap:'wrap',justifyContent:'center'}}>{data.charts.map((c:any)=>{
   let a=-Math.PI/2;const tot=c.slices.reduce((t:number,s:any)=>t+s.value,0);
   return <figure key={c.label} style={{margin:0,textAlign:'center'}}><svg viewBox="-110 -110 220 220" style={{width:200,height:200}} role="img" aria-label={c.label}>
    {c.slices.map((s:any,i:number)=>{const b=a+s.value/tot*Math.PI*2,r=100,large=b-a>Math.PI?1:0;const d=`M0 0 L${r*Math.cos(a)} ${r*Math.sin(a)} A${r} ${r} 0 ${large} 1 ${r*Math.cos(b)} ${r*Math.sin(b)}Z`;const m=(a+b)/2;a=b;return <g key={s.name}><path d={d} fill={COL[i%COL.length]} stroke="#fff" strokeWidth="2"/>{s.value>=7&&<text x={64*Math.cos(m)} y={64*Math.sin(m)+4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{s.value}%</text>}</g>;})}
   </svg><figcaption style={{fontWeight:700,marginTop:4}}>{c.label}</figcaption>
   <Legend names={c.slices.map((s:any)=>`${s.name} ${s.value}%`)}/></figure>;})}</div>;
 }
 if(type==='table'){
  return <div style={{overflowX:'auto'}}><table style={{borderCollapse:'collapse',width:'100%',fontSize:14}}><thead><tr>{data.columns.map((c:string,i:number)=><th key={i} style={{textAlign:i?'right':'left',padding:'10px 12px',background:'#f7f1ed',borderBottom:'1.5px solid #e7e0e2'}}>{c}</th>)}</tr></thead>
   <tbody>{data.rows.map((r:any[],i:number)=><tr key={i}>{r.map((c,j)=><td key={j} style={{textAlign:j?'right':'left',padding:'10px 12px',borderBottom:'1px solid #efe9eb',fontWeight:j?400:600}}>{c}</td>)}</tr>)}</tbody></table>{unit&&<small style={{color:'#4a4249'}}>{unit}</small>}</div>;
 }
 if(type==='process'){
  return <div>{data.note&&<p style={{margin:'0 0 12px',color:'#4a4249',fontSize:14}}>{data.note}</p>}<ol style={{listStyle:'none',margin:0,padding:0,display:'flex',flexWrap:'wrap',gap:10}}>{data.steps.map((s:string,i:number)=><li key={i} style={{display:'flex',alignItems:'center',gap:8}}><span style={{display:'inline-flex',alignItems:'center',gap:8,padding:'8px 12px',border:'1.5px solid #e7e0e2',borderRadius:12,background:'#fff',fontSize:13.5}}><b style={{width:22,height:22,borderRadius:'50%',background:'#c60936',color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:12}}>{i+1}</b>{s}</span>{i<data.steps.length-1&&<span aria-hidden style={{color:'#8a8187'}}>→</span>}</li>)}</ol></div>;
 }
 return null;
}

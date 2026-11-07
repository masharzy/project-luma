type P={size?:number};
const base=(size:number)=>({width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true});
export const SpeakerIcon=({size=16}:P)=><svg {...base(size)}><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>;
export const LockIcon=({size=16}:P)=><svg {...base(size)}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
export const SearchIcon=({size=16}:P)=><svg {...base(size)}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
export const CheckIcon=({size=16}:P)=><svg {...base(size)}><path d="M5 12.5 10 17.5 19 7"/></svg>;

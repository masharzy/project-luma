'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {authClient} from '@/lib/auth/client';
import {otherBookSeries} from '@/lib/other-books';
type NavLink={href:string;label:string;sub?:boolean};
// Navbar order: IELTS (Cambridge, More Test Books with every series, Recent IELTS Tests, Exercise by Question Type), Mock exams, AI Feedback, Resources, Pricing.
const seriesLinks:NavLink[]=[...otherBookSeries].sort((a,b)=>(b.slug==='official-guide'?1:0)-(a.slug==='official-guide'?1:0)).map(x=>({href:'/other-books/'+x.slug,label:x.name,sub:true}));
const ielts:NavLink[]=[{href:'/cambridge',label:'Cambridge'},{href:'/other-books',label:'Other Books'},...seriesLinks,{href:'/recent-tests',label:'Recent IELTS Tests'},{href:'/recent-tests?view=questions',label:'IELTS Exercise by Question Type'}];
const ieltsPaths=['/cambridge','/other-books','/recent-tests','/type-wise-question-practice'];
const ai:NavLink[]=[{href:'/writing-evaluation',label:'Writing'},{href:'/speaking-evaluation',label:'Speaking'}];
const groups=[{id:'ielts',label:'IELTS',links:ielts,paths:ieltsPaths},{id:'ai',label:'AI Feedback',links:ai,paths:['/writing-evaluation','/speaking-evaluation']}];
export function Header(){
 const [open,setOpen]=useState(false),[books,setBooks]=useState(false),[menu,setMenu]=useState<string|null>(null),header=useRef<HTMLElement>(null),buttons=useRef<Record<string,HTMLButtonElement|null>>({});
 const pathname=usePathname(),{data:session,isPending}=authClient.useSession();
 const close=()=>{setOpen(false);setMenu(null);setBooks(false);};
 useEffect(()=>{const outside=(e:PointerEvent)=>{if(!header.current?.contains(e.target as Node)){setOpen(false);setMenu(null);}};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
 const active=(href:string)=>pathname===href||pathname.startsWith(href+'/');
const renderGroup=(group:typeof groups[number])=><div className="learn-navigation" key={group.id}><button ref={el=>{buttons.current[group.id]=el;}} type="button" className={'nav-learn '+(group.paths.some(h=>active(h))?'active':'')} aria-expanded={menu===group.id} aria-controls={group.id+'-navigation'} onClick={()=>setMenu(menu===group.id?null:group.id)}>{group.label} <span aria-hidden="true">{menu===group.id?'−':'+'}</span></button><div className="learn-dropdown" id={group.id+'-navigation'} hidden={menu!==group.id}>{group.links.map(l=>l.sub?(books?<Link href={l.href} key={l.href} className="sub" onClick={close}><b>{l.label}</b><span aria-hidden="true">↗</span></Link>:null):l.href==='/other-books'?<div className="dd-row" key={l.href}><Link href={l.href} onClick={close}><b>{l.label}</b></Link><button type="button" className="dd-toggle" aria-expanded={books} aria-label={books?'Hide books':'Show all books'} onClick={()=>setBooks(!books)}>{books?'−':'+'}</button></div>:<Link href={l.href} key={l.href} onClick={close}><b>{l.label}</b><span aria-hidden="true">↗</span></Link>)}</div></div>;
 return <header ref={header} className="site-header upgraded-header" onKeyDown={e=>{if(e.key==='Escape'){const target=menu?buttons.current[menu]:null;close();target?.focus();}}}><div className="container header-inner"><Link className="brand" href="/" aria-label="JumpToNine home" onClick={close}>JumpToNine</Link><nav className={`nav ${open?'open':''}`} id="main-navigation" aria-label="Main navigation">{[groups[0]].map(renderGroup)}<Link href="/mocks" className={active('/mocks')?'active':''} onClick={close}>Mock exams</Link>{[groups[1]].map(renderGroup)}<Link href="/resources" className={active('/resources')?'active':''} onClick={close}>Resources</Link><Link href="/pricing" className={active('/pricing')?'active':''} onClick={close}>Pricing</Link></nav><div className="header-actions"><Link className="button nav-signin" href={session?.user?'/dashboard':'/auth/sign-in'} onClick={close}>{isPending?'Your space':session?.user?'Dashboard':'Log in'}<span aria-hidden="true">↗</span></Link><button className="menu-toggle" type="button" aria-label={open?'Close navigation':'Open navigation'} aria-controls="main-navigation" aria-expanded={open} onClick={()=>{setOpen(!open);setMenu(null);}}>{open?'Close ×':'Menu ☰'}</button></div></div></header>;
}

'use client';
import { useEffect } from 'react';
/** Progressive enhancement of the trusted SSR prototype; no microphone or API calls. */
export function HomeInteractions(){
 useEffect(()=>{
  const root=document.querySelector<HTMLElement>('.jtn-home');if(!root)return;
  const abort=new AbortController(),signal=abort.signal;
  const timeouts=new Set<ReturnType<typeof setTimeout>>();
  const later=(fn:()=>void,ms:number)=>{const t=setTimeout(()=>{timeouts.delete(t);fn();},ms);timeouts.add(t);return t;};
  const all=<T extends HTMLElement>(s:string,scope:ParentNode=root)=>Array.from(scope.querySelectorAll<T>(s));
  const get=<T extends HTMLElement>(id:string)=>root.querySelector<T>('#jtn-'+id)!;
  const on=(e:EventTarget,event:string,fn:EventListener)=>e.addEventListener(event,fn,{signal});
  // Header is measured, never restyled. CSS fallback reserves its height before hydration.
  const header=document.querySelector<HTMLElement>('.site-header');
  const measure=()=>{if(header)root.style.setProperty('--header-h',header.getBoundingClientRect().height+'px');};
  measure();const headerObserver=new ResizeObserver(measure);if(header)headerObserver.observe(header);
  const tabs=all<HTMLButtonElement>('[role=tab]'),panes=all<HTMLElement>('.jtn-pane');
  const activate=(i:number,focus=false)=>{tabs.forEach((tab,j)=>{tab.setAttribute('aria-selected',String(i===j));tab.tabIndex=i===j?0:-1;panes[j].hidden=i!==j;});if(focus)tabs[i].focus();};
  tabs.forEach((tab,i)=>{on(tab,'click',()=>activate(i));on(tab,'keydown',(event)=>{const e=event as KeyboardEvent;let next=i;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();activate(next,true);});});
  const picks=all<HTMLButtonElement>('.jtn-pick');picks.forEach(b=>on(b,'click',()=>picks.forEach(x=>x.setAttribute('aria-pressed',String(x===b)))));
  const chips=all<HTMLButtonElement>('.jtn-chip'),counter=get('cnt');chips.forEach(c=>on(c,'click',()=>{c.setAttribute('aria-pressed',String(c.getAttribute('aria-pressed')!=='true'));const n=chips.filter(x=>x.getAttribute('aria-pressed')==='true').length;counter.textContent=n?`${n} type${n===1?'':'s'} selected`:'Pick a type to start';}));
  const passage=get('passage');let just=false;
  const highlight=()=>{const s=window.getSelection();if(!s?.rangeCount||s.isCollapsed||!passage.contains(s.anchorNode)||!passage.contains(s.focusNode))return;const range=s.getRangeAt(0);if(range.startContainer!==range.endContainer||range.startContainer.nodeType!==Node.TEXT_NODE)return;const mark=document.createElement('mark');mark.tabIndex=0;mark.setAttribute('aria-label','Highlighted text; activate to remove');try{range.surroundContents(mark);s.removeAllRanges();just=true;later(()=>{just=false;},50);}catch{/* Cross-element selections are intentionally ignored. */}};
  on(passage,'mouseup',highlight);on(passage,'touchend',()=>{later(highlight,10);});
  const remove=(e:Event)=>{const mark=(e.target as HTMLElement).closest('mark');if(mark&&!just){mark.replaceWith(...Array.from(mark.childNodes));passage.normalize();}};
  on(passage,'click',remove);on(passage,'keydown',(event)=>{const e=event as KeyboardEvent;if(e.key==='Enter'||e.key===' '){e.preventDefault();remove(e);}});
  const fmt=(n:number)=>`${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toString().padStart(2,'0')}`;
  let seconds=3600,mock=599;const timer=get('tm'),countdown=get('cd');
  const tick=setInterval(()=>{seconds=seconds?seconds-1:3600;mock=mock?mock-1:599;timer.textContent=fmt(seconds);countdown.textContent=fmt(mock);},1000);
  const saved=get('sv');let saveTimer:ReturnType<typeof setTimeout>|undefined;
  on(get('nt'),'input',()=>{saved.textContent='Saving…';if(saveTimer)clearTimeout(saveTimer);saveTimer=later(()=>{saved.textContent='Saved';},600);});
  const card=get('card'),tip=get('tip');const colors:Record<string,string>={'jtn-r':'#FF6B86','jtn-y':'#F5C518','jtn-g':'#5CC47F'};
  const hide=()=>{tip.classList.remove('jtn-show');};
  const show=(mark:HTMLElement)=>{const label=document.createElement('b'),text=document.createElement('span');label.textContent=mark.dataset.k??'';text.textContent=mark.dataset.t??'';tip.replaceChildren(label,text);tip.style.setProperty('--k',colors[mark.className]);const r=mark.getClientRects()[0],c=card.getBoundingClientRect();const w=tip.offsetWidth,h=tip.offsetHeight;const x=Math.max(8,Math.min(r.left-c.left+r.width/2-w/2,c.width-w-8));let y=r.top-c.top-h-10;tip.style.transformOrigin='50% 100%';if(y<8){y=r.bottom-c.top+10;tip.style.transformOrigin='50% 0';}tip.style.left=x+'px';tip.style.top=y+'px';tip.classList.add('jtn-show');};
  all<HTMLElement>('#jtn-essay mark').forEach(mark=>{on(mark,'mouseenter',()=>show(mark));on(mark,'focus',()=>show(mark));on(mark,'click',()=>show(mark));on(mark,'mouseleave',hide);on(mark,'blur',hide);on(mark,'keydown',e=>{if((e as KeyboardEvent).key==='Escape')hide();});});
  const wave=get('wave');wave.replaceChildren();for(let i=0;i<90;i++){const bar=document.createElement('i');bar.style.setProperty('--a',(14+Math.abs(Math.sin(i*1.3)*60+Math.cos(i*.45)*20))+'%');bar.style.setProperty('--t',Math.random()*.7+'s');wave.appendChild(bar);}
  const rec=get('rec'),speaking=get('spk'),say=get('say'),caption=get('rtxt');
  on(rec,'click',()=>{const live=!speaking.classList.contains('jtn-live');speaking.classList.toggle('jtn-live',live);say.hidden=!live;rec.setAttribute('aria-pressed',String(live));caption.textContent=live?'Recording a sample. Tap to stop.':'Tap to try a sample';});
  const shelf=get('shelf');let shelfObserver:ResizeObserver|undefined;
  if(shelf){const spines=all<HTMLElement>('.jtn-sn',shelf),cover=shelf.querySelector<HTMLElement>('.jtn-cv'),more=shelf.querySelector<HTMLElement>('.jtn-ml')!;
   const fit=()=>{const g=parseFloat(getComputedStyle(shelf).columnGap)||8,cs=getComputedStyle(more);const used=(cover?.offsetWidth??0)+more.offsetWidth+(parseFloat(cs.marginLeft)||0)+(parseFloat(cs.marginRight)||0)+g*2;const n=Math.max(0,Math.min(spines.length,Math.floor((shelf.clientWidth-used+g)/(52+g))));spines.forEach((s,i)=>{s.hidden=i>=n;});const remaining=Number(shelf.dataset.total)-Number(!!cover)-n;get('mn').textContent=remaining>0?'+'+remaining:'+';};
   fit();on(window,'resize',fit);shelfObserver=new ResizeObserver(fit);shelfObserver.observe(shelf);
  }
  const cues=all<HTMLButtonElement>('.jtn-cue');cues.forEach(c=>on(c,'click',()=>cues.forEach(x=>x.style.setProperty('--i',String((Number(getComputedStyle(x).getPropertyValue('--i'))+2)%3)))));
  return()=>{abort.abort();headerObserver.disconnect();shelfObserver?.disconnect();clearInterval(tick);timeouts.forEach(clearTimeout);wave.replaceChildren();};
 },[]);
 return null;
}

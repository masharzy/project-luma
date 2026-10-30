import { Suspense } from 'react';
import { headers } from 'next/headers';
import type { Metadata, Viewport } from 'next';
import { homeMarkup, homeStructuredData } from '@/lib/home-prototype';
import { getHomeShelf, getHomeAllowance, shelfMarkup, shelfStyles, allowanceMarkup } from '@/lib/home-data';
import { HomeInteractions } from '@/components/home-interactions';
const title='JumpToNine: Free IELTS Practice Tests with AI Writing and Speaking Feedback';
const description='Practise IELTS Listening, Reading, Writing and Speaking online. Cambridge 1–21, question-type practice, scheduled mock exams and AI feedback with an estimated band.';
export const metadata:Metadata={title:{absolute:title},description,alternates:{canonical:'https://jumptonine.com/'},openGraph:{type:'website',url:'https://jumptonine.com/',siteName:'JumpToNine',title:'JumpToNine: IELTS practice, one step at a time',description:'Cambridge 1–21, mock exams and AI feedback for all four IELTS modules. Start with a free test.'},twitter:{card:'summary',title,description}};
export const viewport:Viewport={themeColor:'#FDFBF7'};
export const dynamic='force-dynamic';
const booksAt=homeMarkup.indexOf('<section id="books"');
const heroMarkup=homeMarkup.slice(0,booksAt);
const bodyMarkup=homeMarkup.slice(booksAt);
async function HomeBody({nonce}:{nonce?:string}){
 const [shelf,allowance]=await Promise.allSettled([getHomeShelf(),getHomeAllowance()]);
 const data=shelf.status==='fulfilled'?shelf.value:{range:'',total:0,series:[]};
 const policy=allowance.status==='fulfilled'?allowance.value:null;
 const shelfHtml=(shelf.status==='fulfilled'?shelfMarkup(data):'<p class="jtn-lead">The library is temporarily unavailable. <a href="/other-books">Browse the library</a></p>');
 const body=bodyMarkup.replace('__BOOKS__',shelfHtml).replaceAll('__RANGE__',data.range||'books').replace('__WRITING_DOTS__',allowanceMarkup(policy?.writing??null)).replace('__SPEAKING_DOTS__',allowanceMarkup(policy?.speaking??null));
 return <><style nonce={nonce}>{shelfStyles(data)}</style><div className="jtn-home-body" dangerouslySetInnerHTML={{__html:body}}/><HomeInteractions/></>;
}
export default async function Page(){
 const nonce=(await headers()).get('x-nonce')??undefined;
 return <div className="jtn-design jtn-home" lang="en">
  <link rel="preload" href="/fonts/home/home-0.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
  <link rel="preload" href="/fonts/home/bricolage-variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
  <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(homeStructuredData).replace(/</g,'\\u003c')}}/>
  <div dangerouslySetInnerHTML={{__html:heroMarkup}}/>
  <Suspense fallback={<div className="jtn-wrap jtn-loading" role="status">Loading the library and practice tools…</div>}><HomeBody nonce={nonce}/></Suspense>
 </div>;
}

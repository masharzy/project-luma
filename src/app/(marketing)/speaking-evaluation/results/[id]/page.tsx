import { requireUser } from '@/lib/auth/guards';
import { speakingAttempt } from '@/lib/products/speaking';
import { SpeakingFeedback } from '@/components/speaking-feedback';
import { PageIntro,PageWrap } from '@/components/page-parts';
import '@/styles/evaluation-products.css';
import {normalizeSpeakingSet} from '@/lib/speaking/schema';
import {speakingSteps} from '@/lib/speaking/flow';
export default async function Page({params}:{params:Promise<{id:string}>}){const u=await requireUser(),{id}=await params,a=await speakingAttempt(id,u.id);const questions=speakingSteps(normalizeSpeakingSet(a.snapshot)).flatMap((s,step)=>s.t==='ask'?[{step,part:s.p,question:s.q||s.say||''}]:[]);return <PageWrap><PageIntro eyebrow="Speaking Evaluation" title={String(a.title)} crumbs={[{label:"AI Feedback"},{label:"Speaking Evaluation",href:"/speaking-evaluation"},{label:"Result"}]}/><SpeakingFeedback id={id} questions={questions}/></PageWrap>}

import type { ExamDocument, Module } from './document';
export type AttemptSnapshot={module:Module|'speaking';document:ExamDocument & {speakingSet?:any;speakingSetId?:string;untimed?:boolean}}[];
// One clock for every scheduled mock. Pure functions, no I/O: server and browser use the same rules.
// starts_at = the moment the waiting room opens its door ("Join now"). Everything else is derived from it.
export const LOBBY_LEAD_MS = 10 * 60_000;   // the countdown appears this long before starts_at
export const JOIN_WINDOW_MS = 3 * 60_000;   // Join now is open from starts_at for this long
export const LOAD_BUFFER_MS = 15_000;       // everybody sees "loading" while audio and papers finish preloading
export const MODULE_GAP_MS = 60_000;        // waiting room between two modules
export const SPEAKING_MS = 15 * 60_000;     // Speaking has one shared timer
export const PRELOAD_LEAD_MS = 30_000;      // the paper is sent this long before its module starts (so it can render at once)
export const SAVE_GRACE_MS = 2_500;         // last autosave/submit may arrive this late (network)

type Mod = { module: string; document: { durationMinutes: number } };
export const moduleMs = (m: Mod) => (m.module === 'speaking' ? SPEAKING_MS : Math.round(m.document.durationMinutes * 60_000));
/** The shared moment the first module starts for everyone. */
export const examStart = (startsAt: number) => startsAt + JOIN_WINDOW_MS + LOAD_BUFFER_MS;
export const joinOpensAt = (startsAt: number) => startsAt;
export const joinClosesAt = (startsAt: number) => startsAt + JOIN_WINDOW_MS;
export const lobbyOpensAt = (startsAt: number) => startsAt - LOBBY_LEAD_MS;
export function moduleStart(snapshot: Mod[], startsAt: number, index: number) {
  let t = examStart(startsAt);
  for (let i = 0; i < index; i++) t += moduleMs(snapshot[i]) + MODULE_GAP_MS;
  return t;
}
export const moduleEnd = (snapshot: Mod[], startsAt: number, index: number) => moduleStart(snapshot, startsAt, index) + moduleMs(snapshot[index]);
export const mockEnd = (snapshot: Mod[], startsAt: number) => moduleEnd(snapshot, startsAt, snapshot.length - 1);
export type LobbyStage = 'wait' | 'countdown' | 'join' | 'loading' | 'live' | 'ended';
/** Stage of the lobby for someone who has not started an attempt yet. */
export function lobbyStage(startsAt: number, endsAt: number, now: number): LobbyStage {
  if (now < lobbyOpensAt(startsAt)) return 'wait';
  if (now < startsAt) return 'countdown';
  if (now < joinClosesAt(startsAt)) return 'join';
  if (now < examStart(startsAt)) return 'loading';
  return now < endsAt ? 'live' : 'ended';
}
/** End of a module in a scheduled mock. `start` is the event's starts_at. */
export function moduleDeadline(snapshot:AttemptSnapshot,start:number,index:number){return moduleEnd(snapshot,start,index);}
export function mockPhase(start:number,end:number,now:number){return now<start?'waiting':now<end?'live':'ended';}
export function cleanAnswers(snapshot:AttemptSnapshot,index:number,input:unknown){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length>450)throw Error('Invalid answers');
 const doc=snapshot[index].document,allowed=new Set(doc.questions.map((q:any)=>q.id));
 doc.parts.forEach((p:any)=>allowed.add('writing_draft_'+p.id));
 const result:Record<string,string>={};
 for(const [key,value] of Object.entries(input)){if(!allowed.has(key)||typeof value!=='string'||value.length>60000)throw Error('Invalid answer');result[key]=value;}
 return result;
}

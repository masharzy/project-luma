export type Block={t:'h'|'p'|'ul'|'tip'|'ex';text?:string;items?:string[]};
// Tiny markdown-lite: blank-line paragraphs, '## ' headings, '- ' bullets, 'Tip: ' and 'Example: ' callouts.
export function parseBody(body:string):Block[]{
 return body.split(/\n{2,}/).map(s=>s.trim()).filter(Boolean).map((s):Block=>{
  if(s.startsWith('## '))return{t:'h',text:s.slice(3)};
  const lines=s.split('\n');
  if(lines.every(l=>l.trim().startsWith('- ')))return{t:'ul',items:lines.map(l=>l.trim().slice(2))};
  if(lines[0].startsWith('## '))return{t:'h',text:lines[0].slice(3)};
  if(s.startsWith('Tip: '))return{t:'tip',text:s.slice(5)};
  if(s.startsWith('Example: '))return{t:'ex',text:s.slice(9)};
  return{t:'p',text:s.replace(/\n/g,' ')};
 });
}
export const readMinutes=(body:string)=>Math.max(1,Math.round(body.trim().split(/\s+/).length/200));

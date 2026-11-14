// Build guard: the exam UI is unusable without its scoped Tailwind utilities (the paper renders below the page
// instead of full screen). Several Tailwind configs share one build, so verify the output after `next build`.
import { readdirSync, readFileSync } from 'node:fs';
const dir = new URL('../.next/static/css/', import.meta.url);
const css = readdirSync(dir).filter(f => f.endsWith('.css')).map(f => readFileSync(new URL(f, dir), 'utf8')).join('\n');
const required = ['.exam-engine .fixed{', '.exam-engine .inset-0{', '.exam-engine .flex{', '.exam-engine .overflow-hidden{', '.admin-app .fixed{'];
const missing = required.filter(s => !css.includes(s));
if (css.includes('@tailwind')) missing.push('an unprocessed @tailwind directive is in the output');
if (missing.length) { console.error('Built CSS is missing:', missing.join(', ')); process.exit(1); }
console.log('Exam and admin Tailwind utilities are present in the build.');

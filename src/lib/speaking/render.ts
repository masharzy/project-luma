import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { SpeakingMode, SpeakingSet } from './schema';
import { speakingSteps } from './flow';

export async function renderSpeakingRoom(mode: SpeakingMode, testId: string, questions: SpeakingSet, nonce: string, preview = false, durationMinutes = 15, product: { savedSteps: number[]; storageReady: boolean; mockDeadline?: number; mockUntimed?: boolean; mockAttemptId?: string; mockServerNow?: number } = { savedSteps: [], storageReady: false }) {
 const root = path.join(process.cwd(), 'src/lib/speaking');
 const [template, controller, bridge] = await Promise.all(
  ['approved-room.html', 'controller.js', 'product-controller.js'].map(file => readFile(path.join(root, file), 'utf8')),
 );
 const config = JSON.stringify({ ...product, mode, testId, durationMinutes, questions, steps: speakingSteps(questions), preview }).replace(/</g, '\\u003c');
 return template.replace('<style>', '<style nonce="' + nonce + '">').replace('<!-- ROOM_RUNTIME -->', () =>
  '<script nonce="' + nonce + '">\n(()=>{\n\'use strict\';\nconst ROOM=' + config + ';\n' + controller + '\n' + bridge + '\n})();\n</script>',
 );
}

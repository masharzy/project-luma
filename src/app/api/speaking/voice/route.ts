import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { productUser, productError, productAccess } from '@/lib/products/access';
import { getKey } from '@/lib/ai-lab/secrets';
import { speakingAttempt } from '@/lib/products/speaking';
import { speakingSteps } from '@/lib/speaking/flow';
import { normalizeSpeakingSet } from '@/lib/speaking/schema';
import { getPrivate, putPrivate, storageConfigured } from '@/lib/products/storage';
import { AuthHttpError, limit } from '@/lib/auth/http';
import { mockSpeakingContext, requireSpeakingWindow } from '@/lib/exam/mock-speaking';

export const runtime = 'nodejs';
export const maxDuration = 60;

const model = 'microsoft/mai-voice-2.1-flash';
const voice = 'en-GB-Harry:MAI-Voice-2.1-Flash';
const maxAudioBytes = 3_000_000;

async function synthesizeExaminer(text: string, apiKey: string) {
 const audio = await fetch('https://openrouter.ai/api/v1/audio/speech', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model, input: text, voice, response_format: 'mp3' }),
  signal: AbortSignal.timeout(25000),
 });
 if (!audio.ok) {
  await audio.body?.cancel();
  console.warn('Speaking examiner synthesis rejected', { status: audio.status });
  throw new AuthHttpError(503, 'Examiner voice is temporarily unavailable', 'EXAMINER_SYNTHESIS_FAILED');
 }
 const reader = audio.body?.getReader();
 if (!reader || Number(audio.headers.get('content-length')) > maxAudioBytes) {
  await reader?.cancel();
  throw new Error('Invalid examiner audio response');
 }

 const chunks: Uint8Array[] = [];
 let size = 0;
 while (true) {
  const part = await reader.read();
  if (part.done) break;
  size += part.value.length;
  if (size > maxAudioBytes) {
   await reader.cancel();
   throw new Error('Examiner audio exceeds size limit');
  }
  chunks.push(part.value);
 }
 const bytes = Buffer.concat(chunks);
 const mp3Header = bytes.toString('ascii', 0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
 if (bytes.length <= 44 || !mp3Header) throw new Error('Invalid examiner MP3 response');
 return bytes;
}

export async function GET(req: NextRequest) {
 let stage = 'access';
 try {
  if (req.headers.get('sec-fetch-site') === 'cross-site') throw new AuthHttpError(403, 'Forbidden');
  const user = await productUser();
  const attempt = await speakingAttempt(req.nextUrl.searchParams.get('test') || '', user.id);
  const step = Number(req.nextUrl.searchParams.get('step'));
  const text = speakingSteps(normalizeSpeakingSet(attempt.snapshot))[step]?.say;
  if (!Number.isInteger(step) || step < 0 || !text || text.length > 600) {
   throw new AuthHttpError(400, 'Question audio unavailable');
  }
  const mock = await mockSpeakingContext(String(attempt.id), user.id);
  if (mock) requireSpeakingWindow(mock);
  else await productAccess(user.id, 'speaking_product');

  const key = 'examiner-voice/' + createHash('sha256').update(model + ':' + voice + ':' + text).digest('hex') + '.mp3';
  stage = 'storage';
  let bytes = storageConfigured() ? await getPrivate(key).catch(() => null) : null;
  if (!bytes) {
   stage = 'provider-key';
   const apiKey = await getKey('openrouter');
   stage = 'rate-limit';
   await limit('speaking-tts:' + user.id, 100, 3600);
   stage = 'synthesis';
   bytes = await synthesizeExaminer(text, apiKey);
   if (storageConfigured()) {
    await putPrivate(key, bytes, 'audio/mpeg').catch(() => console.warn('Speaking examiner audio cache write failed'));
   }
  }
  return new Response(Buffer.from(bytes), {
   headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(bytes.length), 'Cache-Control': 'private, max-age=3600' },
  });
 } catch (error) {
  console.warn('Speaking examiner audio request failed', {
   stage,
   status: error instanceof AuthHttpError ? error.status : 503,
   code: error instanceof AuthHttpError ? error.code : 'EXAMINER_AUDIO_ERROR',
  });
  return productError(error);
 }
}

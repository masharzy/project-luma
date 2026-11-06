import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { productUser, productError, productAccess } from '@/lib/products/access';
import { speakingAttempt } from '@/lib/products/speaking';
import { speakingSteps } from '@/lib/speaking/flow';
import { normalizeSpeakingSet } from '@/lib/speaking/schema';
import { getPrivate, putPrivate, storageConfigured } from '@/lib/products/storage';
import { AuthHttpError, limit } from '@/lib/auth/http';
import { mockSpeakingContext, requireSpeakingWindow } from '@/lib/exam/mock-speaking';

export const runtime = 'nodejs';
export const maxDuration = 60;

const model = 'qwen3-tts-flash';
const voice = 'Ethan';
const maxAudioBytes = 3_000_000;

function synthesisEndpoint() {
 const configured = process.env.QWEN_BASE_URL?.trim();
 const origin = configured ? new URL(configured) : new URL('https://dashscope-intl.aliyuncs.com');
 const workspace = /^[a-z0-9-]+\.(?:ap-southeast-1|cn-beijing|us-east-1)\.maas\.aliyuncs\.com$/i.test(origin.hostname)
  && !origin.hostname.startsWith('token-plan.');
 const shared = ['dashscope-intl.aliyuncs.com', 'dashscope.aliyuncs.com'].includes(origin.hostname);
 if (origin.protocol !== 'https:' || origin.port || origin.username || origin.password || (!workspace && !shared)) {
  throw new AuthHttpError(503, 'Examiner synthesis needs an Alibaba Model Studio endpoint', 'EXAMINER_ENDPOINT_NOT_CONFIGURED');
 }
 return new URL('/api/v1/services/aigc/multimodal-generation/generation', origin);
}

async function synthesizeExaminer(text: string, apiKey: string) {
 const endpoint = synthesisEndpoint();
 const response = await fetch(endpoint, {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model, input: { text, voice, language_type: 'English' } }),
  signal: AbortSignal.timeout(25000),
 });
 if (!response.ok) {
  const failure = await response.json().catch(() => null);
  const code = typeof failure?.code === 'string' && /^[a-z0-9_.-]{1,64}$/i.test(failure.code) ? failure.code : undefined;
  console.warn('Speaking examiner synthesis rejected', {
   status: response.status,
   code,
   workspaceEndpoint: endpoint.hostname.endsWith('.maas.aliyuncs.com'),
  });
  throw new AuthHttpError(503, 'Examiner voice is temporarily unavailable', 'EXAMINER_SYNTHESIS_FAILED');
 }

 const data = await response.json();
 const url = new URL(data.output?.audio?.url);
 if (!['http:', 'https:'].includes(url.protocol) || url.port || url.username || url.password || !url.hostname.endsWith('.aliyuncs.com')) {
  throw new Error('Invalid examiner audio URL');
 }
 url.protocol = 'https:';
 const audio = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10000) });
 const reader = audio.body?.getReader();
 if (!reader || !audio.ok || Number(audio.headers.get('content-length')) > maxAudioBytes) {
  await reader?.cancel();
  console.warn('Speaking examiner audio download rejected', { status: audio.status });
  throw new AuthHttpError(503, 'Examiner audio is temporarily unavailable', 'EXAMINER_DOWNLOAD_FAILED');
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
 if (bytes.length <= 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
  throw new Error('Invalid examiner WAV response');
 }
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

  const key = 'examiner-voice/' + createHash('sha256').update(model + ':' + voice + ':' + text).digest('hex') + '.wav';
  stage = 'storage';
  let bytes = storageConfigured() ? await getPrivate(key).catch(() => null) : null;
  if (!bytes) {
   const apiKey = process.env.DASHSCOPE_API_KEY;
   if (!apiKey) throw new AuthHttpError(503, 'Examiner voice is not enabled yet', 'EXAMINER_NOT_CONFIGURED');
   stage = 'rate-limit';
   await limit('speaking-tts:' + user.id, 100, 3600);
   stage = 'synthesis';
   bytes = await synthesizeExaminer(text, apiKey);
   if (storageConfigured()) {
    await putPrivate(key, bytes, 'audio/wav').catch(() => console.warn('Speaking examiner audio cache write failed'));
   }
  }
  return new Response(Buffer.from(bytes), {
   headers: { 'Content-Type': 'audio/wav', 'Content-Length': String(bytes.length), 'Cache-Control': 'private, max-age=3600' },
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

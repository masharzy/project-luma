import 'server-only';
// AI provider keys come only from Vercel environment variables. Nothing is stored in the database.
export type Provider = 'google' | 'openrouter' | 'zai';
const envName: Record<Provider, string> = { google: 'GEMINI_API_KEY', openrouter: 'OPENROUTER_API_KEY', zai: 'ZAI_API_KEY' };
export async function getKey(provider: Provider) {
  const value = process.env[envName[provider]]?.trim();
  if (!value) throw Error('Provider key is not configured');
  return value;
}
export async function keyStatus() {
  return { google: Boolean(process.env.GEMINI_API_KEY), openrouter: Boolean(process.env.OPENROUTER_API_KEY), zai: Boolean(process.env.ZAI_API_KEY) };
}

'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/auth/db';

const num = (v: FormDataEntryValue | null, max: number) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error('Enter a number between 0 and ' + max + '.');
  return n;
};
async function audit(userId: string, action: string) {
  await db().query('INSERT INTO app_auth.audit_events(user_id,action) VALUES($1,$2)', [userId, action.slice(0, 200)]);
}
export async function savePrice(form: FormData) {
  const admin = await requireAdmin();
  const model = String(form.get('model') ?? '').trim();
  if (!model || model.length > 160) throw new Error('Model ID is required.');
  const verified = String(form.get('verified_on') ?? '').trim();
  if (verified && !/^\d{4}-\d{2}-\d{2}$/.test(verified)) throw new Error('Use YYYY-MM-DD for the verified date.');
  await db().query(`INSERT INTO public.ai_model_prices(model,input_usd_per_m,output_usd_per_m,audio_usd_per_min,source_note,verified_on,updated_by,updated_at)
    VALUES($1,$2,$3,$4,$5,NULLIF($6,'')::date,$7,now())
    ON CONFLICT(model) DO UPDATE SET input_usd_per_m=$2,output_usd_per_m=$3,audio_usd_per_min=$4,source_note=$5,verified_on=NULLIF($6,'')::date,updated_by=$7,updated_at=now()`,
    [model, num(form.get('input'), 10000), num(form.get('output'), 10000), num(form.get('audio'), 1000), String(form.get('note') ?? '').slice(0, 300), verified, admin.id]);
  await audit(admin.id, 'admin.ai_price.save:' + model);
  revalidatePath('/admin/costs');
}
export async function deletePrice(form: FormData) {
  const admin = await requireAdmin();
  const model = String(form.get('model') ?? '');
  await db().query('DELETE FROM public.ai_model_prices WHERE model=$1', [model]);
  await audit(admin.id, 'admin.ai_price.delete:' + model);
  revalidatePath('/admin/costs');
}
export async function saveBudget(form: FormData) {
  const admin = await requireAdmin();
  const rate = num(form.get('rate'), 1000), cap = num(form.get('cap'), 100000000), alert = num(form.get('alert'), 100);
  if (rate !== null && rate < 1) throw new Error('Exchange rate must be at least 1.');
  await db().query('UPDATE public.ai_budget SET usd_bdt_rate=$1,monthly_cap_bdt=$2,alert_percent=COALESCE($3,80),updated_by=$4,updated_at=now() WHERE id=true',
    [rate, cap === null ? null : Math.round(cap), alert === null ? null : Math.max(1, Math.round(alert)), admin.id]);
  await audit(admin.id, 'admin.ai_budget.save');
  revalidatePath('/admin/costs');
}
export async function saveFlag(form: FormData) {
  const admin = await requireAdmin();
  const key = String(form.get('key') ?? '').trim();
  if (!/^[a-z][a-z0-9_]{1,59}$/.test(key)) throw new Error('Key: lowercase letters, numbers and underscores, 2–60 characters.');
  await db().query(`INSERT INTO public.feature_flags(key,description,enabled,updated_by) VALUES($1,$2,$3,$4)
    ON CONFLICT(key) DO UPDATE SET description=CASE WHEN $2='' THEN public.feature_flags.description ELSE $2 END,enabled=$3,updated_by=$4,updated_at=now()`,
    [key, String(form.get('description') ?? '').slice(0, 200), form.get('enabled') === 'on' || form.get('enabled') === 'true', admin.id]);
  await audit(admin.id, 'admin.flag.save:' + key);
  revalidatePath('/admin/flags');
}

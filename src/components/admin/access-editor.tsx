'use client';
import { field, labelText } from './form-classes';
import type { Amount, Pick, PlanAccess } from '@/lib/plan-access';

export type Option = { value: string; label: string };
const seg = 'inline-flex rounded-lg border border-line p-0.5';
const segBtn = (on: boolean) => 'h-7 cursor-pointer rounded-md border-0 px-3 text-[12px] font-medium ' + (on ? 'bg-ink text-bg' : 'bg-transparent text-muted hover:text-ink');

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-t border-line py-3 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><span className="text-[13px] font-medium text-ink">{title}</span>{hint && <span className="ml-2 text-[12px] text-muted">{hint}</span>}</div>
        {children}
      </div>
    </div>
  );
}
// Off, a number, or everything.
function AmountRow({ title, hint, value, onChange }: { title: string; hint?: string; value: Amount; onChange: (a: Amount) => void }) {
  return (
    <Row title={title} hint={hint}>
      <div className="flex items-center gap-2">
        {value.mode === 'count' && <input className={field + ' !h-8 !w-20'} type="number" min={1} max={10000} value={value.count} aria-label={title + ' count'} onChange={e => onChange({ mode: 'count', count: Math.max(1, Number(e.target.value) || 1) })} />}
        <div className={seg} role="group" aria-label={title}>
          <button type="button" className={segBtn(value.mode === 'off')} onClick={() => onChange({ mode: 'off' })}>Off</button>
          <button type="button" className={segBtn(value.mode === 'count')} onClick={() => onChange({ mode: 'count', count: value.mode === 'count' ? value.count : 5 })}>Number</button>
          <button type="button" className={segBtn(value.mode === 'all')} onClick={() => onChange({ mode: 'all' })}>All</button>
        </div>
      </div>
    </Row>
  );
}
function ToggleRow({ title, hint, value, onChange }: { title: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row title={title} hint={hint}>
      <div className={seg} role="group" aria-label={title}>
        <button type="button" className={segBtn(!value)} onClick={() => onChange(false)}>Off</button>
        <button type="button" className={segBtn(value)} onClick={() => onChange(true)}>Included</button>
      </div>
    </Row>
  );
}
// Off, everything, or chosen items.
function PickRow({ title, hint, options, value, onChange }: { title: string; hint?: string; options: Option[]; value: Pick; onChange: (p: Pick) => void }) {
  const chosen = value.mode === 'some' ? value.items : [];
  const toggle = (v: string) => {
    const next = chosen.includes(v) ? chosen.filter(x => x !== v) : [...chosen, v];
    onChange(next.length ? { mode: 'some', items: next } : { mode: 'off' });
  };
  return (
    <div className="border-t border-line first:border-t-0">
      <Row title={title} hint={hint}>
        <div className={seg} role="group" aria-label={title}>
          <button type="button" className={segBtn(value.mode === 'off')} onClick={() => onChange({ mode: 'off' })}>Off</button>
          <button type="button" className={segBtn(value.mode === 'some')} disabled={!options.length} onClick={() => onChange({ mode: 'some', items: chosen.length ? chosen : options.slice(0, 1).map(o => o.value) })}>Choose</button>
          <button type="button" className={segBtn(value.mode === 'all')} onClick={() => onChange({ mode: 'all' })}>All</button>
        </div>
      </Row>
      {value.mode === 'some' && (
        <div className="flex flex-wrap gap-1.5 pb-3">
          {options.map(o => (
            <label key={o.value} className={'cursor-pointer rounded-lg border px-2.5 py-1 text-[12px] ' + (chosen.includes(o.value) ? 'border-ink bg-soft text-ink' : 'border-line text-muted')}>
              <input type="checkbox" className="sr-only" checked={chosen.includes(o.value)} onChange={() => toggle(o.value)} />{o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function AccessEditor({ value, onChange, cambridge, moreBooks }: { value: PlanAccess; onChange: (a: PlanAccess) => void; cambridge: Option[]; moreBooks: Option[] }) {
  const set = <K extends keyof PlanAccess>(k: K, v: PlanAccess[K]) => onChange({ ...value, [k]: v });
  return (
    <fieldset className="m-0 min-w-0 rounded-xl border border-line px-4 py-1">
      <legend className={labelText + ' px-1'}>What the plan unlocks</legend>
      <AmountRow title="Recent Tests" hint="Number = how many different tests" value={value.recent} onChange={v => set('recent', v)} />
      <PickRow title="Cambridge" hint="Applies to books marked Premium" options={cambridge} value={value.cambridge} onChange={v => set('cambridge', v)} />
      <PickRow title="More Books" hint="Volumes" options={moreBooks} value={value.moreBooks} onChange={v => set('moreBooks', v)} />
      <ToggleRow title="Cue cards" value={value.cueCards} onChange={v => set('cueCards', v)} />
      <AmountRow title="Writing samples" hint="Premium samples" value={value.writingSamples} onChange={v => set('writingSamples', v)} />
      <AmountRow title="Vocabulary" hint="Premium words" value={value.vocabulary} onChange={v => set('vocabulary', v)} />
      <ToggleRow title="E-book shelf" value={value.ebooks} onChange={v => set('ebooks', v)} />
      <ToggleRow title="Grammar" value={value.grammar} onChange={v => set('grammar', v)} />
    </fieldset>
  );
}

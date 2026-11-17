"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { WorkspaceHeading } from "@/components/page-parts";

type Usage = { label: string; collection: string; module: string; location: string; editHref?: string };
type Asset = { url: string; kind: "audio" | "image"; ext: string; host: string; usages: Usage[]; attempts: number; migrated: null | { assetId: string; newUrl: string } };
type Migrated = { sourceUrl: string; assetId: string; newUrl: string; contentType: string; bytes: number; migratedAt: string; replaced: Record<string, number> };
type Row = { state: "idle" | "running" | "done" | "error"; message?: string; newUrl?: string };
const PAGE = 40;

const shortName = (url: string) => url.startsWith("data:") ? "Inline base64 image" : decodeURIComponent(url.split("?")[0].split("/").pop() || url);
const mb = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";

function Preview({ kind, url }: { kind: string; url: string }) {
  if (kind === "image") return <a href={url.startsWith("data:") ? undefined : url} target="_blank" rel="noreferrer"><img src={url} alt="" loading="lazy" style={{ width: 120, maxHeight: 90, objectFit: "contain", background: "var(--adm-bg)", border: "1px solid var(--adm-line)", borderRadius: 4 }} /></a>;
  return <audio controls preload="none" src={url} style={{ width: 220, height: 34 }} />;
}

export function AdminAssetMigration() {
  const [assets, setAssets] = useState<Asset[]>([]), [migrated, setMigrated] = useState<Migrated[]>([]), [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [q, setQ] = useState(""), [host, setHost] = useState("all"), [kind, setKind] = useState("all"), [collection, setCollection] = useState("all"), [status, setStatus] = useState("pending");
  const [shown, setShown] = useState(PAGE), [bulk, setBulk] = useState<{ total: number; done: number; failed: number } | null>(null);
  const stop = useRef(false);

  async function scan() {
    setLoading(true); setError("");
    try { const r = await fetch("/api/admin/asset-migration", { cache: "no-store" }), d = await r.json(); if (!r.ok) throw Error(d.error || "Scan failed"); setAssets(d.assets); setMigrated(d.migrated); setConfigured(d.configured); setRows({}); }
    catch (e) { setError(e instanceof Error ? e.message : "Scan failed"); } finally { setLoading(false); }
  }
  useEffect(() => { void scan(); }, []);

  const hosts = useMemo(() => [...new Set(assets.map(a => a.host))].sort(), [assets]);
  const collections = useMemo(() => [...new Set(assets.flatMap(a => a.usages.map(u => u.collection)))].sort(), [assets]);
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return assets.filter(a => (host === "all" || a.host === host) && (kind === "all" || a.kind === kind)
      && (collection === "all" || a.usages.some(u => u.collection === collection))
      && (status === "all" || (status === "pending" ? rows[a.url]?.state !== "done" : status === "failed" ? rows[a.url]?.state === "error" : rows[a.url]?.state === "done"))
      && (!needle || (!a.url.startsWith("data:") && a.url.toLowerCase().includes(needle)) || a.usages.some(u => (u.label + " " + u.location + " " + u.module).toLowerCase().includes(needle))));
  }, [assets, rows, q, host, kind, collection, status]);
  const counts = useMemo(() => ({ audio: assets.filter(a => a.kind === "audio").length, image: assets.filter(a => a.kind === "image").length, places: assets.reduce((n, a) => n + a.usages.length, 0), done: Object.values(rows).filter(r => r.state === "done").length }), [assets, rows]);

  async function migrate(url: string) {
    setRows(r => ({ ...r, [url]: { state: "running" } }));
    try {
      const r = await fetch("/api/admin/asset-migration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }), d = await r.json();
      if (!r.ok) throw Error(d.error || "Migration failed");
      const p = d.replaced || {};
      setRows(x => ({ ...x, [url]: { state: "done", newUrl: d.newUrl, message: `${p.links || 0} link(s) replaced · ${p.modules || 0} module(s), ${p.mocks || 0} mock(s), ${p.attempts || 0} attempt(s)${p.conflicts ? ` · ${p.conflicts} skipped (edited meanwhile, run again)` : ""}${d.bytes ? " · " + mb(d.bytes) : ""}` } }));
      return true;
    } catch (e) { setRows(x => ({ ...x, [url]: { state: "error", message: e instanceof Error ? e.message : "Migration failed" } })); return false; }
  }
  async function migrateAll() {
    const queue = visible.filter(a => rows[a.url]?.state !== "done").map(a => a.url);
    if (!queue.length) return;
    stop.current = false; const progress = { total: queue.length, done: 0, failed: 0 }; setBulk({ ...progress });
    const worker = async () => { while (queue.length && !stop.current) { const url = queue.shift()!; const ok = await migrate(url); ok ? progress.done++ : progress.failed++; setBulk({ ...progress }); } };
    await Promise.all([worker(), worker()]);
    setBulk(b => b && { ...b, total: progress.done + progress.failed });
  }
  const running = Boolean(bulk && bulk.done + bulk.failed < bulk.total);

  return <div className="admin-refactor">
    <WorkspaceHeading eyebrow="MEDIA / MIGRATION" title="Asset migration" description="Audio and images that tests still load from other websites. Migrating copies the file into our Cloudflare R2 bucket and replaces every link to it automatically." />
    {!configured && <p className="adm-callout" role="alert">R2 storage is not configured, so nothing can be migrated yet.</p>}
    {error && <p className="adm-callout" role="alert">{error}</p>}
    <p className="adm-inline-stats">{loading ? "Scanning tests…" : <>
      <strong>{assets.length} external files</strong><span>{counts.audio} audio · {counts.image} images</span><span>used in {counts.places} places</span>
      <span>{migrated.length} already in our bucket</span>{counts.done > 0 && <span>{counts.done} migrated this session</span>}</>}</p>

    <section className="workspace-panel" style={{ padding: 18 }}>
      <div className="adm-content-filters" style={{ gridTemplateColumns: "minmax(180px,1.4fr) repeat(4,minmax(120px,1fr))" }}>
        <label><span>Search file, test or field</span><div className="adm-search-input"><Search size={16} /><input type="search" value={q} maxLength={200} placeholder="e.g. Cambridge 18, audio_url, engnovate…" onChange={e => { setQ(e.target.value); setShown(PAGE); }} /></div></label>
        <label><span>Host</span><select value={host} onChange={e => { setHost(e.target.value); setShown(PAGE); }}><option value="all">All hosts</option>{hosts.map(h => <option key={h} value={h}>{h}</option>)}</select></label>
        <label><span>Type</span><select value={kind} onChange={e => { setKind(e.target.value); setShown(PAGE); }}><option value="all">Audio + images</option><option value="audio">Audio</option><option value="image">Images</option></select></label>
        <label><span>Collection</span><select value={collection} onChange={e => { setCollection(e.target.value); setShown(PAGE); }}><option value="all">All collections</option>{collections.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        <label><span>Status</span><select value={status} onChange={e => { setStatus(e.target.value); setShown(PAGE); }}><option value="pending">Not migrated</option><option value="failed">Failed</option><option value="done">Migrated now</option><option value="all">All</option></select></label>
      </div>
      <div className="adm-section-actions" style={{ marginTop: 0 }}>
        <span className="adm-note">{visible.length} file(s) match</span>
        <span style={{ display: "flex", gap: 8 }}>
          <button type="button" className="adm-text-action" disabled={loading || running} onClick={() => void scan()}>Rescan</button>
          {running ? <button type="button" className="adm-text-action" onClick={() => { stop.current = true; }}>Stop after current</button>
            : <button type="button" className="button" disabled={loading || !configured || !visible.some(a => rows[a.url]?.state !== "done")} onClick={() => void migrateAll()}>Migrate {visible.filter(a => rows[a.url]?.state !== "done").length} shown</button>}
        </span>
      </div>
      {bulk && <div className="adm-meter" role="status"><div><strong>{bulk.done + bulk.failed}</strong> of {bulk.total}</div><progress max={bulk.total || 1} value={bulk.done + bulk.failed} data-warn={bulk.failed ? "true" : undefined} /><span>{bulk.done} done · {bulk.failed} failed{running ? "" : " · finished"}</span></div>}

      <div className="table-scroll"><table className="adm-data-table"><thead><tr><th>Preview</th><th>File &amp; current link</th><th>Used in</th><th>Migration</th></tr></thead><tbody>
        {visible.slice(0, shown).map(a => { const row = rows[a.url]; return <tr key={a.url}>
          <td><Preview kind={a.kind} url={row?.newUrl || a.url} /></td>
          <td style={{ maxWidth: 320, overflowWrap: "anywhere" }}><strong>{shortName(a.url)}</strong><small>{a.kind} · {a.ext || "?"} · {a.host}</small>
            {!a.url.startsWith("data:") && <small><a href={a.url} target="_blank" rel="noreferrer">{a.url}</a></small>}
            {row?.newUrl && <small>→ <a href={row.newUrl} target="_blank" rel="noreferrer">{row.newUrl}</a></small>}</td>
          <td style={{ minWidth: 260 }}><UsageList usages={a.usages} />{a.attempts > 0 && <small>Also copied in {a.attempts} saved learner attempt(s)</small>}</td>
          <td style={{ minWidth: 170 }}>{row?.state === "running" ? <span className="adm-state">Migrating…</span>
            : row?.state === "done" ? <><span className="adm-state">Migrated</span><small>{row.message}</small></>
            : <><button type="button" className="adm-text-action" disabled={!configured || running} onClick={() => void migrate(a.url)}>{row?.state === "error" ? "Retry" : "Migrate"}</button>
              {a.migrated && <small>Copy exists in bucket; links still pending</small>}{row?.state === "error" && <small role="alert" style={{ color: "#b91c1c" }}>{row.message}</small>}</>}</td>
        </tr>; })}
        {!loading && !visible.length && <tr><td colSpan={4}>{assets.length ? "No files match these filters." : "Every test asset is already in our bucket."}</td></tr>}
      </tbody></table></div>
      {visible.length > shown && <p style={{ textAlign: "center" }}><button type="button" className="adm-text-action" onClick={() => setShown(s => s + PAGE * 2)}>Show more ({visible.length - shown} left)</button></p>}
    </section>

    <section className="workspace-panel" style={{ padding: 18 }}><h2>Already in our bucket ({migrated.length})</h2>
      <div className="table-scroll"><table className="adm-data-table"><thead><tr><th>Preview</th><th>Original link</th><th>Our link</th><th>Size</th><th>Replaced</th></tr></thead><tbody>
        {migrated.slice(0, 100).map(m => <tr key={m.sourceUrl}>
          <td><Preview kind={m.contentType.startsWith("audio/") ? "audio" : "image"} url={m.newUrl} /></td>
          <td style={{ maxWidth: 300, overflowWrap: "anywhere" }}>{m.sourceUrl.startsWith("inline:") ? "Inline base64 image" : <a href={m.sourceUrl} target="_blank" rel="noreferrer">{m.sourceUrl}</a>}<small>{new Date(m.migratedAt).toLocaleString()}</small></td>
          <td style={{ maxWidth: 260, overflowWrap: "anywhere" }}><a href={m.newUrl} target="_blank" rel="noreferrer">{m.newUrl}</a></td>
          <td>{mb(m.bytes)}<small>{m.contentType}</small></td>
          <td>{m.replaced.links ?? 0} link(s)<small>{m.replaced.modules ?? 0} module · {m.replaced.mocks ?? 0} mock · {m.replaced.attempts ?? 0} attempt</small></td>
        </tr>)}
        {!migrated.length && <tr><td colSpan={5}>Nothing migrated yet.</td></tr>}
      </tbody></table></div>{migrated.length > 100 && <p className="adm-note">Showing the latest 100.</p>}
    </section>
  </div>;
}

function UsageList({ usages }: { usages: Usage[] }) {
  const [open, setOpen] = useState(false);
  const list = open ? usages : usages.slice(0, 3);
  return <>{list.map((u, i) => <small key={i} style={{ marginTop: i ? 4 : 0 }}>
    {u.editHref ? <Link href={u.editHref}>{u.label}</Link> : u.label} · <span style={{ textTransform: "capitalize" }}>{u.module}</span> · {u.location}<br /><span style={{ opacity: .75 }}>{u.collection}</span></small>)}
    {usages.length > 3 && <button type="button" className="adm-text-action" style={{ marginTop: 6, padding: "4px 8px" }} onClick={() => setOpen(o => !o)}>{open ? "Show less" : `+${usages.length - 3} more`}</button>}
    {!usages.length && <small>Only in saved attempts</small>}</>;
}

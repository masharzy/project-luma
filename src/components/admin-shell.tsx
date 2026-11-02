'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Menu, X, Search, Sun, Moon, Monitor, ExternalLink } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { SignOut } from '@/components/sign-out';
import { adminNavigation, adminLinkActive, adminPageLabel, type AdminTheme } from '@/lib/admin/navigation';

function Navigation({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  const [query, setQuery] = useState('');
  const id = useId();
  const search = query.trim().toLocaleLowerCase();
  const groups = adminNavigation.map(group => ({ ...group, links: group.links.filter(link => !search || `${link.label} ${link.keywords ?? ''}`.toLocaleLowerCase().includes(search)) })).filter(group => group.links.length);
  return <>
    <label className="adm-menu-search" htmlFor={id}><Search size={15} aria-hidden="true" /><input id={id} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a section…" aria-label="Search admin menu" /></label>
    <nav className="adm-navigation" aria-label="Administration">
      {groups.map(group => <section key={group.label} className="adm-nav-group" aria-label={group.label}><h2>{group.label}</h2>{group.links.map(link => <Link href={link.href} key={link.href} aria-current={adminLinkActive(path,link.href)?'page':undefined} onClick={()=>{setQuery('');onNavigate?.();}}><Icon name={link.icon} size={16} /><span>{link.label}</span></Link>)}</section>)}
      {!groups.length && <p className="adm-menu-empty" role="status">No matching section. <button type="button" onClick={()=>setQuery('')}>Clear search</button></p>}
    </nav>
  </>;
}
export function AdminShell({ children, name, initialTheme }: { children: React.ReactNode; name: string; initialTheme: AdminTheme }) {
  const path = usePathname();
  const [theme, setTheme] = useState<AdminTheme>(initialTheme);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const drawerId = useId();
  useEffect(() => {
    const node=dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
  }, [open]);
  function chooseTheme(value: AdminTheme) {
    setTheme(value);
    document.cookie=`jtn_admin_theme=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
  }
  return <div className="admin-app" data-theme={theme}>
    <aside className="adm-sidebar" aria-label="Admin sidebar"><Link className="adm-brand" href="/admin">JumpToNine <span>Admin</span></Link><Navigation path={path} /><div className="adm-sidebar-bottom"><Link href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" />View website</Link><Link href="/dashboard">Learner dashboard</Link></div></aside>
    <div className="adm-main"><header className="adm-topbar">
      <button type="button" className="adm-menu-button" aria-label="Open admin menu" aria-controls={drawerId} aria-expanded={open} onClick={()=>setOpen(true)}><Menu size={19} aria-hidden="true" /></button>
      <div className="adm-context"><span>Admin</span><span aria-hidden="true">/</span><strong>{adminPageLabel(path)}</strong></div>
      <div className="adm-topbar-actions"><div className="adm-theme" role="group" aria-label="Admin color theme">{([
        ['light','Light',Sun],['dark','Dark',Moon],['system','System',Monitor],
      ] as const).map(([value,label,ThemeIcon])=><button key={value} type="button" aria-label={label+' mode'} title={label+' mode'} aria-pressed={theme===value} onClick={()=>chooseTheme(value)}><ThemeIcon size={16} aria-hidden="true" /></button>)}</div><span className="adm-account" title={name}>{name}</span><SignOut /></div>
    </header><div className="adm-content" id="admin-content">{children}</div></div>
    <dialog ref={dialog} id={drawerId} className="adm-drawer" aria-labelledby={drawerId+'-title'} onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right)setOpen(false);}}}>
      <div className="adm-drawer-heading"><strong id={drawerId+'-title'}>Administration</strong><button type="button" aria-label="Close admin menu" onClick={()=>setOpen(false)}><X size={19} aria-hidden="true" /></button></div><Navigation path={path} onNavigate={()=>setOpen(false)} /><div className="adm-sidebar-bottom"><Link href="/" onClick={()=>setOpen(false)}>View website</Link></div>
    </dialog>
  </div>;
}

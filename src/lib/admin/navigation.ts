export type AdminLink = { href: string; label: string; icon: 'grid'|'book'|'file'|'clock'|'pen'|'chart'|'users'|'shield'|'settings'; keywords?: string };
export const adminNavigation: { label: string; links: AdminLink[] }[] = [
  { label: 'Workspace', links: [{ href: '/admin', label: 'Overview', icon: 'grid' }] },
  { label: 'Tests & content', links: [
    { href: '/admin/cambridge', label: 'Cambridge', icon: 'book' },
    { href: '/admin/other-books', label: 'More Books', icon: 'book', keywords: 'series volumes collins barrons' },
    { href: '/admin/recent-tests', label: 'Recent Tests', icon: 'file', keywords: 'questions modules full tests' },
    { href: '/admin/mocks', label: 'Mock exams', icon: 'clock', keywords: 'schedule registrations candidates' },
    { href: '/admin/speaking-tests', label: 'Speaking tests', icon: 'file', keywords: 'question bank cue cards parts' },
    { href: '/admin/resources', label: 'Learning resources', icon: 'pen', keywords: 'writing samples grammar ebooks journal articles' },
    { href: '/admin/vocabulary', label: 'Vocabulary', icon: 'book' },
  ] },
  { label: 'People & access', links: [
    { href: '/admin/users', label: 'Users', icon: 'users', keywords: 'accounts roles verify block access' },
    { href: '/admin/subscriptions', label: 'Plans', icon: 'chart', keywords: 'pricing credits membership free allowances subscriptions requests payments export' },
    { href: '/admin/coupons', label: 'Coupon codes', icon: 'file', keywords: 'discount promo offer code percent' },
  ] },
  { label: 'Operations', links: [
    { href: '/admin/results', label: 'Results & publishing', icon: 'chart', keywords: 'review releases mocks' },
    { href: '/admin/ai-operations', label: 'AI job monitor', icon: 'chart', keywords: 'writing speaking queues errors evaluation' },
    { href: '/admin/import', label: 'Import tests', icon: 'file', keywords: 'json duplicates bulk upload' },
    { href: '/admin/media', label: 'Media library', icon: 'file', keywords: 'audio image cloudflare storage r2' },
    { href: '/admin/activity', label: 'Activity log', icon: 'clock', keywords: 'audit security history' },
    { href: '/admin/costs', label: 'Cost & usage', icon: 'chart', keywords: 'spend budget bdt tokens audio margin pricing model prices' },
    { href: '/admin/ai-lab', label: 'AI configuration & lab', icon: 'settings', keywords: 'providers models keys benchmark evaluation' },
    { href: '/admin/flags', label: 'Feature flags', icon: 'settings', keywords: 'toggle rollout switches' },
    { href: '/admin/settings', label: 'Platform settings', icon: 'settings', keywords: 'status services account' },
  ] },
];
export function adminLinkActive(path: string, href: string) { return path === href || href !== '/admin' && path.startsWith(href + '/'); }
export function adminPageLabel(path: string) {
  return adminNavigation.flatMap(g => g.links).find(l => adminLinkActive(path,l.href))?.label
    ?? (path.startsWith('/admin/engine/') ? 'Question editor' : 'Administration');
}
export type AdminTheme = 'light'|'dark'|'system';
export function adminTheme(value: unknown): AdminTheme { return value === 'light' || value === 'dark' ? value : 'system'; }

// Pure rules for per-account content grants (no database access).
export const grantScopes = ['all_premium','cambridge_book','cambridge_test','recent_all','recent_test','more_books_all','more_books_volume','more_books_test'] as const;
export type GrantScope = typeof grantScopes[number];
export type ContentGrant = { scope: GrantScope; ref: string | null };
export type TestPlace = { kind: 'cambridge' | 'practice'; id: string; book?: string | null };
// book: Cambridge book number for cambridge tests; book slug for More Books tests; empty for Recent Tests.
export function grantCovers(grants: ContentGrant[], t: TestPlace) {
  return grants.some(g => {
    if (g.scope === 'all_premium') return true;
    if (t.kind === 'cambridge') return (g.scope === 'cambridge_test' && g.ref === t.id) || (g.scope === 'cambridge_book' && !!t.book && g.ref === t.book);
    if (!t.book) return g.scope === 'recent_all' || (g.scope === 'recent_test' && g.ref === t.id);
    return g.scope === 'more_books_all' || (g.scope === 'more_books_volume' && g.ref === t.book) || (g.scope === 'more_books_test' && g.ref === t.id);
  });
}
export const grantScopeLabels: Record<GrantScope, string> = {
  all_premium: 'All premium content',
  cambridge_book: 'Cambridge book',
  cambridge_test: 'Cambridge test',
  recent_all: 'All Recent Tests',
  recent_test: 'One Recent Test',
  more_books_all: 'All More Books',
  more_books_volume: 'One More Books volume',
  more_books_test: 'One More Books test',
};

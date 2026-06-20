/**
 * Search groups — sets of tests that are almost always ordered together, so typing one
 * keyword (e.g. "BIL") surfaces a single dropdown row that adds them all in one tap,
 * instead of forcing the operator to pick Total, Direct and Indirect one at a time.
 *
 * These are a search-time convenience only: each member is still added as its own order,
 * so it keeps its own result row and report line (and its own price). They are NOT billing
 * bundles — for a one-line panel that expands on save, use a panel test with is_panel=1.
 */
export interface TestGroup {
  /** Synthetic key for React lists. Prefixed so it never collides with a numeric test id. */
  id: string;
  /** What the dropdown row shows. */
  label: string;
  /** Uppercased prefixes that surface this group (matched against the typed query). */
  keywords: string[];
  /** Member test codes, in the order they should be added. */
  codes: string[];
}

export const TEST_GROUPS: TestGroup[] = [
  {
    id: 'grp:bilirubin',
    label: 'Bilirubin — Total + Direct + Indirect',
    keywords: ['BIL', 'BILI', 'BILIRUBIN', 'BB'],
    codes: ['BBT', 'BBD', 'BBI'],
  },
];

/**
 * Groups the query plausibly refers to: any keyword the query is a prefix of, or that is a
 * prefix of the query. Case-insensitive. Returns [] for an empty query.
 */
export function matchTestGroups(query: string): TestGroup[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  return TEST_GROUPS.filter(g =>
    g.keywords.some(k => k.startsWith(q) || q.startsWith(k))
  );
}

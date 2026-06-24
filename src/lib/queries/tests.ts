import { dbQuery, dbExecute } from '@/lib/db';
import { Test, TestRange, Panel } from '@/types';
import { assertCan, currentUserId } from '@/lib/session';
import { writeAudit } from './audit';

export async function listPanels(): Promise<Panel[]> {
  return dbQuery<Panel>('SELECT * FROM panels ORDER BY sort_order');
}

// ── Panel management (admin-only via manage_panels) ──────────────────────────
// Panels are the report-grouping + orderable-profile unit. These let an admin create,
// edit, reorder and delete panels from the UI (previously only possible via migrations).

/** Create a panel. Auto-generates a unique code from the name when none is given
 *  (mirrors createPanelTest's slug+timestamp scheme). Returns the new panel id. */
export async function createPanel(input: {
  code?: string; name: string; report_heading?: string;
  sort_order?: number; page_break_after?: number;
}): Promise<number> {
  assertCan('manage_panels');
  const name = input.name.trim();
  if (!name) throw new Error('Panel name is required.');

  let code = (input.code ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (code) {
    const clash = await dbQuery<{ id: number }>('SELECT id FROM panels WHERE code=?', [code]);
    if (clash.length) throw new Error(`A panel with code "${code}" already exists.`);
  } else {
    const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 16) || 'PANEL';
    code = `${slug}_${Date.now().toString(36).toUpperCase()}`;
  }

  const heading = input.report_heading?.trim() || name.toUpperCase();
  const maxRows = await dbQuery<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM panels');
  const sortOrder = input.sort_order ?? (maxRows[0]?.m ?? 0) + 10;
  const pageBreak = input.page_break_after ? 1 : 0;

  const id = await dbExecute(
    `INSERT INTO panels(code,name,report_heading,sort_order,page_break_after) VALUES(?,?,?,?,?)`,
    [code, name, heading, sortOrder, pageBreak]
  );
  await writeAudit(currentUserId(), 'panel.create', 'panels', id, null, { code, name, report_heading: heading });
  return id;
}

/** Edit a panel's display fields. `code` is intentionally immutable — it's the join key
 *  used by the report DEPARTMENT map, the rail filter and listTests(panelCode). */
export async function updatePanel(id: number, fields: {
  name?: string; report_heading?: string; sort_order?: number; page_break_after?: number;
}): Promise<void> {
  assertCan('manage_panels');
  const rows = await dbQuery<Panel>('SELECT * FROM panels WHERE id=?', [id]);
  const cur = rows[0];
  if (!cur) throw new Error('Panel not found.');
  const name = (fields.name ?? cur.name).trim();
  if (!name) throw new Error('Panel name is required.');
  const heading = (fields.report_heading ?? cur.report_heading).trim() || name.toUpperCase();
  const sortOrder = fields.sort_order ?? cur.sort_order;
  const pageBreak = (fields.page_break_after ?? cur.page_break_after) ? 1 : 0;
  await dbExecute(
    `UPDATE panels SET name=?, report_heading=?, sort_order=?, page_break_after=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [name, heading, sortOrder, pageBreak, id]
  );
  await writeAudit(currentUserId(), 'panel.update', 'panels', id,
    { name: cur.name, report_heading: cur.report_heading, sort_order: cur.sort_order, page_break_after: cur.page_break_after },
    { name, report_heading: heading, sort_order: sortOrder, page_break_after: pageBreak });
}

/** Delete a panel. tests.panel_id is ON DELETE RESTRICT, so we block while real member
 *  tests remain (the admin must remove/reassign them first). The is_panel=1 "profile"
 *  row is owned by the panel and is removed automatically — unless it has historical
 *  orders (orders.test_id is also RESTRICT), in which case deletion is refused. */
export async function deletePanel(id: number): Promise<void> {
  assertCan('manage_panels');
  const members = await dbQuery<{ id: number; is_panel: number }>(
    'SELECT id, is_panel FROM tests WHERE panel_id=?', [id]);
  const realMembers = members.filter(m => !m.is_panel);
  if (realMembers.length > 0) {
    throw new Error(`This panel has ${realMembers.length} test${realMembers.length === 1 ? '' : 's'}. Remove or reassign them before deleting the panel.`);
  }
  const bundle = members.find(m => m.is_panel);
  if (bundle) {
    const ords = await dbQuery<{ n: number }>('SELECT COUNT(*) AS n FROM orders WHERE test_id=?', [bundle.id]);
    if ((ords[0]?.n ?? 0) > 0) {
      throw new Error('This panel has been ordered before, so it cannot be deleted. Turn off "orderable as one profile" to retire it instead.');
    }
    await dbExecute('DELETE FROM tests WHERE id=?', [bundle.id]);
  }
  await dbExecute('DELETE FROM panels WHERE id=?', [id]);
  await writeAudit(currentUserId(), 'panel.delete', 'panels', id, null, null);
}

/** Persist a new panel order (sort_order 10,20,30…) — mirrors reorderPanelTests. */
export async function reorderPanels(orderedIds: number[]): Promise<void> {
  assertCan('manage_panels');
  for (let i = 0; i < orderedIds.length; i++) {
    await dbExecute('UPDATE panels SET sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [(i + 1) * 10, orderedIds[i]]);
  }
}

/** Make a panel orderable as a single billed "profile" line (like CBC / HbA1c) by
 *  creating/enabling its is_panel=1 bundle test, or disable it (kept, not deleted, so
 *  historical orders stay intact). createPatient() expands the bundle into its members. */
export async function setPanelOrderable(
  panelId: number, input: { orderable: boolean; price?: number; name?: string }
): Promise<void> {
  assertCan('manage_panels');
  const panels = await dbQuery<Panel>('SELECT * FROM panels WHERE id=?', [panelId]);
  const panel = panels[0];
  if (!panel) throw new Error('Panel not found.');
  const existing = await dbQuery<{ id: number }>(
    'SELECT id FROM tests WHERE panel_id=? AND is_panel=1 LIMIT 1', [panelId]);
  const price = Math.max(0, Number(input.price ?? 0) || 0);
  const name = input.name?.trim() || panel.name;

  if (input.orderable) {
    if (existing.length) {
      await dbExecute('UPDATE tests SET name=?, price=?, enabled=1, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [name, price, existing[0].id]);
      await writeAudit(currentUserId(), 'panel.orderable.update', 'tests', existing[0].id, null, { price, name });
    } else {
      // Bundle code: prefer the panel code, then <code>P (the CBC / HBA1CP convention), then a
      // timestamped fallback — whichever is free in the UNIQUE tests.code space.
      let code = panel.code;
      for (const candidate of [panel.code, `${panel.code}P`, `${panel.code}_${Date.now().toString(36).toUpperCase()}`]) {
        const clash = await dbQuery<{ id: number }>('SELECT id FROM tests WHERE code=?', [candidate]);
        if (!clash.length) { code = candidate; break; }
      }
      const id = await dbExecute(
        `INSERT INTO tests(code,name,panel_id,result_type,unit,decimals,price,enabled,sort_order,is_panel)
         VALUES(?,?,?,?,?,?,?,?,?,?)`,
        [code, name, panelId, 'text', '', 0, price, 1, 0, 1]
      );
      await writeAudit(currentUserId(), 'panel.orderable.create', 'tests', id, null, { code, price, name });
    }
  } else if (existing.length) {
    await dbExecute('UPDATE tests SET enabled=0, updated_at=CURRENT_TIMESTAMP WHERE id=?', [existing[0].id]);
    await writeAudit(currentUserId(), 'panel.orderable.disable', 'tests', existing[0].id, null, null);
  }
}

/** Move an existing test into a panel (appended to the end) or unlink it (panelId=null).
 *  Used by the panel editor's "add existing test" / "remove from panel" actions. */
export async function reassignTestPanel(testId: number, panelId: number | null): Promise<void> {
  assertCan('manage_panels');
  if (panelId != null) {
    const maxRows = await dbQuery<{ m: number | null }>(
      'SELECT MAX(sort_order) AS m FROM tests WHERE panel_id=?', [panelId]);
    const sortOrder = (maxRows[0]?.m ?? 0) + 10;
    await dbExecute('UPDATE tests SET panel_id=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [panelId, sortOrder, testId]);
  } else {
    await dbExecute('UPDATE tests SET panel_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?', [testId]);
  }
  await writeAudit(currentUserId(), 'test.reassign_panel', 'tests', testId, null, { panel_id: panelId });
}

export async function listTests(panelCode?: string, enabledOnly = true): Promise<Test[]> {
  let sql = `SELECT t.*, p.code as panel_code, p.report_heading as panel_heading
             FROM tests t LEFT JOIN panels p ON t.panel_id=p.id`;
  const params: unknown[] = [];
  const where: string[] = [];
  if (enabledOnly) where.push('t.enabled=1');
  if (panelCode) { where.push('p.code=?'); params.push(panelCode); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY p.sort_order, t.sort_order, t.name';
  return dbQuery<Test>(sql, params);
}

export async function searchTests(query: string): Promise<Test[]> {
  // An exact code-prefix match wins first, then the sellable PROFILE (is_panel=1) outranks its own
  // member tests, then frequently-ordered tests float up — so typing "CB" surfaces CBC and "HBA1C"
  // surfaces the HbA1c profile at #1 (not the bare HbA1c row, whose code "HBA1C" is a prefix of the
  // bundle "HBA1CP" and would otherwise sort above it). Counter speed: the profile is the obvious pick.
  const sql = `SELECT t.*, p.code as panel_code, p.report_heading as panel_heading
               FROM tests t LEFT JOIN panels p ON t.panel_id=p.id
               WHERE t.enabled=1 AND (t.code LIKE ? OR t.name LIKE ?)
               ORDER BY (CASE WHEN t.code LIKE ? THEN 0 ELSE 1 END),
                        t.is_panel DESC,
                        (SELECT COUNT(*) FROM orders o WHERE o.test_id=t.id) DESC,
                        t.code
               LIMIT 30`;
  return dbQuery<Test>(sql, [`${query}%`, `%${query}%`, `${query}%`]);
}

/** Resolve a fixed set of test codes to their (enabled) Test rows — used to expand a
 *  search group into its members. Returned in the same order as `codes`. */
export async function getTestsByCodes(codes: string[]): Promise<Test[]> {
  if (!codes.length) return [];
  const placeholders = codes.map(() => '?').join(',');
  const rows = await dbQuery<Test>(
    `SELECT t.*, p.code as panel_code, p.report_heading as panel_heading
     FROM tests t LEFT JOIN panels p ON t.panel_id=p.id
     WHERE t.enabled=1 AND t.code IN (${placeholders})`,
    codes
  );
  // SQL IN(...) doesn't preserve argument order — re-sort to the caller's code order.
  const order = new Map(codes.map((c, i) => [c, i]));
  return rows.sort((a, b) => (order.get(a.code) ?? 0) - (order.get(b.code) ?? 0));
}

/** Most-ordered tests/panels — one-tap chips so the common cases need zero typing. */
export async function getFrequentTests(limit = 10): Promise<Test[]> {
  const sql = `SELECT t.*, p.code as panel_code, p.report_heading as panel_heading,
                      (SELECT COUNT(*) FROM orders o WHERE o.test_id=t.id) as freq
               FROM tests t LEFT JOIN panels p ON t.panel_id=p.id
               WHERE t.enabled=1
               ORDER BY freq DESC, t.name
               LIMIT ?`;
  return dbQuery<Test>(sql, [limit]);
}

export async function getTestRanges(testId: number): Promise<TestRange[]> {
  return dbQuery<TestRange>('SELECT * FROM test_ranges WHERE test_id=? ORDER BY sex,age_min_days', [testId]);
}

export async function getTestsByPanel(): Promise<Record<string, Test[]>> {
  const tests = await listTests();
  const map: Record<string, Test[]> = {};
  for (const t of tests) {
    const key = t.panel_code ?? 'MISC';
    if (!map[key]) map[key] = [];
    map[key].push(t);
  }
  return map;
}

export async function upsertTest(test: Partial<Test> & { code: string; name: string }): Promise<void> {
  assertCan('edit_tests');
  // Clamp to safe bounds so bad input can never crash report rendering (toFixed) or
  // produce negative prices that corrupt billing.
  const decimals = Math.min(10, Math.max(0, Math.trunc(Number(test.decimals ?? 1)) || 0));
  const price = Math.max(0, Number(test.price ?? 0) || 0);
  await dbExecute(
    `INSERT INTO tests(code,name,panel_id,result_type,unit,decimals,price,enabled,sort_order,choices,default_value,formula,interpretation_note,is_panel,needs_review)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(code) DO UPDATE SET
       name=excluded.name, panel_id=excluded.panel_id, result_type=excluded.result_type,
       unit=excluded.unit, decimals=excluded.decimals, price=excluded.price, enabled=excluded.enabled,
       sort_order=excluded.sort_order, choices=excluded.choices, default_value=excluded.default_value,
       formula=excluded.formula, interpretation_note=excluded.interpretation_note,
       is_panel=excluded.is_panel, needs_review=excluded.needs_review,
       updated_at=CURRENT_TIMESTAMP`,
    [test.code, test.name, test.panel_id ?? null, test.result_type ?? 'numeric',
     test.unit ?? '', decimals, price, test.enabled ?? 1,
     test.sort_order ?? 0, test.choices ?? null, test.default_value ?? null,
     test.formula ?? null, test.interpretation_note ?? null, test.is_panel ?? 0,
     test.needs_review ?? 0]
  );
}

export async function updateTestPrice(testId: number, price: number): Promise<void> {
  assertCan('edit_prices');
  const before = await dbQuery<{ price: number }>('SELECT price FROM tests WHERE id=?', [testId]);
  await dbExecute('UPDATE tests SET price=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [price, testId]);
  await writeAudit(currentUserId(), 'test.price', 'tests', testId, { price: before[0]?.price }, { price });
}

export async function setTestEnabled(testId: number, enabled: number): Promise<void> {
  assertCan('edit_tests');
  await dbExecute('UPDATE tests SET enabled=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [enabled, testId]);
  await writeAudit(currentUserId(), 'test.enabled', 'tests', testId, null, { enabled });
}

/** Add a brand-new test (row) to a panel. PERSISTENT: the test becomes a permanent
 *  member of the panel, so every future patient who gets that panel includes it too.
 *  Returns the new test id. */
export async function createPanelTest(input: {
  panelId: number; name: string; unit?: string; decimals?: number;
  low?: number | null; high?: number | null; rangeText?: string;
}): Promise<number> {
  const name = input.name.trim();
  if (!name) throw new Error('Test name is required.');

  // Unique, readable code derived from the name + a short timestamp suffix.
  const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 16) || 'CUSTOM';
  const code = `${slug}_${Date.now().toString(36).toUpperCase()}`;

  // Append to the end of the panel.
  const maxRows = await dbQuery<{ m: number | null }>(
    'SELECT MAX(sort_order) AS m FROM tests WHERE panel_id=?', [input.panelId]);
  const sortOrder = (maxRows[0]?.m ?? 0) + 10;
  const decimals = Math.min(10, Math.max(0, Math.trunc(input.decimals ?? 0)));

  await dbExecute(
    `INSERT INTO tests(code,name,panel_id,result_type,unit,decimals,price,enabled,sort_order,is_panel)
     VALUES(?,?,?,?,?,?,?,?,?,?)`,
    [code, name, input.panelId, 'numeric', input.unit?.trim() ?? '', decimals, 0, 1, sortOrder, 0]
  );
  const rows = await dbQuery<{ id: number }>('SELECT id FROM tests WHERE code=?', [code]);
  const testId = rows[0]?.id ?? 0;

  // Optional normal range.
  const hasRange = input.low != null || input.high != null || (input.rangeText?.trim());
  if (testId && hasRange) {
    const rt = input.rangeText?.trim()
      || (input.low != null && input.high != null ? `${input.low} - ${input.high}`
         : input.high != null ? `< ${input.high}`
         : input.low != null ? `> ${input.low}` : null);
    await dbExecute(
      `INSERT INTO test_ranges(test_id,sex,low,high,range_text) VALUES(?,?,?,?,?)`,
      [testId, 'ANY', input.low ?? null, input.high ?? null, rt]
    );
  }
  return testId;
}

/** Persist a new row order for a panel's tests (drag-and-drop reorder).
 *  Assigns sort_order 10,20,30… so the order survives future inserts. */
export async function reorderPanelTests(orderedTestIds: number[]): Promise<void> {
  for (let i = 0; i < orderedTestIds.length; i++) {
    await dbExecute('UPDATE tests SET sort_order=? WHERE id=?', [(i + 1) * 10, orderedTestIds[i]]);
  }
}

export async function setInterpretation(testId: number, note: string): Promise<void> {
  assertCan('edit_tests');
  await dbExecute('UPDATE tests SET interpretation_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [note, testId]);
  await writeAudit(currentUserId(), 'test.interpretation', 'tests', testId, null, { note });
}

export async function upsertRange(range: Omit<TestRange, 'id' | 'created_at'>): Promise<void> {
  assertCan('edit_ranges');
  // A low above high silently breaks H/L flagging (every value reads normal) — reject it.
  if (range.low != null && range.high != null && range.low > range.high) {
    throw new Error('Low value cannot be greater than High value.');
  }
  if (range.age_min_days > range.age_max_days) {
    throw new Error('Minimum age cannot be greater than maximum age.');
  }
  await dbExecute(
    `INSERT INTO test_ranges(test_id,sex,age_min_days,age_max_days,low,high,range_text,band_text,unit)
     VALUES(?,?,?,?,?,?,?,?,?)`,
    [range.test_id, range.sex, range.age_min_days, range.age_max_days,
     range.low ?? null, range.high ?? null, range.range_text ?? null, range.band_text ?? null,
     range.unit?.trim() || null]
  );
  await writeAudit(currentUserId(), 'range.create', 'test_ranges', range.test_id, null, range);
}

export async function deleteRange(id: number): Promise<void> {
  assertCan('edit_ranges');
  await dbExecute('DELETE FROM test_ranges WHERE id=?', [id]);
  await writeAudit(currentUserId(), 'range.delete', 'test_ranges', id, null, null);
}

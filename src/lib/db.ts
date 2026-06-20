import Database from '@tauri-apps/plugin-sql';

// Dev builds (`tauri dev`, Vite DEV) connect to a SEPARATE database file so development never
// migrates/mutates the production `scl.db` the packaged app uses — otherwise a newer dev build
// silently upgrades the shared DB and an older installed build can no longer open it. This MUST
// stay in sync with commands::db_file_name() and the `sqlite:` URL in src-tauri/src/lib.rs.
const DB_URL = import.meta.env.DEV ? 'sqlite:scl-dev.db' : 'sqlite:scl.db';

let _db: Database | null = null;
let _loading: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (_db) return _db;
  // Coalesce concurrent first-calls so we only open + configure the pool once.
  if (_loading) return _loading;

  _loading = (async () => {
    const db = await Database.load(DB_URL);
    // Performance/safety pragmas (§4A.1). Wrapped so a single pragma failure
    // doesn't leave a half-initialised cached connection.
    try {
      await db.execute('PRAGMA journal_mode=WAL');
      await db.execute('PRAGMA synchronous=NORMAL');
      await db.execute('PRAGMA foreign_keys=ON');
      await db.execute('PRAGMA busy_timeout=5000');
      await db.execute('PRAGMA temp_store=MEMORY');
      await db.execute('PRAGMA cache_size=-16000');
    } catch (err) {
      // Surface the real cause; do NOT cache a broken handle.
      _loading = null;
      throw new Error(`Database initialisation failed: ${String(err)}`);
    }
    _db = db;
    _loading = null;
    return db;
  })();

  return _loading;
}

export async function dbQuery<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return db.select<T[]>(sql, params);
}

export async function dbExecute(sql: string, params: unknown[] = []): Promise<number> {
  const db = await getDb();
  const res = await db.execute(sql, params);
  return res.lastInsertId ?? 0;
}

/**
 * IMPORTANT: tauri-plugin-sql runs every call on a connection acquired from a POOL,
 * so a literal `BEGIN ... COMMIT` issued across separate execute() calls is NOT
 * reliable (the statements can land on different connections) and `last_insert_rowid()`
 * read in a separate call returns the wrong value. We therefore run the operations
 * sequentially (each statement auto-commits) and obtain inserted ids from the
 * execute() result's `lastInsertId`. Multi-row writes that must be all-or-nothing
 * implement their own manual rollback (see patients.createPatient).
 */
export async function dbTransaction(operations: ((db: Database) => Promise<void>)): Promise<void> {
  const db = await getDb();
  await operations(db);
}

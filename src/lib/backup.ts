import { invoke, isTauri } from '@/lib/tauri';
import { getSetting, setSetting } from '@/lib/queries/settings';
import { dbExecute } from '@/lib/db';
import { documentDir, join } from '@tauri-apps/api/path';

/** The out-of-the-box backup folder: <Documents>/NamAsta Backups. Defaulted on first launch
 *  (when none is configured) so EVERY lab gets daily backups without touching Settings. */
export async function defaultBackupDir(): Promise<string> {
  return join(await documentDir(), 'NamAsta Backups');
}

/** Run the daily dual backup via the Rust `backup_now` command. Returns the list of
 *  written backup file paths (§4A.8). dest dirs come from settings. */
export async function backupNow(): Promise<string[]> {
  const [dest1, dest2, retention] = await Promise.all([
    getSetting('backup_dir_1'),
    getSetting('backup_dir_2'),
    getSetting('backup_retention_days'),
  ]);
  if (!dest1) throw new Error('No backup folder configured. Set one in Settings → Backups.');
  const retentionDays = Math.max(1, parseInt(retention ?? '30', 10) || 30);
  // Flush the WAL into the main scl.db file FIRST, so the file the Rust side copies contains
  // every committed change (otherwise recent results live only in scl.db-wal and the backup
  // is silently stale).
  try { await dbExecute('PRAGMA wal_checkpoint(TRUNCATE)'); } catch { /* non-fatal */ }
  // The Rust side resolves the real DB file path itself (app data dir).
  const written = await invoke<string[]>('backup_now', {
    dest1,
    dest2: dest2 || null,
    retentionDays,
  });
  // Stamp the date so both the manual and once-a-day paths record when we last backed up.
  const today = new Date().toISOString().slice(0, 10);
  await dbExecute(
    `INSERT INTO settings(key,value,updated_at) VALUES('last_backup_date',?,CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`,
    [today]
  );
  return written;
}

/** Backup-on-first-launch-of-the-day: compares last-backup date in settings and runs
 *  the backup once per calendar day (§4A.8). Safe to call on app start; silent on failure. */
export async function maybeDailyBackup(): Promise<void> {
  try {
    if (!isTauri()) return;   // backups are a desktop-only feature
    // Fully OFF when the lab disables it (e.g. a PC tight on disk space). When off we do NOT
    // default a folder and we do NOT back up — nothing is written anywhere.
    if ((await getSetting('backup_enabled')) === '0') return;
    let dest1 = await getSetting('backup_dir_1');
    if (!dest1) {
      // No folder configured → default to <Documents>/NamAsta Backups so the lab still gets
      // automatic daily backups (the Rust backup_now creates the folder on first copy). They
      // can change it / add a 2nd location in Settings → Backups; we only set it when unset.
      dest1 = await defaultBackupDir();
      await setSetting('backup_dir_1', dest1);
    }
    const last = await getSetting('last_backup_date');
    const today = new Date().toISOString().slice(0, 10);
    if (last === today) return;
    await backupNow();   // backupNow stamps last_backup_date, so this runs once per calendar day
  } catch {
    /* never block startup on a backup failure; surfaced in Settings instead */
  }
}

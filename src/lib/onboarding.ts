import { dbQuery, dbExecute } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { User } from "@/types";

/** First-run: has the lab set up its own account + identity yet? (settings flag) */
export async function needsSetup(): Promise<boolean> {
  const rows = await dbQuery<{ value: string }>("SELECT value FROM settings WHERE key='setup_done'");
  return (rows[0]?.value ?? "") !== "1";
}

/**
 * Complete first-run setup: the lab names itself and creates its own admin login (replacing
 * the seeded placeholder admin). Writes are ungated (there's no session yet). Returns the
 * new admin user for immediate sign-in.
 */
export async function completeSetup(input: {
  labName: string; username: string; displayName: string; password: string;
}): Promise<User> {
  const username = input.username.trim().toLowerCase();
  const display = input.displayName.trim() || input.username.trim();
  const hash = await hashPassword(input.password);

  const admins = await dbQuery<{ id: number }>("SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1");
  const adminId = admins[0]?.id;
  if (adminId) {
    await dbExecute(
      `UPDATE users SET username=?, display_name=?, password_hash=?, force_password_change=0, active=1, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [username, display, hash, adminId]
    );
  } else {
    await dbExecute(
      `INSERT INTO users(username,display_name,role,password_hash,force_password_change,active) VALUES(?,?,'admin',?,0,1)`,
      [username, display, hash]
    );
  }

  for (const [k, v] of [["lab_name", input.labName.trim()], ["collected_at_default", input.labName.trim()], ["setup_done", "1"]] as const) {
    await dbExecute(
      `INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`,
      [k, v]
    );
  }

  const rows = await dbQuery<User>("SELECT * FROM users WHERE username=? AND active=1", [username]);
  return rows[0];
}

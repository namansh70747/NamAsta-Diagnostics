import { isTauri } from "@/lib/tauri";
import type { Update } from "@tauri-apps/plugin-updater";

export type { Update };

/**
 * Auto-update over GitHub Releases. The vendor signs each release with the updater PRIVATE
 * key; the app embeds only the matching PUBLIC key (tauri.conf.json → plugins.updater.pubkey)
 * and verifies every downloaded package against it — so a tampered or unsigned build is
 * refused. The endpoint serves `latest.json`, which the release CI generates automatically.
 *
 * `check()` returns the Update handle when a newer version is published, or null when the
 * installed build is already the latest. In dev / a plain browser there's no updater, so we
 * return null rather than throwing.
 */
export async function checkForUpdate(): Promise<Update | null> {
  if (!isTauri()) return null;
  const { check } = await import("@tauri-apps/plugin-updater");
  return check();
}

/**
 * Download + install the update, reporting 0–100% via onProgress, then relaunch into the new
 * version. The relaunch ends this process, so code after this call does not run on success.
 */
export async function installUpdate(update: Update, onProgress?: (pct: number) => void): Promise<void> {
  let total = 0;
  let received = 0;
  await update.downloadAndInstall((e) => {
    if (e.event === "Started") {
      total = e.data.contentLength ?? 0;
      onProgress?.(0);
    } else if (e.event === "Progress") {
      received += e.data.chunkLength;
      if (total > 0) onProgress?.(Math.min(99, Math.round((received / total) * 100)));
    } else if (e.event === "Finished") {
      onProgress?.(100);
    }
  });
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}

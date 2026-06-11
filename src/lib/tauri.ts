// Thin wrapper around Tauri's invoke so the app degrades gracefully when run in
// a plain browser (e.g. `npm run dev` without the Tauri shell): commands that
// need the native layer surface a friendly error instead of a hard crash.
import { invoke as tauriInvoke } from '@tauri-apps/api/core';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error(`"${cmd}" needs the desktop app (this feature is unavailable in browser preview).`);
  }
  return tauriInvoke<T>(cmd, args);
}

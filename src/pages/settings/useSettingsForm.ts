import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setSetting } from "@/lib/queries/settings";
import { useToast, errMessage } from "./toast";

/**
 * Per-tab form helper. Holds local field state, tracks dirtiness, and saves a
 * set of keys to the settings store. setSetting() throws for non-admins, so all
 * writes are wrapped in try/catch and surfaced via toast. The ['settings'] query
 * is invalidated after a successful save so other screens pick up the change.
 */
export function useSettingsForm(settings: Record<string, string>, keys: string[]) {
  const qc = useQueryClient();
  const toast = useToast();
  const [local, setLocal] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // Snapshot of the values last loaded from the server, to compute dirty state.
  const baseline = useRef<Record<string, string>>({});

  // Hydrate local state whenever the underlying settings change (and we're not mid-edit).
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const k of keys) next[k] = settings[k] ?? "";
    baseline.current = next;
    setLocal((prev) => ({ ...next, ...filterKeys(prev, keys) }));
    // We only want to re-hydrate when the persisted settings object identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const get = (k: string) => local[k] ?? "";
  const set = (k: string, v: string) => setLocal((prev) => ({ ...prev, [k]: v }));

  const dirty = keys.some((k) => (local[k] ?? "") !== (baseline.current[k] ?? ""));

  /** Persist the given keys (defaults to all tab keys). Returns true on success. */
  async function save(onlyKeys?: string[]): Promise<boolean> {
    const toWrite = onlyKeys ?? keys;
    setSaving(true);
    try {
      for (const k of toWrite) {
        const v = local[k] ?? "";
        if (v !== (baseline.current[k] ?? "")) {
          await setSetting(k, v);
          baseline.current[k] = v;
        }
      }
      await qc.invalidateQueries({ queryKey: ["settings"] });
      return true;
    } catch (e) {
      toast.error(errMessage(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  /** Save a single value immediately (used by uploads / direct writes). */
  async function saveValue(k: string, v: string): Promise<boolean> {
    setSaving(true);
    try {
      await setSetting(k, v);
      baseline.current[k] = v;
      setLocal((prev) => ({ ...prev, [k]: v }));
      await qc.invalidateQueries({ queryKey: ["settings"] });
      return true;
    } catch (e) {
      toast.error(errMessage(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { get, set, save, saveValue, dirty, saving, toast };
}

function filterKeys(obj: Record<string, string>, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { api, ApiClientError } from "@/lib/api-client";

export type SaveStatus = "saved" | "dirty" | "saving" | "error" | "conflict";

type Snapshot = { title: string; content: JSONContent };

/**
 * Debounced autosave with a single in-flight request and optimistic concurrency.
 * - Never runs two PATCHes at once; edits made during a save trigger one follow-up save.
 * - Sends `baseVersion`; a 409 stops autosave and surfaces a conflict the user resolves.
 */
export function useAutosave(opts: {
  documentId: string;
  initialVersion: number;
  getSnapshot: () => Snapshot;
  enabled: boolean;
  delayMs?: number;
}) {
  const { documentId, initialVersion, getSnapshot, enabled, delayMs = 800 } = opts;
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [conflictBy, setConflictBy] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const version = useRef(initialVersion);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const dirtyDuringFlight = useRef(false);
  const blocked = useRef(false); // set while in conflict
  const statusRef = useRef<SaveStatus>("saved");
  const lastSaved = useRef<string>(JSON.stringify(getSnapshot()));

  const set = (s: SaveStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  const save = useCallback(
    async (force = false): Promise<void> => {
      if (!enabled || (blocked.current && !force)) return;
      if (timer.current) clearTimeout(timer.current);
      if (inFlight.current) {
        dirtyDuringFlight.current = true;
        return;
      }
      const snap = getSnapshot();
      const serialized = JSON.stringify(snap);
      if (serialized === lastSaved.current && !force) {
        set("saved");
        return;
      }
      const prev = JSON.parse(lastSaved.current) as Snapshot;
      const title = snap.title.trim();
      const body: Record<string, unknown> = { baseVersion: version.current, force: force || undefined };
      if (title && title !== prev.title) body.title = title;
      if (JSON.stringify(snap.content) !== JSON.stringify(prev.content)) body.content = snap.content;
      if (body.title === undefined && body.content === undefined) {
        lastSaved.current = serialized;
        set("saved");
        return;
      }

      inFlight.current = true;
      set("saving");
      try {
        const res = await api<{ version: number }>(`/api/documents/${documentId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        version.current = res.version;
        lastSaved.current = JSON.stringify({ ...snap, title: title || prev.title });
        blocked.current = false;
        setConflictBy(null);
        setLastSavedAt(new Date());
        set("saved");
      } catch (e) {
        if (e instanceof ApiClientError && e.status === 409) {
          blocked.current = true;
          const d = e.details as { currentVersion?: number; updatedBy?: string } | undefined;
          if (d?.currentVersion) version.current = d.currentVersion;
          setConflictBy(d?.updatedBy ?? "Someone");
          set("conflict");
        } else {
          set("error");
          throw e;
        }
      } finally {
        inFlight.current = false;
        if (dirtyDuringFlight.current && !blocked.current) {
          dirtyDuringFlight.current = false;
          void save().catch(() => undefined);
        }
      }
    },
    [documentId, enabled, getSnapshot],
  );

  const markDirty = useCallback(() => {
    if (!enabled) return;
    if (statusRef.current !== "conflict") set("dirty");
    if (inFlight.current) dirtyDuringFlight.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save().catch(() => undefined), delayMs);
  }, [enabled, save, delayMs]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (["dirty", "saving", "error", "conflict"].includes(statusRef.current)) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  /** Lets the caller discard local state (e.g. before reloading the latest version). */
  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    blocked.current = true;
    set("saved");
  }, []);

  return { status, conflictBy, lastSavedAt, markDirty, save, reset };
}

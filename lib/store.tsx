"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { program } from "./program";
import { isAppData } from "./store-guard";
export { isAppData };
import type { AppData, BodyEntry, Review, Settings, WorkoutEntry } from "./types";

const KEY = "mgp-data-v1";
const SYNC_KEY = "mgp-sync-v1";

export const emptyData = (): AppData => ({ version: 1, updatedAt: new Date(0).toISOString(), settings: {}, body: [], workouts: [], reviews: {} });


type SyncState = { passcode: string; auto: boolean };
type SyncStatus = { state: "off" | "idle" | "saving" | "ok" | "error" | "conflict"; message?: string; at?: string };

interface Ctx {
  ready: boolean;
  data: AppData;
  settings: Settings;
  upsertBody: (e: BodyEntry) => void;
  deleteBody: (date: string) => void;
  addWorkouts: (w: Omit<WorkoutEntry, "id">[]) => void;
  deleteWorkout: (id: string) => void;
  setReview: (week: number, r: Review) => void;
  updateSettings: (s: Partial<Settings>) => void;
  replaceAll: (d: AppData) => void;
  sync: SyncState;
  setSync: (s: SyncState) => void;
  status: SyncStatus;
  pull: () => Promise<void>;
  push: (force?: boolean) => Promise<void>;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(emptyData);
  const [sync, setSyncState] = useState<SyncState>({ passcode: "", auto: false });
  const [status, setStatus] = useState<SyncStatus>({ state: "off" });
  const dirty = useRef(false);

  // load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isAppData(parsed)) setData(parsed);
      }
      const s = localStorage.getItem(SYNC_KEY);
      if (s) setSyncState(JSON.parse(s));
    } catch {
      /* corrupted storage → start empty */
    }
    setReady(true);
  }, []);

  // persist locally
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full / blocked */
    }
  }, [data, ready]);

  const mutate = useCallback((fn: (d: AppData) => AppData) => {
    dirty.current = true;
    setData((d) => ({ ...fn(d), updatedAt: new Date().toISOString() }));
  }, []);

  const api = useCallback(
    async (method: "GET" | "PUT", body?: AppData, force = false) => {
      const res = await fetch(`/api/data${force ? "?force=1" : ""}`, {
        method,
        headers: { "Content-Type": "application/json", "x-passcode": sync.passcode },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      return { res, json };
    },
    [sync.passcode]
  );

  const pull = useCallback(async () => {
    if (!sync.passcode) return setStatus({ state: "error", message: "Isi passcode dulu." });
    setStatus({ state: "saving", message: "Menarik data…" });
    try {
      const { res, json } = await api("GET");
      if (!res.ok) return setStatus({ state: "error", message: json.error || `HTTP ${res.status}` });
      if (json.data && isAppData(json.data)) {
        dirty.current = false;
        setData(json.data);
        setStatus({ state: "ok", message: "Data server dimuat.", at: new Date().toISOString() });
      } else setStatus({ state: "ok", message: "Server masih kosong — data lokal akan diunggah saat simpan.", at: new Date().toISOString() });
    } catch (e) {
      setStatus({ state: "error", message: (e as Error).message });
    }
  }, [api, sync.passcode]);

  const push = useCallback(
    async (force = false) => {
      if (!sync.passcode) return setStatus({ state: "error", message: "Isi passcode dulu." });
      setStatus({ state: "saving", message: "Menyimpan…" });
      try {
        const { res, json } = await api("PUT", data, force);
        if (res.status === 409) return setStatus({ state: "conflict", message: "Server punya data lebih baru dari perangkat lain. Tarik dulu, atau timpa paksa." });
        if (!res.ok) return setStatus({ state: "error", message: json.error || `HTTP ${res.status}` });
        dirty.current = false;
        setStatus({ state: "ok", message: "Tersimpan ke server.", at: new Date().toISOString() });
      } catch (e) {
        setStatus({ state: "error", message: (e as Error).message });
      }
    },
    [api, data, sync.passcode]
  );

  // auto: pull once on start, then debounce-push after changes
  const pulledOnce = useRef(false);
  useEffect(() => {
    if (!ready || !sync.auto || !sync.passcode || pulledOnce.current) return;
    pulledOnce.current = true;
    (async () => {
      try {
        const { res, json } = await api("GET");
        if (res.ok && json.data && isAppData(json.data) && json.data.updatedAt > data.updatedAt) {
          setData(json.data);
          setStatus({ state: "ok", message: "Disinkronkan dari server.", at: new Date().toISOString() });
        } else if (res.ok) setStatus({ state: "idle", message: "Sinkron aktif." });
        else setStatus({ state: "error", message: json.error || `HTTP ${res.status}` });
      } catch (e) {
        setStatus({ state: "error", message: (e as Error).message });
      }
    })();
  }, [ready, sync, api, data.updatedAt]);

  useEffect(() => {
    if (!ready || !sync.auto || !sync.passcode || !dirty.current) return;
    const t = setTimeout(() => void push(), 2500);
    return () => clearTimeout(t);
  }, [data, ready, sync, push]);

  const setSync = useCallback((s: SyncState) => {
    setSyncState(s);
    pulledOnce.current = false;
    try {
      localStorage.setItem(SYNC_KEY, JSON.stringify(s));
    } catch {}
    setStatus(s.passcode ? { state: "idle" } : { state: "off" });
  }, []);

  const settings = useMemo(() => ({ ...program.defaults, ...data.settings }) as Settings, [data.settings]);

  const value: Ctx = {
    ready,
    data,
    settings,
    upsertBody: (e) =>
      mutate((d) => {
        const rest = d.body.filter((b) => b.date !== e.date);
        return { ...d, body: [...rest, e].sort((a, b) => (a.date < b.date ? -1 : 1)) };
      }),
    deleteBody: (date) => mutate((d) => ({ ...d, body: d.body.filter((b) => b.date !== date) })),
    addWorkouts: (ws) =>
      mutate((d) => ({
        ...d,
        workouts: [...d.workouts, ...ws.map((w) => ({ ...w, id: `${w.date}-${Math.random().toString(36).slice(2, 9)}` }))],
      })),
    deleteWorkout: (id) => mutate((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== id) })),
    setReview: (week, r) => mutate((d) => ({ ...d, reviews: { ...d.reviews, [week]: { ...d.reviews[week], ...r } } })),
    updateSettings: (s) => mutate((d) => ({ ...d, settings: { ...d.settings, ...s } })),
    replaceAll: (nd) => mutate(() => nd),
    sync,
    setSync,
    status,
    pull,
    push,
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}

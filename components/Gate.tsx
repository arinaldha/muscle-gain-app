"use client";

import { useStore } from "@/lib/store";

/** Waits for localStorage to load so pages never render with empty data first. */
export default function Gate({ children }: { children: React.ReactNode }) {
  const { ready } = useStore();
  if (!ready) return <div className="empty">Memuat data…</div>;
  return <>{children}</>;
}

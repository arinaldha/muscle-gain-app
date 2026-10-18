"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

const LINKS = [
  ["/", "Dashboard"],
  ["/log", "Log Harian"],
  ["/workout", "Latihan"],
  ["/meals", "Menu & Belanja"],
  ["/schedule", "Jadwal"],
  ["/review", "Review"],
  ["/guide", "Panduan"],
  ["/settings", "Pengaturan"],
] as const;

export default function Nav() {
  const path = usePathname();
  const { status, sync } = useStore();
  const label =
    !sync.passcode || !sync.auto
      ? "Tersimpan di perangkat"
      : status.state === "saving"
        ? "Menyinkron…"
        : status.state === "error" || status.state === "conflict"
          ? "Sinkron bermasalah"
          : "Tersinkron";
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          Muscle<span>26</span>
        </Link>
        <nav className="nav" aria-label="Navigasi utama">
          {LINKS.map(([href, text]) => (
            <Link key={href} href={href} className={path === href ? "active" : ""}>
              {text}
            </Link>
          ))}
        </nav>
        <Link href="/settings" className="sync-dot" style={{ textDecoration: "none" }}>
          {label}
        </Link>
      </div>
    </header>
  );
}

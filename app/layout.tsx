import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Nav from "@/components/Nav";
import Gate from "@/components/Gate";

export const metadata: Metadata = {
  title: "Muscle Gain Planner — 26 Minggu",
  description: "Program muscle gain 6 bulan: target nutrisi, meal plan, program gym, tracker, dan evaluasi mingguan.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1f4e5a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <StoreProvider>
          <Nav />
          <main className="shell">
            <Gate>{children}</Gate>
          </main>
        </StoreProvider>
      </body>
    </html>
  );
}

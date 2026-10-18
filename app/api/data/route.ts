import { get, put } from "@vercel/blob";
import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAppData } from "@/lib/store-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Satu file JSON privat di Vercel Blob = "database" sinkron.
const PATH = "muscle-gain/db.json";
const MAX_BYTES = 2_000_000;

function check(req: NextRequest): NextResponse | null {
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    return NextResponse.json({ error: "Sinkron belum aktif: buat Blob store di Vercel (env BLOB_READ_WRITE_TOKEN)." }, { status: 503 });
  const code = process.env.APP_PASSCODE;
  if (!code) return NextResponse.json({ error: "APP_PASSCODE belum di-set di Environment Variables Vercel." }, { status: 503 });
  const given = req.headers.get("x-passcode") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(code);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Passcode salah." }, { status: 401 });
  return null;
}

async function readCurrent() {
  try {
    const res = await get(PATH, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return null;
    const text = await new Response(res.stream).text();
    return JSON.parse(text);
  } catch (e) {
    if ((e as Error).name === "BlobNotFoundError") return null;
    throw e;
  }
}

export async function GET(req: NextRequest) {
  const denied = check(req);
  if (denied) return denied;
  try {
    return NextResponse.json({ data: await readCurrent() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: `Gagal membaca: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = check(req);
  if (denied) return denied;
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "Data terlalu besar (>2 MB)." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON tidak valid." }, { status: 400 });
  }
  if (!isAppData(body)) return NextResponse.json({ error: "Format data tidak dikenali." }, { status: 400 });
  try {
    const force = req.nextUrl.searchParams.get("force") === "1";
    if (!force) {
      const current = await readCurrent();
      // Last-write-wins dengan pengaman: tolak bila server sudah lebih baru (diubah dari perangkat lain).
      if (current && isAppData(current) && current.updatedAt > body.updatedAt)
        return NextResponse.json({ error: "Server lebih baru.", serverUpdatedAt: current.updatedAt }, { status: 409 });
    }
    await put(PATH, JSON.stringify(body), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return NextResponse.json({ ok: true, updatedAt: body.updatedAt });
  } catch (e) {
    return NextResponse.json({ error: `Gagal menyimpan: ${(e as Error).message}` }, { status: 500 });
  }
}

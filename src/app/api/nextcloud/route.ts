import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { prisma } from "@/lib/prisma";

const NC_BASE = (process.env.NEXTCLOUD_URL || "").replace(/\/$/, "");
const NC_ORIGIN = (process.env.NEXTCLOUD_ORIGIN || "").replace(/\/$/, "");
const ADMIN_USERS = (process.env.ADMIN_USERS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function authHeader(username: string, password: string) {
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

async function propfind(url: string, username: string, password: string, depth = "1") {
  const res = await fetch(url, {
    method: "PROPFIND",
    headers: { Authorization: authHeader(username, password), Depth: depth, Accept: "*/*" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err: Error & { status?: number } = new Error(`PROPFIND ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }
  const parser = new XMLParser({ ignoreAttributes: false });
  return parser.parse(await res.text());
}

async function putFile(
  url: string,
  username: string,
  password: string,
  body: Uint8Array,
  contentType = "application/octet-stream"
) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: authHeader(username, password), "Content-Type": contentType },
    body: new Uint8Array(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PUT ${res.status}: ${text}`);
  }
}

async function ensureFolder(folderUrl: string, username: string, password: string) {
  const check = await fetch(folderUrl, {
    method: "PROPFIND",
    headers: { Authorization: authHeader(username, password), Depth: "0" },
  });
  if (check.status === 404) {
    const mk = await fetch(folderUrl, {
      method: "MKCOL",
      headers: { Authorization: authHeader(username, password) },
    });
    if (!mk.ok && mk.status !== 405) throw new Error(`MKCOL ${mk.status}`);
  }
}

function resolveFolderBase(folderHref: string): string {
  if (folderHref.startsWith("/")) {
    if (!NC_ORIGIN) throw new Error("NEXTCLOUD_ORIGIN fehlt in der Konfiguration");
    return `${NC_ORIGIN}${folderHref.replace(/\/$/, "")}`;
  }
  if (/^https?:\/\//.test(folderHref)) return folderHref.replace(/\/$/, "");
  return `${NC_BASE}/${folderHref.replace(/^\//, "").replace(/\/$/, "")}`;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // ── JSON: test / folders ────────────────────────────────────────────────
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { action, username, password } = body as {
        action: string;
        username: string;
        password: string;
      };
      if (!action || !username || !password)
        return NextResponse.json({ error: "Fehlende Parameter" }, { status: 400 });

      const userUrl = `${NC_BASE}/${encodeURIComponent(username)}/`;

      if (action === "test") {
        try {
          await propfind(userUrl, username, password, "0");
          const isAdmin = ADMIN_USERS.includes(username) ||
            !!(await prisma.adminUser.findUnique({ where: { username } }));
          return NextResponse.json({ ok: true, isAdmin });
        } catch (err: unknown) {
          const e = err as Error & { status?: number };
          return NextResponse.json({ error: "Login fehlgeschlagen" }, { status: e.status || 401 });
        }
      }

      if (action === "folders") {
        try {
          const parsed = await propfind(userUrl, username, password, "1");
          const ms = parsed["d:multistatus"] || parsed["D:multistatus"] || {};
          const responses = ms["d:response"] || ms["D:response"] || [];
          const arr: unknown[] = Array.isArray(responses) ? responses : [responses];

          const folders = arr
            .map((item) => {
              if (!item || typeof item !== "object") return null;
              const obj = item as Record<string, string>;
              const href = obj["d:href"] || obj["D:href"];
              if (!href) return null;
              const decoded = decodeURIComponent(href);
              const parts = decoded.split("/").filter(Boolean);
              const name = parts[parts.length - 1] || "";
              if (!name || name === username) return null;
              return { name, href };
            })
            .filter(Boolean);

          return NextResponse.json({ folders });
        } catch (err: unknown) {
          const e = err as Error & { status?: number };
          return NextResponse.json({ error: e.message }, { status: e.status || 500 });
        }
      }

      return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
    }

    // ── Multipart: upload ────────────────────────────────────────────────────
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const username = form.get("username") as string;
      const password = form.get("password") as string;
      const folderHref = form.get("folder") as string;
      const entryJson = form.get("entry") as string;

      if (!username || !password || !folderHref)
        return NextResponse.json({ error: "Fehlende Parameter" }, { status: 400 });

      const folderBase = resolveFolderBase(folderHref);
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const kuerzel = username
        .split(/[\s._-]+/)
        .filter(Boolean)
        .map((w: string) => w.charAt(0).toUpperCase())
        .join("");
      const entryFolder = `${folderBase}/Bautagebuch_${today}_${kuerzel}`;
      await ensureFolder(entryFolder, username, password);

      // Save entry to database
      if (entryJson) {
        try {
          const data = JSON.parse(entryJson) as {
            datum: string;
            projekt: string;
            arbeitsschritt: string;
            bemerkung?: string;
            material: { positionNr: number; artikelNr: string; beschreibung: string; einheit: string; menge: number }[];
            benutzer: string;
          };
          await prisma.eintrag.create({
            data: {
              datum: data.datum,
              projekt: data.projekt,
              projektHref: folderHref,
              arbeitsschritt: data.arbeitsschritt,
              bemerkung: data.bemerkung || "",
              benutzer: data.benutzer,
              material: {
                create: (data.material || []).map((m) => ({
                  positionNr: m.positionNr,
                  artikelNr: m.artikelNr,
                  beschreibung: m.beschreibung,
                  einheit: m.einheit,
                  menge: m.menge,
                })),
              },
            },
          });
        } catch (dbErr) {
          console.error("DB save error:", dbErr);
        }
      }

      // Upload PDF
      const pdfFile = form.get("pdf") as File | null;
      if (pdfFile && typeof pdfFile !== "string") {
        const buf = Buffer.from(await pdfFile.arrayBuffer());
        await putFile(`${entryFolder}/${pdfFile.name}`, username, password, new Uint8Array(buf), "application/pdf");
      }

      // Upload images
      const images = form.getAll("images");
      let idx = 1;
      for (const img of images) {
        if (!img || typeof img === "string") continue;
        const file = img as File;
        const buf = Buffer.from(await file.arrayBuffer());
        const ext = file.name?.split(".").pop() || "jpg";
        await putFile(`${entryFolder}/bild_${String(idx).padStart(2, "0")}.${ext}`, username, password, new Uint8Array(buf));
        idx++;
      }

      return NextResponse.json({ ok: true, folder: entryFolder });
    }

    return NextResponse.json({ error: "Ungültiger Content-Type" }, { status: 400 });
  } catch (err: unknown) {
    const e = err as Error;
    console.error("nextcloud route error:", e);
    return NextResponse.json({ error: e.message || "Serverfehler" }, { status: 500 });
  }
}

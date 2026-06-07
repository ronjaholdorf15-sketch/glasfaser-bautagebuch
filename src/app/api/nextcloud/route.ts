import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

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
  body: Buffer,
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
          return NextResponse.json({ ok: true, isAdmin: ADMIN_USERS.includes(username) });
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
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const entryFolder = `${folderBase}/Bautagebuch_${ts}`;
      await ensureFolder(entryFolder, username, password);

      if (entryJson) {
        await putFile(
          `${entryFolder}/eintrag.json`,
          username,
          password,
          Buffer.from(entryJson, "utf8"),
          "application/json"
        );
        try {
          const data = JSON.parse(entryJson) as {
            datum: string;
            projekt: string;
            arbeitsschritt: string;
            bemerkung: string;
            material: { name: string; menge: number; einheit: string }[];
            benutzer: string;
          };
          const lines = [
            `Datum:          ${data.datum}`,
            `Projekt:        ${data.projekt}`,
            `Arbeitsschritt: ${data.arbeitsschritt}`,
            "",
            "Bemerkung:",
            data.bemerkung || "(keine)",
            "",
            "Materialliste:",
            ...(data.material || []).map((m) => `  - ${m.name}: ${m.menge} ${m.einheit}`),
            "",
            `Erstellt von: ${data.benutzer}`,
            `Erstellt am:  ${new Date().toLocaleString("de-DE")}`,
          ];
          await putFile(
            `${entryFolder}/eintrag.txt`,
            username,
            password,
            Buffer.from(lines.join("\n"), "utf8"),
            "text/plain; charset=utf-8"
          );
        } catch (_) {}
      }

      const images = form.getAll("images");
      let idx = 1;
      for (const img of images) {
        if (!img || typeof img === "string") continue;
        const file = img as File;
        const buf = Buffer.from(await file.arrayBuffer());
        const ext = file.name?.split(".").pop() || "jpg";
        await putFile(`${entryFolder}/bild_${String(idx).padStart(2, "0")}.${ext}`, username, password, buf);
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

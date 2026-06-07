import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const NC_BASE = (process.env.NEXTCLOUD_URL || "").replace(/\/$/, "");
const NC_ORIGIN = (process.env.NEXTCLOUD_ORIGIN || "").replace(/\/$/, "");
const ADMIN_USERS = (process.env.ADMIN_USERS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function authHeader(u: string, p: string) {
  return "Basic " + Buffer.from(`${u}:${p}`).toString("base64");
}

async function propfind(url: string, username: string, password: string, depth = "1") {
  const res = await fetch(url, {
    method: "PROPFIND",
    headers: { Authorization: authHeader(username, password), Depth: depth, Accept: "*/*" },
  });
  if (!res.ok) throw new Error(`PROPFIND ${res.status}`);
  const parser = new XMLParser({ ignoreAttributes: false });
  return parser.parse(await res.text());
}

function getResponses(parsed: Record<string, unknown>): unknown[] {
  const ms =
    (parsed["d:multistatus"] as Record<string, unknown>) ||
    (parsed["D:multistatus"] as Record<string, unknown>) ||
    {};
  const r = ms["d:response"] || ms["D:response"] || [];
  return Array.isArray(r) ? r : [r];
}

async function collectJsonFiles(
  baseUrl: string,
  username: string,
  password: string,
  depth = 3,
  results: string[] = []
): Promise<string[]> {
  if (depth < 0) return results;
  try {
    const parsed = await propfind(baseUrl, username, password, "1");
    const responses = getResponses(parsed as Record<string, unknown>);
    for (const item of responses) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, string>;
      const href = obj["d:href"] || obj["D:href"];
      if (!href) continue;
      const decoded = decodeURIComponent(href);
      if (decoded.endsWith("/")) {
        const url = href.startsWith("/") ? `${NC_ORIGIN}${href}` : href;
        if (url !== baseUrl && depth > 0)
          await collectJsonFiles(url, username, password, depth - 1, results);
      } else if (decoded.endsWith("eintrag.json")) {
        results.push(href.startsWith("/") ? `${NC_ORIGIN}${href}` : href);
      }
    }
  } catch (_) {}
  return results;
}

type MaterialRow = { name: string; einheit: string; menge: number };
type EntryData = {
  datum: string;
  projekt: string;
  arbeitsschritt: string;
  benutzer: string;
  material: MaterialRow[];
};

export async function POST(request: Request) {
  try {
    const { username, password, projekt } = (await request.json()) as {
      username: string;
      password: string;
      projekt?: string;
    };

    if (!username || !password)
      return NextResponse.json({ error: "Fehlende Parameter" }, { status: 400 });

    if (!ADMIN_USERS.includes(username))
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

    let searchBase = `${NC_BASE}/${encodeURIComponent(username)}/`;
    if (projekt) {
      searchBase = projekt.startsWith("/") ? `${NC_ORIGIN}${projekt}` : projekt;
    }

    const jsonFiles = await collectJsonFiles(searchBase, username, password, 3);
    const materialMap: Record<string, MaterialRow> = {};
    const entries: EntryData[] = [];

    for (const fileUrl of jsonFiles) {
      try {
        const res = await fetch(fileUrl, {
          headers: { Authorization: authHeader(username, password) },
        });
        if (!res.ok) continue;
        const data = (await res.json()) as EntryData;
        if (!data.material) continue;
        entries.push({
          datum: data.datum,
          projekt: data.projekt,
          arbeitsschritt: data.arbeitsschritt,
          benutzer: data.benutzer,
          material: data.material,
        });
        for (const m of data.material) {
          if (!m.name) continue;
          const key = `${m.name}___${m.einheit || "ST"}`;
          if (!materialMap[key])
            materialMap[key] = { name: m.name, einheit: m.einheit || "ST", menge: 0 };
          materialMap[key].menge += Number(m.menge) || 0;
        }
      } catch (_) {}
    }

    const zusammenfassung = Object.values(materialMap).sort((a, b) =>
      a.name.localeCompare(b.name, "de")
    );

    return NextResponse.json({ zusammenfassung, eintraege: entries, anzahl: entries.length });
  } catch (err: unknown) {
    const e = err as Error;
    console.error("material route error:", e);
    return NextResponse.json({ error: e.message || "Serverfehler" }, { status: 500 });
  }
}

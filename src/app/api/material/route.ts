import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_USERS = (process.env.ADMIN_USERS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export async function POST(request: Request) {
  try {
    const { username, password, projektHref, vonDatum, bisDatum } = (await request.json()) as {
      username: string;
      password: string;
      projektHref?: string;
      vonDatum?: string;
      bisDatum?: string;
    };

    if (!username || !password)
      return NextResponse.json({ error: "Fehlende Parameter" }, { status: 400 });

    if (!ADMIN_USERS.includes(username))
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

    // Build filter
    const where: Record<string, unknown> = {};
    if (projektHref) where.projektHref = projektHref;
    if (vonDatum || bisDatum) {
      where.datum = {
        ...(vonDatum ? { gte: vonDatum } : {}),
        ...(bisDatum ? { lte: bisDatum } : {}),
      };
    }

    const eintraege = await prisma.eintrag.findMany({
      where,
      include: { material: { orderBy: { positionNr: "asc" } } },
      orderBy: { erstelltAm: "desc" },
    });

    // Aggregate material
    const materialMap: Record<string, { artikelNr: string; beschreibung: string; einheit: string; menge: number }> = {};

    for (const e of eintraege) {
      for (const m of e.material) {
        const key = `${m.artikelNr}___${m.einheit}`;
        if (!materialMap[key]) {
          materialMap[key] = {
            artikelNr: m.artikelNr,
            beschreibung: m.beschreibung,
            einheit: m.einheit,
            menge: 0,
          };
        }
        materialMap[key].menge += m.menge;
      }
    }

    const zusammenfassung = Object.values(materialMap).sort((a, b) =>
      a.beschreibung.localeCompare(b.beschreibung, "de")
    );

    return NextResponse.json({
      zusammenfassung,
      eintraege: eintraege.map((e) => ({
        id: e.id,
        datum: e.datum,
        projekt: e.projekt,
        arbeitsschritt: e.arbeitsschritt,
        benutzer: e.benutzer,
        erstelltAm: e.erstelltAm,
        material: e.material,
      })),
      anzahl: eintraege.length,
    });
  } catch (err: unknown) {
    const e = err as Error;
    console.error("material route error:", e);
    return NextResponse.json({ error: e.message || "Serverfehler" }, { status: 500 });
  }
}

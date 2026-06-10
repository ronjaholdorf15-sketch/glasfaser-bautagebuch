import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Bootstrap: usernames in ADMIN_USERS env are always super-admins
const SUPER_ADMINS = (process.env.ADMIN_USERS || "")
  .split(",").map((s) => s.trim()).filter(Boolean);

async function isAdmin(username: string): Promise<boolean> {
  if (SUPER_ADMINS.includes(username)) return true;
  const found = await prisma.adminUser.findUnique({ where: { username } });
  return !!found;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") || "";
  const password = searchParams.get("password") || "";

  if (!username || !password)
    return NextResponse.json({ error: "Fehlende Parameter" }, { status: 400 });

  // Verify Nextcloud credentials first
  const NC_BASE = (process.env.NEXTCLOUD_URL || "").replace(/\/$/, "");
  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
  const check = await fetch(`${NC_BASE}/${encodeURIComponent(username)}/`, {
    method: "PROPFIND", headers: { Authorization: authHeader, Depth: "0" },
  });
  if (!check.ok)
    return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });

  if (!(await isAdmin(username)))
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const admins = await prisma.adminUser.findMany({ orderBy: { hinzugefugt: "asc" } });

  // Merge with super-admins from ENV (mark them as such)
  const dbUsernames = admins.map((a) => a.username);
  const superAdminEntries = SUPER_ADMINS
    .filter((u) => !dbUsernames.includes(u))
    .map((u) => ({
      id: `env:${u}`,
      username: u,
      anzeigeName: null,
      hinzugefugt: null,
      hinzugefugtVon: "Konfiguration",
      isSuperAdmin: true,
    }));

  return NextResponse.json({
    admins: [
      ...superAdminEntries,
      ...admins.map((a) => ({ ...a, isSuperAdmin: SUPER_ADMINS.includes(a.username) })),
    ],
  });
}

export async function POST(request: Request) {
  const { requesterUsername, requesterPassword, action, username, anzeigeName } =
    await request.json() as {
      requesterUsername: string;
      requesterPassword: string;
      action: "add" | "remove";
      username: string;
      anzeigeName?: string;
    };

  if (!requesterUsername || !requesterPassword || !action || !username)
    return NextResponse.json({ error: "Fehlende Parameter" }, { status: 400 });

  // Verify requester credentials with Nextcloud
  const NC_BASE = (process.env.NEXTCLOUD_URL || "").replace(/\/$/, "");
  const authHeader = "Basic " + Buffer.from(`${requesterUsername}:${requesterPassword}`).toString("base64");
  const check = await fetch(`${NC_BASE}/${encodeURIComponent(requesterUsername)}/`, {
    method: "PROPFIND", headers: { Authorization: authHeader, Depth: "0" },
  });
  if (!check.ok)
    return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });

  if (!(await isAdmin(requesterUsername)))
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  if (action === "add") {
    // Can't add someone who is already a super-admin via ENV
    await prisma.adminUser.upsert({
      where: { username },
      create: { username, anzeigeName: anzeigeName || null, hinzugefugtVon: requesterUsername },
      update: { anzeigeName: anzeigeName || undefined },
    });
    return NextResponse.json({ ok: true, message: `${username} wurde als Admin hinzugefügt.` });
  }

  if (action === "remove") {
    if (SUPER_ADMINS.includes(username))
      return NextResponse.json({ error: "Super-Admins können nicht entfernt werden." }, { status: 400 });
    if (username === requesterUsername)
      return NextResponse.json({ error: "Du kannst dich nicht selbst entfernen." }, { status: 400 });
    await prisma.adminUser.deleteMany({ where: { username } });
    return NextResponse.json({ ok: true, message: `${username} wurde als Admin entfernt.` });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}

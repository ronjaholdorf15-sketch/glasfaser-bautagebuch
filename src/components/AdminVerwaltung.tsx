"use client";
import { useState, useEffect, useCallback } from "react";

type AdminEntry = {
  id: string;
  username: string;
  anzeigeName: string | null;
  hinzugefugt: string | null;
  hinzugefugtVon: string | null;
  isSuperAdmin: boolean;
};

type Props = {
  storedCreds: { username: string; password: string };
};

export default function AdminVerwaltung({ storedCreds }: Props) {
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newAnzeigeName, setNewAnzeigeName] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin?username=${encodeURIComponent(storedCreds.username)}&password=${encodeURIComponent(storedCreds.password)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Laden");
      setAdmins(data.admins);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [storedCreds]);

  useEffect(() => { load(); }, [load]);

  const addAdmin = async () => {
    if (!newUsername.trim()) return;
    setAdding(true);
    setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterUsername: storedCreds.username,
          requesterPassword: storedCreds.password,
          action: "add",
          username: newUsername.trim(),
          anzeigeName: newAnzeigeName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(data.message);
      setNewUsername(""); setNewAnzeigeName("");
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setAdding(false);
    }
  };

  const removeAdmin = async (username: string) => {
    setRemoving(username);
    setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterUsername: storedCreds.username,
          requesterPassword: storedCreds.password,
          action: "remove",
          username,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(data.message);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Add admin card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "#38B7CA" }}>
          Admin hinzufügen
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nextcloud Benutzername *</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white placeholder-gray-400"
              placeholder="z.B. max.mustermann"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAdmin()}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Anzeigename (optional)</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white placeholder-gray-400"
              placeholder="z.B. Max Mustermann"
              value={newAnzeigeName}
              onChange={(e) => setNewAnzeigeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAdmin()}
            />
          </div>
        </div>
        <button
          onClick={addAdmin}
          disabled={adding || !newUsername.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #1E75B8, #38B7CA)" }}
        >
          {adding ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
          Admin hinzufügen
        </button>
        <p className="text-xs text-gray-400 mt-2">
          Der Benutzername muss exakt dem Nextcloud-Benutzernamen entsprechen.
        </p>
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-5 py-4">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-2xl px-5 py-4">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}

      {/* Current admins list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#38B7CA" }}>
            Aktuelle Admins
          </p>
          <button onClick={load} className="text-xs text-gray-400 hover:text-[#38B7CA] transition">
            ↻ Aktualisieren
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Wird geladen…</div>
        ) : admins.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">Keine Admins gefunden.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center gap-4 px-6 py-4">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: admin.isSuperAdmin
                    ? "linear-gradient(135deg, #113462, #1E75B8)"
                    : "linear-gradient(135deg, #1E75B8, #38B7CA)" }}>
                  {(admin.anzeigeName || admin.username).charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: "#113462" }}>
                      {admin.anzeigeName || admin.username}
                    </span>
                    {admin.isSuperAdmin && (
                      <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                        style={{ background: "linear-gradient(135deg, #113462, #38B7CA)" }}>
                        Super-Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-mono">
                    {admin.username}
                    {admin.hinzugefugtVon && (
                      <span className="ml-2 not-italic">
                        · hinzugefügt von {admin.hinzugefugtVon}
                        {admin.hinzugefugt && ` am ${new Date(admin.hinzugefugt).toLocaleDateString("de-DE")}`}
                      </span>
                    )}
                  </p>
                </div>

                {/* Remove button — not for super-admins or self */}
                {!admin.isSuperAdmin && admin.username !== storedCreds.username && (
                  <button
                    onClick={() => removeAdmin(admin.username)}
                    disabled={removing === admin.username}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:border-red-300 transition disabled:opacity-50"
                  >
                    {removing === admin.username ? "…" : "Entfernen"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

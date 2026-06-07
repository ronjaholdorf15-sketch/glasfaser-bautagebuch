"use client";
import { useState } from "react";

type MaterialRow = { name: string; einheit: string; menge: number };
type Entry = {
  datum: string;
  projekt: string;
  arbeitsschritt: string;
  benutzer: string;
  material: MaterialRow[];
};
type Result = { zusammenfassung: MaterialRow[]; eintraege: Entry[]; anzahl: number };

type Props = {
  storedCreds: { username: string; password: string };
  folders: { name: string; href: string }[];
};

export default function MaterialAuswertung({ storedCreds, folders }: Props) {
  const [projekt, setProjekt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: storedCreds.username,
          password: storedCreds.password,
          projekt: projekt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!result) return;
    const rows = [
      ["Material", "Menge", "Einheit"],
      ...result.zusammenfassung.map((r) => [r.name, String(r.menge), r.einheit]),
    ];
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })),
      download: `Materialliste_${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      {/* Filter */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-[#163E73] font-semibold text-base mb-4">📊 Materialauswertung</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3BBBCE]"
            value={projekt}
            onChange={(e) => setProjekt(e.target.value)}
          >
            <option value="">Alle Projekte</option>
            {folders.map((f, i) => (
              <option key={i} value={f.href}>{f.name}</option>
            ))}
          </select>
          <button
            onClick={run}
            disabled={loading}
            className="px-6 py-2.5 bg-[#163E73] hover:bg-[#1a4d8f] text-white rounded-xl text-sm font-medium transition disabled:opacity-60"
          >
            {loading ? "Wird ausgewertet…" : "Auswertung starten"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Summary table */}
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[#163E73] font-semibold">Gesamtübersicht Material</h3>
                <p className="text-gray-500 text-xs mt-0.5">{result.anzahl} Einträge ausgewertet</p>
              </div>
              <button
                onClick={exportCsv}
                className="flex items-center gap-2 px-4 py-2 border border-[#217ABE] text-[#217ABE] rounded-xl text-sm font-medium hover:bg-blue-50 transition"
              >
                ⬇ CSV für Hersteller
              </button>
            </div>

            {result.zusammenfassung.length === 0 ? (
              <p className="text-gray-400 text-sm">Keine Materialdaten gefunden.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#E6EEF8] text-[#163E73]">
                      <th className="text-left px-4 py-2.5 rounded-tl-lg font-medium">Material</th>
                      <th className="text-right px-4 py-2.5 font-medium">Menge</th>
                      <th className="text-left px-4 py-2.5 rounded-tr-lg font-medium">Einheit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.zusammenfassung.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{row.name}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-700">{row.menge}</td>
                        <td className="px-4 py-2.5 text-gray-500">{row.einheit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail entries */}
          {result.eintraege.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-6">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-[#217ABE] select-none">
                  Einzeleinträge anzeigen ({result.eintraege.length})
                </summary>
                <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                  {result.eintraege.map((e, i) => (
                    <div key={i} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex flex-wrap gap-2 text-xs text-gray-400 mb-2">
                        <span>{e.datum}</span>
                        <span>·</span>
                        <span>{e.projekt}</span>
                        <span>·</span>
                        <span>{e.arbeitsschritt}</span>
                        <span>·</span>
                        <span>{e.benutzer}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {e.material.map((m, j) => (
                          <span key={j} className="px-2 py-0.5 bg-[#E6EEF8] text-[#163E73] rounded text-xs">
                            {m.name} — {m.menge} {m.einheit}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </>
      )}
    </div>
  );
}

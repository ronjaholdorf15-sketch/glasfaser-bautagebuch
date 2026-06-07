"use client";
import { useState } from "react";

type MaterialRow = { artikelNr: string; beschreibung: string; einheit: string; menge: number };
type EntryMaterial = { positionNr: number; artikelNr: string; beschreibung: string; einheit: string; menge: number };
type Entry = {
  id: string;
  datum: string;
  projekt: string;
  arbeitsschritt: string;
  benutzer: string;
  erstelltAm: string;
  material: EntryMaterial[];
};
type Result = { zusammenfassung: MaterialRow[]; eintraege: Entry[]; anzahl: number };

type Props = {
  storedCreds: { username: string; password: string };
  folders: { name: string; href: string }[];
};

export default function MaterialAuswertung({ storedCreds, folders }: Props) {
  const [projektHref, setProjektHref] = useState("");
  const [vonDatum, setVonDatum] = useState("");
  const [bisDatum, setBisDatum] = useState("");
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
          projektHref: projektHref || undefined,
          vonDatum: vonDatum || undefined,
          bisDatum: bisDatum || undefined,
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
      ["Artikel-Nr.", "Beschreibung", "Menge", "Einheit"],
      ...result.zusammenfassung.map((r) => [r.artikelNr, r.beschreibung, String(r.menge), r.einheit]),
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
      <div className="bg-white rounded-2xl shadow p-6 space-y-4">
        <h2 className="text-[#163E73] font-semibold text-base">📊 Materialauswertung</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#163E73] mb-1">Projekt</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3BBBCE]"
              value={projektHref}
              onChange={(e) => setProjektHref(e.target.value)}
            >
              <option value="">Alle Projekte</option>
              {folders.map((f, i) => (
                <option key={i} value={f.href}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#163E73] mb-1">Von Datum</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3BBBCE]"
              value={vonDatum}
              onChange={(e) => setVonDatum(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#163E73] mb-1">Bis Datum</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3BBBCE]"
              value={bisDatum}
              onChange={(e) => setBisDatum(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={run}
          disabled={loading}
          className="w-full py-2.5 bg-[#163E73] hover:bg-[#1a4d8f] text-white rounded-xl text-sm font-medium transition disabled:opacity-60"
        >
          {loading ? "Wird ausgewertet…" : "Auswertung starten"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {result && (
        <>
          {/* Zusammenfassung */}
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[#163E73] font-semibold">Gesamtübersicht Material</h3>
                <p className="text-gray-400 text-xs mt-0.5">{result.anzahl} Einträge · {result.zusammenfassung.length} Positionen</p>
              </div>
              <button
                onClick={exportCsv}
                className="flex items-center gap-2 px-4 py-2 border border-[#217ABE] text-[#217ABE] rounded-xl text-sm font-medium hover:bg-blue-50 transition"
              >
                ⬇ CSV für Hersteller
              </button>
            </div>

            {result.zusammenfassung.length === 0 ? (
              <p className="text-gray-400 text-sm">Keine Materialdaten für diesen Filter gefunden.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#E6EEF8] text-[#163E73]">
                      <th className="text-left px-3 py-2.5 rounded-tl-lg font-medium text-xs">Artikel-Nr.</th>
                      <th className="text-left px-3 py-2.5 font-medium text-xs">Beschreibung</th>
                      <th className="text-right px-3 py-2.5 font-medium text-xs">Menge</th>
                      <th className="text-left px-3 py-2.5 rounded-tr-lg font-medium text-xs">Einheit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.zusammenfassung.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">{row.artikelNr}</td>
                        <td className="px-3 py-2 text-gray-800">{row.beschreibung}</td>
                        <td className="px-3 py-2 text-right font-bold text-[#163E73]">{row.menge}</td>
                        <td className="px-3 py-2 text-gray-500">{row.einheit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Einzeleinträge */}
          {result.eintraege.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-6">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-[#217ABE] select-none">
                  Einzeleinträge anzeigen ({result.eintraege.length})
                </summary>
                <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto">
                  {result.eintraege.map((e) => (
                    <div key={e.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex flex-wrap gap-2 text-xs text-gray-400 mb-2">
                        <span className="font-medium text-gray-600">{e.datum}</span>
                        <span>·</span>
                        <span>{e.projekt}</span>
                        <span>·</span>
                        <span>{e.arbeitsschritt}</span>
                        <span>·</span>
                        <span>{e.benutzer}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <tbody>
                            {e.material.map((m, j) => (
                              <tr key={j} className="border-b border-gray-50 last:border-0">
                                <td className="py-1 pr-3 font-mono text-gray-400 w-24">{m.artikelNr}</td>
                                <td className="py-1 pr-3 text-gray-700">{m.beschreibung}</td>
                                <td className="py-1 pr-1 text-right font-bold text-[#163E73] w-12">{m.menge}</td>
                                <td className="py-1 text-gray-400 w-8">{m.einheit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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

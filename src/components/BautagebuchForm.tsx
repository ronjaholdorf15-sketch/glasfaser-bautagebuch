"use client";
import { useState, useEffect, useRef } from "react";
import MaterialSelector, { type SelectedMaterial } from "./MaterialSelector";
import { generatePDF } from "@/lib/pdfGenerator";

const ARBEITSSCHRITTE = [
  "Tiefbau / Erdarbeiten",
  "Rohrverlegung (Leerrohre)",
  "Kabeleinzug (Glasfaser)",
  "Muffentechnik / Spleißen",
  "Hauseinführung (HÜP)",
  "Messtechnik (OTDR)",
  "Inbetriebnahme",
  "Dokumentation",
  "Abschlussinspektion",
  "Sonstiges",
];

type Folder = { name: string; href: string };

type Props = {
  username: string;
  storedCreds: { username: string; password: string };
  folders: Folder[];
  onFoldersReload: () => void;
  foldersLoading: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function BautagebuchForm({
  username, storedCreds, folders, onFoldersReload, foldersLoading,
}: Props) {
  const [datum, setDatum] = useState(today());
  const [projekt, setProjekt] = useState("");
  const [projektName, setProjektName] = useState("");
  const [arbeitsschritt, setArbeitsschritt] = useState("");
  const [bemerkung, setBemerkung] = useState("");
  const [material, setMaterial] = useState<SelectedMaterial[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  const reset = () => {
    setDatum(today());
    setProjekt(""); setProjektName("");
    setArbeitsschritt(""); setBemerkung("");
    setMaterial([]); setImages([]);
  };

  const save = async () => {
    if (!projekt) return setError("Bitte ein Projekt (Ordner) wählen.");
    if (!arbeitsschritt) return setError("Bitte einen Arbeitsschritt wählen.");

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const entryData = {
        datum,
        projekt: projektName,
        arbeitsschritt,
        bemerkung,
        material,
        benutzer: username,
        erstelltAm: new Date().toISOString(),
      };

      // Generate PDF client-side
      const pdfBlob = await generatePDF(entryData, images);
      const pdfFile = new File(
        [pdfBlob],
        `Bautagebuch_${datum}_${projektName.replace(/\s+/g, "_")}.pdf`,
        { type: "application/pdf" }
      );

      // Build multipart form
      const form = new FormData();
      form.append("username", storedCreds.username);
      form.append("password", storedCreds.password);
      form.append("folder", projekt);
      // JSON for machine-readable aggregation (material mapped to flat format)
      form.append("entry", JSON.stringify({
        ...entryData,
        material: material.map((m) => ({
          positionNr: m.position.nr,
          artikelNr: m.position.artikelNr,
          beschreibung: m.position.beschreibung,
          einheit: m.position.einheit,
          menge: m.menge,
        })),
      }));
      form.append("pdf", pdfFile);
      images.forEach((img) => form.append("images", img));

      const res = await fetch("/api/nextcloud", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`Gespeichert & PDF hochgeladen in „${projektName}"`);
      reset();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-6">

      {/* Datum + Projekt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#163E73] mb-1.5">Datum</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3BBBCE]"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#163E73] mb-1.5">Projekt</label>
          <div className="flex gap-2">
            <select
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3BBBCE]"
              value={projekt}
              onChange={(e) => {
                setProjekt(e.target.value);
                setProjektName(folders.find((f) => f.href === e.target.value)?.name || "");
              }}
            >
              <option value="">– Ordner wählen –</option>
              {folders.map((f, i) => <option key={i} value={f.href}>{f.name}</option>)}
            </select>
            <button
              onClick={onFoldersReload}
              title="Ordner neu laden"
              className="px-3 rounded-xl border border-gray-200 text-gray-400 hover:border-[#3BBBCE] hover:text-[#3BBBCE] transition text-lg"
            >
              {foldersLoading ? "…" : "↻"}
            </button>
          </div>
        </div>
      </div>

      {/* Arbeitsschritt */}
      <div>
        <label className="block text-sm font-medium text-[#163E73] mb-1.5">Arbeitsschritt</label>
        <select
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3BBBCE]"
          value={arbeitsschritt}
          onChange={(e) => setArbeitsschritt(e.target.value)}
        >
          <option value="">– Schritt wählen –</option>
          {ARBEITSSCHRITTE.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Bemerkung */}
      <div>
        <label className="block text-sm font-medium text-[#163E73] mb-1.5">Bemerkung</label>
        <textarea
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3BBBCE]"
          placeholder="Besonderheiten, Probleme, Hinweise…"
          value={bemerkung}
          onChange={(e) => setBemerkung(e.target.value)}
        />
      </div>

      {/* Materialliste */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-[#163E73]">
            Materialliste
            {material.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-[#163E73] text-white rounded-full text-xs">
                {material.length}
              </span>
            )}
          </label>
        </div>
        <MaterialSelector value={material} onChange={setMaterial} />
      </div>

      {/* Bilder */}
      <div>
        <label className="block text-sm font-medium text-[#163E73] mb-2">Fotos</label>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => setImages((p) => [...p, ...Array.from(e.target.files || [])])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2 bg-[#3BBBCE] hover:bg-[#2faabb] text-white rounded-xl text-sm font-medium transition"
        >
          📷 Fotos hinzufügen
        </button>
        {previews.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {previews.map((url, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                <button
                  type="button"
                  onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF-Hinweis */}
      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-2.5">
        <svg className="w-4 h-4 text-[#3BBBCE] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Alle Angaben und Fotos werden automatisch als PDF zusammengefasst und in Nextcloud gespeichert.
      </div>

      {/* Status */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
          ✅ {success}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3.5 bg-[#163E73] hover:bg-[#1a4d8f] text-white font-semibold rounded-xl text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            PDF wird erstellt & hochgeladen…
          </>
        ) : (
          "💾 Speichern & PDF nach Nextcloud hochladen"
        )}
      </button>
    </div>
  );
}

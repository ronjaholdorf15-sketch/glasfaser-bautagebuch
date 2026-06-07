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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#38B7CA" }}>
      {children}
    </p>
  );
}

export default function BautagebuchForm({ username, storedCreds, folders, onFoldersReload, foldersLoading }: Props) {
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
    setDatum(today()); setProjekt(""); setProjektName("");
    setArbeitsschritt(""); setBemerkung(""); setMaterial([]); setImages([]);
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white placeholder-gray-400 transition";

  const save = async () => {
    if (!projekt) return setError("Bitte ein Projekt wählen.");
    if (!arbeitsschritt) return setError("Bitte einen Arbeitsschritt wählen.");
    setSaving(true); setError(""); setSuccess("");
    try {
      const entryData = {
        datum, projekt: projektName, arbeitsschritt, bemerkung,
        material,
        benutzer: username,
        erstelltAm: new Date().toISOString(),
      };

      const pdfBlob = await generatePDF(entryData, images);
      const pdfFile = new File(
        [pdfBlob],
        `Bautagebuch_${datum}_${projektName.replace(/\s+/g, "_")}.pdf`,
        { type: "application/pdf" }
      );

      const form = new FormData();
      form.append("username", storedCreds.username);
      form.append("password", storedCreds.password);
      form.append("folder", projekt);
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

      setSuccess(`Eintrag gespeichert & PDF hochgeladen in „${projektName}"`);
      reset();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">

      {/* Top row: Datum + Projekt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Datum */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <SectionLabel>Datum</SectionLabel>
          <input
            type="date"
            className={inputCls}
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
          />
        </div>

        {/* Projekt */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <SectionLabel>Projekt / Nextcloud-Ordner</SectionLabel>
          <div className="flex gap-2">
            <select
              className={`flex-1 ${inputCls}`}
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
              title="Ordner aktualisieren"
              className="px-3.5 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-[#38B7CA] hover:border-[#38B7CA] text-lg"
            >
              {foldersLoading ? "…" : "↻"}
            </button>
          </div>
        </div>
      </div>

      {/* Arbeitsschritt */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <SectionLabel>Arbeitsschritt</SectionLabel>
        <select
          className={inputCls}
          value={arbeitsschritt}
          onChange={(e) => setArbeitsschritt(e.target.value)}
        >
          <option value="">– Bitte wählen –</option>
          {ARBEITSSCHRITTE.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Bemerkung */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <SectionLabel>Bemerkung</SectionLabel>
        <textarea
          rows={3}
          className={`${inputCls} resize-none`}
          placeholder="Besonderheiten, Probleme, Hinweise…"
          value={bemerkung}
          onChange={(e) => setBemerkung(e.target.value)}
        />
      </div>

      {/* Materialliste */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>
            Materialliste
            {material.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold"
                style={{ background: "#38B7CA" }}>
                {material.length}
              </span>
            )}
          </SectionLabel>
        </div>
        <MaterialSelector value={material} onChange={setMaterial} />
      </div>

      {/* Fotos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <SectionLabel>Fotos</SectionLabel>
        <input ref={fileRef} type="file" multiple accept="image/*" capture="environment" className="hidden"
          onChange={(e) => setImages((p) => [...p, ...Array.from(e.target.files || [])])} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, #1E75B8, #38B7CA)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Fotos hinzufügen
        </button>
        {previews.length > 0 && (
          <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 gap-2">
            {previews.map((url, i) => (
              <div key={i} className="relative group aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover rounded-xl border border-gray-100" />
                <button
                  type="button"
                  onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition text-white text-xl"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF info */}
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm"
        style={{ background: "linear-gradient(135deg, #E8F4F8, #EEF6FA)", border: "1px solid #C8E6F0" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #1E75B8, #38B7CA)" }}>
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p style={{ color: "#113462" }}>
          Alle Angaben und Fotos werden automatisch als <strong>PDF</strong> zusammengefasst und in Nextcloud gespeichert. Die Materialdaten werden in der Datenbank für die Auswertung gesichert.
        </p>
      </div>

      {/* Status */}
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

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-4 rounded-2xl text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
        style={{ background: saving ? "#38B7CA" : "linear-gradient(135deg, #113462 0%, #1E75B8 60%, #38B7CA 100%)" }}
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
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Speichern & in Nextcloud hochladen
          </>
        )}
      </button>
    </div>
  );
}

"use client";
import { useState, useEffect, useRef } from "react";

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

const EINHEITEN = ["ST", "m", "m²", "Rolle", "Pkg", "kg", "l"];

type MaterialRow = { name: string; menge: string; einheit: string };
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
  username,
  storedCreds,
  folders,
  onFoldersReload,
  foldersLoading,
}: Props) {
  const [datum, setDatum] = useState(today());
  const [projekt, setProjekt] = useState("");
  const [projektName, setProjektName] = useState("");
  const [arbeitsschritt, setArbeitsschritt] = useState("");
  const [bemerkung, setBemerkung] = useState("");
  const [material, setMaterial] = useState<MaterialRow[]>([{ name: "", menge: "", einheit: "ST" }]);
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

  const addRow = () => setMaterial((p) => [...p, { name: "", menge: "", einheit: "ST" }]);
  const removeRow = (i: number) => setMaterial((p) => p.filter((_, j) => j !== i));
  const updateRow = (i: number, field: keyof MaterialRow, val: string) =>
    setMaterial((p) => p.map((r, j) => (j === i ? { ...r, [field]: val } : r)));

  const reset = () => {
    setDatum(today());
    setProjekt("");
    setProjektName("");
    setArbeitsschritt("");
    setBemerkung("");
    setMaterial([{ name: "", menge: "", einheit: "ST" }]);
    setImages([]);
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
        material: material
          .filter((m) => m.name.trim())
          .map((m) => ({ name: m.name.trim(), menge: parseFloat(m.menge) || 0, einheit: m.einheit })),
        benutzer: username,
        erstelltAm: new Date().toISOString(),
      };
      const form = new FormData();
      form.append("username", storedCreds.username);
      form.append("password", storedCreds.password);
      form.append("folder", projekt);
      form.append("entry", JSON.stringify(entryData));
      images.forEach((img) => form.append("images", img));

      const res = await fetch("/api/nextcloud", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Erfolgreich gespeichert im Projekt „${projektName}"`);
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
              {folders.map((f, i) => (
                <option key={i} value={f.href}>{f.name}</option>
              ))}
            </select>
            <button
              onClick={onFoldersReload}
              title="Ordner neu laden"
              className="px-3 rounded-xl border border-gray-200 text-gray-500 hover:border-[#3BBBCE] hover:text-[#3BBBCE] transition text-lg"
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
          {ARBEITSSCHRITTE.map((s) => (
            <option key={s}>{s}</option>
          ))}
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
          <label className="text-sm font-medium text-[#163E73]">Materialliste</label>
          <button
            onClick={addRow}
            className="text-xs px-3 py-1.5 bg-[#217ABE] hover:bg-[#1a6aaa] text-white rounded-lg transition"
          >
            + Zeile hinzufügen
          </button>
        </div>
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_90px_36px] gap-px bg-[#E6EEF8] px-3 py-2 text-xs font-medium text-[#163E73]">
            <span>Material / Artikel</span>
            <span>Menge</span>
            <span>Einheit</span>
            <span />
          </div>
          <div className="divide-y divide-gray-50">
            {material.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_90px_36px] gap-2 items-center px-2 py-2 bg-white">
                <input
                  type="text"
                  placeholder="z. B. Glasfaserkabel SM 12x"
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3BBBCE]"
                  value={row.name}
                  onChange={(e) => updateRow(i, "name", e.target.value)}
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0"
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#3BBBCE]"
                  value={row.menge}
                  onChange={(e) => updateRow(i, "menge", e.target.value)}
                />
                <select
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3BBBCE]"
                  value={row.einheit}
                  onChange={(e) => updateRow(i, "einheit", e.target.value)}
                >
                  {EINHEITEN.map((u) => <option key={u}>{u}</option>)}
                </select>
                <button
                  onClick={() => removeRow(i)}
                  className="text-gray-300 hover:text-red-400 text-xl leading-none transition"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
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

      {/* Status */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
          ✅ {success}
        </div>
      )}

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3.5 bg-[#163E73] hover:bg-[#1a4d8f] text-white font-semibold rounded-xl text-sm transition disabled:opacity-60"
      >
        {saving ? "Wird hochgeladen…" : "💾 Speichern & in Nextcloud hochladen"}
      </button>
    </div>
  );
}

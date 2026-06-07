"use client";
import { useState, useRef, useEffect } from "react";
import { MATERIAL_POSITIONEN, type MaterialPosition } from "@/lib/materialListe";

export type SelectedMaterial = {
  position: MaterialPosition;
  menge: number;
};

type Props = {
  value: SelectedMaterial[];
  onChange: (v: SelectedMaterial[]) => void;
};

export default function MaterialSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = MATERIAL_POSITIONEN.filter(
    (p) =>
      p.beschreibung.toLowerCase().includes(search.toLowerCase()) ||
      p.artikelNr.includes(search) ||
      String(p.nr).includes(search)
  );

  const isSelected = (nr: number) => value.some((v) => v.position.nr === nr);

  const toggle = (pos: MaterialPosition) => {
    if (isSelected(pos.nr)) onChange(value.filter((v) => v.position.nr !== pos.nr));
    else onChange([...value, { position: pos, menge: 1 }]);
  };

  const updateMenge = (nr: number, menge: number) =>
    onChange(value.map((v) => (v.position.nr === nr ? { ...v, menge } : v)));

  return (
    <div className="space-y-3">
      {/* Trigger */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-left bg-white hover:border-[#38B7CA] transition"
        >
          <span className={value.length === 0 ? "text-gray-400" : "font-medium"} style={{ color: value.length > 0 ? "#113462" : undefined }}>
            {value.length === 0
              ? "– Positionen auswählen –"
              : `${value.length} Position${value.length > 1 ? "en" : ""} ausgewählt`}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            {/* Search bar */}
            <div className="p-3 border-b border-gray-100"
              style={{ background: "linear-gradient(135deg, #F0F8FA, #F8FCFD)" }}>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Suchen nach Name oder Artikel-Nr…"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-64">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Keine Treffer</p>
              ) : (
                filtered.map((pos) => {
                  const selected = isSelected(pos.nr);
                  return (
                    <button
                      key={pos.nr}
                      type="button"
                      onClick={() => toggle(pos)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                        selected ? "bg-[#E8F4F8]" : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition ${
                        selected ? "border-[#38B7CA] bg-[#38B7CA]" : "border-gray-300"
                      }`}>
                        {selected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                      </div>
                      {/* Nr */}
                      <span className="text-xs text-gray-400 w-5 flex-shrink-0">{pos.nr}.</span>
                      {/* Description */}
                      <span className="flex-1 min-w-0">
                        <span style={{ color: selected ? "#113462" : "#374151" }}>{pos.beschreibung}</span>
                        <span className="ml-2 text-gray-400 text-xs font-mono">({pos.artikelNr})</span>
                      </span>
                      {/* Unit */}
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: "#E8F4F8", color: "#38B7CA" }}>
                        {pos.einheit}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected items table */}
      {value.length > 0 && (
        <div className="rounded-xl overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_100px_32px] gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wide"
            style={{ background: "linear-gradient(135deg, #113462, #1E75B8)", color: "white" }}>
            <span>Pos.</span>
            <span>Beschreibung</span>
            <span className="text-right">Menge / Einheit</span>
            <span />
          </div>
          {/* Rows */}
          {value.map(({ position, menge }, i) => (
            <div
              key={position.nr}
              className={`grid grid-cols-[auto_1fr_100px_32px] gap-3 items-center px-4 py-2.5 ${
                i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
              }`}
            >
              <span className="text-xs font-mono text-gray-400 w-5">{position.nr}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#113462" }}>{position.beschreibung}</p>
                <p className="text-xs text-gray-400 font-mono">({position.artikelNr})</p>
              </div>
              <div className="flex items-center gap-1 justify-end">
                <input
                  type="number"
                  min={0}
                  step={position.einheit === "M" ? 0.5 : 1}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-right w-14 bg-white"
                  value={menge}
                  onChange={(e) => updateMenge(position.nr, parseFloat(e.target.value) || 0)}
                />
                <span className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={{ background: "#E8F4F8", color: "#38B7CA" }}>
                  {position.einheit}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggle(position)}
                className="text-gray-300 hover:text-red-400 text-lg leading-none text-center transition"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

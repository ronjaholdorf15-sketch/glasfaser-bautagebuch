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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
    if (isSelected(pos.nr)) {
      onChange(value.filter((v) => v.position.nr !== pos.nr));
    } else {
      onChange([...value, { position: pos, menge: 1 }]);
    }
  };

  const updateMenge = (nr: number, menge: number) => {
    onChange(value.map((v) => (v.position.nr === nr ? { ...v, menge } : v)));
  };

  return (
    <div className="space-y-3">
      {/* Dropdown trigger */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-left focus:outline-none focus:ring-2 focus:ring-[#3BBBCE] bg-white"
        >
          <span className="text-gray-500">
            {value.length === 0
              ? "– Positionen auswählen –"
              : `${value.length} Position${value.length > 1 ? "en" : ""} ausgewählt`}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                placeholder="Suchen (Name, Artikel-Nr.)…"
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3BBBCE]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            {/* List */}
            <div className="overflow-y-auto max-h-64">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Keine Treffer</p>
              ) : (
                filtered.map((pos) => (
                  <button
                    key={pos.nr}
                    type="button"
                    onClick={() => toggle(pos)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition ${
                      isSelected(pos.nr) ? "bg-[#E6EEF8]" : ""
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition ${
                        isSelected(pos.nr)
                          ? "bg-[#163E73] border-[#163E73]"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected(pos.nr) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-gray-400 text-xs w-5 flex-shrink-0">{pos.nr}.</span>
                    <span className="flex-1 min-w-0">
                      <span className="text-gray-700">{pos.beschreibung}</span>
                      <span className="ml-2 text-gray-400 text-xs">({pos.artikelNr})</span>
                    </span>
                    <span className="text-gray-400 text-xs flex-shrink-0">{pos.einheit}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected items with quantity */}
      {value.length > 0 && (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[1fr_90px_32px] gap-px bg-[#E6EEF8] px-3 py-2 text-xs font-medium text-[#163E73]">
            <span>Position</span>
            <span className="text-right">Menge</span>
            <span />
          </div>
          <div className="divide-y divide-gray-50">
            {value.map(({ position, menge }) => (
              <div
                key={position.nr}
                className="grid grid-cols-[1fr_90px_32px] gap-2 items-center px-3 py-2 bg-white"
              >
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{position.beschreibung}</p>
                  <p className="text-xs text-gray-400">({position.artikelNr}) · {position.einheit}</p>
                </div>
                <input
                  type="number"
                  min={0}
                  step={position.einheit === "M" ? 0.5 : 1}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#3BBBCE] w-full"
                  value={menge}
                  onChange={(e) => updateMenge(position.nr, parseFloat(e.target.value) || 0)}
                />
                <button
                  type="button"
                  onClick={() => toggle(position)}
                  className="text-gray-300 hover:text-red-400 text-xl leading-none transition text-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

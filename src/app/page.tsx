"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import LoginForm from "@/components/LoginForm";
import BautagebuchForm from "@/components/BautagebuchForm";
import MaterialAuswertung from "@/components/MaterialAuswertung";

type Creds = { username: string; password: string; isAdmin: boolean };
type Folder = { name: string; href: string };
type Tab = "eintrag" | "auswertung";

export default function HomePage() {
  const [creds, setCreds] = useState<Creds | null>(null);
  const [tab, setTab] = useState<Tab>("eintrag");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("bt_creds") || sessionStorage.getItem("bt_creds");
      if (s) setCreds(JSON.parse(s));
    } catch (_) {}
  }, []);

  const loadFolders = useCallback(async (c: Creds) => {
    setFoldersLoading(true);
    try {
      const res = await fetch("/api/nextcloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "folders", username: c.username, password: c.password }),
      });
      const data = await res.json();
      if (res.ok) setFolders(data.folders || []);
    } catch (_) {}
    setFoldersLoading(false);
  }, []);

  const handleLogin = (c: Creds & { remember: boolean }) => {
    const stored = { username: c.username, password: c.password, isAdmin: c.isAdmin };
    setCreds(stored);
    try {
      const s = JSON.stringify(stored);
      if (c.remember) localStorage.setItem("bt_creds", s);
      else sessionStorage.setItem("bt_creds", s);
    } catch (_) {}
    loadFolders(stored);
  };

  const handleLogout = () => {
    setCreds(null); setFolders([]);
    try { localStorage.removeItem("bt_creds"); sessionStorage.removeItem("bt_creds"); } catch (_) {}
  };

  useEffect(() => { if (creds) loadFolders(creds); }, [creds, loadFolders]);

  if (!creds) return <LoginForm onLogin={handleLogin} />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8" }}>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          {/* Logo */}
          <Image
            src="/itkom-logo.svg"
            alt="IT-KOM"
            width={130}
            height={48}
            className="h-10 w-auto object-contain"
          />

          {/* Divider */}
          <div className="h-8 w-px bg-gray-200" />

          {/* App name */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#38B7CA" }}>
              Glasfaserausbau
            </p>
            <p className="text-sm font-bold leading-none" style={{ color: "#113462" }}>
              Bautagebuch
            </p>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User badge */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-gray-500">Angemeldet als</span>
              <span className="text-sm font-semibold" style={{ color: "#113462" }}>
                {creds.username}
                {creds.isAdmin && (
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                    style={{ background: "linear-gradient(135deg, #113462, #38B7CA)" }}>
                    Admin
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Abmelden
            </button>
          </div>
        </div>

        {/* Tab navigation — only for admins */}
        {creds.isAdmin && (
          <div className="max-w-4xl mx-auto px-4 flex gap-0 border-t border-gray-100">
            {([
              { key: "eintrag", label: "Neuer Eintrag", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
              { key: "auswertung", label: "Materialauswertung", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
            ] as { key: Tab; label: string; icon: string }[]).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition ${
                  tab === t.key
                    ? "border-[#38B7CA] text-[#113462]"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
                </svg>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {tab === "auswertung" && creds.isAdmin ? (
          <MaterialAuswertung storedCreds={creds} folders={folders} />
        ) : (
          <BautagebuchForm
            username={creds.username}
            storedCreds={creds}
            folders={folders}
            onFoldersReload={() => loadFolders(creds)}
            foldersLoading={foldersLoading}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <Image src="/itkom-logo.svg" alt="IT-KOM" width={80} height={30} className="h-6 w-auto opacity-50" />
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} IT-KOM Telekommunikationstechnik GmbH
          </p>
        </div>
      </footer>
    </div>
  );
}

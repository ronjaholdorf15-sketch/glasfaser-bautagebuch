"use client";
import { useState, useEffect, useCallback } from "react";
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
    setCreds(null);
    setFolders([]);
    try {
      localStorage.removeItem("bt_creds");
      sessionStorage.removeItem("bt_creds");
    } catch (_) {}
  };

  useEffect(() => {
    if (creds) loadFolders(creds);
  }, [creds, loadFolders]);

  if (!creds) return <LoginForm onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#163E73] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[#163E73] font-bold text-base leading-none">Bautagebuch</h1>
            <p className="text-gray-400 text-xs mt-0.5 truncate">
              Glasfaserausbau · {creds.username}
              {creds.isAdmin && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-[#E6EEF8] text-[#163E73] rounded text-xs font-medium">
                  Admin
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 transition px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300"
          >
            Abmelden
          </button>
        </div>

        {creds.isAdmin && (
          <div className="max-w-3xl mx-auto px-4 flex">
            {(["eintrag", "auswertung"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  tab === t
                    ? "border-[#163E73] text-[#163E73]"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {t === "eintrag" ? "📋 Neuer Eintrag" : "📊 Material auswerten"}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
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

      <footer className="mt-8 pb-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Glasfaser Bautagebuch
      </footer>
    </div>
  );
}

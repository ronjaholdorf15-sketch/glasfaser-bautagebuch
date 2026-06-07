"use client";
import { useState } from "react";

type Props = {
  onLogin: (c: { username: string; password: string; remember: boolean; isAdmin: boolean }) => void;
};

export default function LoginForm({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doLogin = async () => {
    if (!username || !password) {
      setError("Bitte Benutzername und App-Passwort eingeben.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/nextcloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login fehlgeschlagen");
      onLogin({ username, password, remember, isAdmin: !!data.isAdmin });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2a4a] to-[#1a4a7a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-[#163E73] px-8 py-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#3BBBCE] flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">Bautagebuch</h1>
              <p className="text-[#3BBBCE] text-sm">Glasfaserausbau</p>
            </div>
          </div>

          <div className="px-8 py-8">
            <h2 className="text-[#163E73] text-lg font-semibold mb-1">Nextcloud Login</h2>
            <p className="text-gray-500 text-sm mb-6">
              Melde dich mit deinem Nextcloud-Konto an.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); doLogin(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#163E73] mb-1">
                  Benutzername
                </label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3BBBCE] focus:border-transparent transition"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="z. B. ronja"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#163E73] mb-1">
                  App-Passwort
                </label>
                <input
                  type="password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3BBBCE] focus:border-transparent transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nextcloud App-Passwort"
                  autoComplete="current-password"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded"
                />
                Angemeldet bleiben
              </label>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#163E73] hover:bg-[#1a4d8f] text-white font-semibold py-3 rounded-xl text-sm transition disabled:opacity-60 mt-2"
              >
                {loading ? "Wird geprüft…" : "Anmelden"}
              </button>
            </form>

            <p className="mt-6 text-xs text-gray-400 text-center">
              App-Passwort: Nextcloud → Einstellungen → Sicherheit → App-Passwörter
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import Image from "next/image";

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
    if (!username || !password) { setError("Bitte alle Felder ausfüllen."); return; }
    setLoading(true); setError("");
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
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-animated flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background decorative circles */}
      <div className="absolute top-[-120px] right-[-120px] w-[500px] h-[500px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #38B7CA, transparent)" }} />
      <div className="absolute bottom-[-80px] left-[-80px] w-[350px] h-[350px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #1E75B8, transparent)" }} />

      <div className="w-full max-w-md relative z-10">

        {/* Logo area */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-2xl px-8 py-5 shadow-2xl">
            <Image
              src="/itkom-logo.svg"
              alt="IT-KOM Telekommunikationstechnik GmbH"
              width={220}
              height={80}
              priority
              className="h-16 w-auto object-contain"
            />
          </div>
        </div>

        {/* Login card */}
        <div className="glass rounded-3xl shadow-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1" style={{ background: "linear-gradient(90deg, #113462, #1E75B8, #38B7CA)" }} />

          <div className="px-8 py-8">
            <h2 className="text-xl font-bold mb-1" style={{ color: "#113462" }}>Willkommen</h2>
            <p className="text-sm text-gray-500 mb-7">Melde dich mit deinem Nextcloud-Konto an.</p>

            <form onSubmit={(e) => { e.preventDefault(); doLogin(); }} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#113462" }}>
                  Benutzername
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm bg-white/80 placeholder-gray-400"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="z. B. ronja"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#113462" }}>
                  App-Passwort
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm bg-white/80 placeholder-gray-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nextcloud App-Passwort"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Remember */}
              <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer select-none">
                <div className="relative">
                  <input type="checkbox" className="sr-only peer" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <div className="w-9 h-5 rounded-full border-2 border-gray-300 peer-checked:border-[#38B7CA] peer-checked:bg-[#38B7CA] transition-all" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                Angemeldet bleiben
              </label>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60 mt-2 relative overflow-hidden"
                style={{ background: loading ? "#38B7CA" : "linear-gradient(135deg, #113462 0%, #1E75B8 60%, #38B7CA 100%)" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Wird geprüft…
                  </span>
                ) : "Anmelden →"}
              </button>
            </form>

            <p className="mt-6 text-xs text-gray-400 text-center">
              App-Passwort erstellen: Nextcloud → Einstellungen → Sicherheit
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-white/40 mt-6">
          © {new Date().getFullYear()} IT-KOM Telekommunikationstechnik GmbH
        </p>
      </div>
    </div>
  );
}

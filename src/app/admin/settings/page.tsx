"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push("/admin");
      return;
    }

    setSession(session);
    await check2FAStatus(session);
    setLoading(false);
  }

  async function check2FAStatus(session: any) {
    try {
      const res = await fetch("/api/admin/2fa/status", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();
      setTwoFactorEnabled(data.enabled || false);
    } catch (err) {
      console.error("Failed to check 2FA status:", err);
    }
  }

  async function startSetup() {
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/2fa/setup", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Setup failed");
      }

      const data = await res.json();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setSetupMode(true);
    } catch (err) {
      setError("Failed to start 2FA setup");
    }
  }

  async function enable2FA() {
    setError("");
    setMessage("");

    if (verificationCode.length !== 6) {
      setError("Code moet 6 cijfers zijn");
      return;
    }

    try {
      const res = await fetch("/api/admin/2fa/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Enable failed");
      }

      setMessage("✅ 2FA succesvol ingeschakeld!");
      setTwoFactorEnabled(true);
      setSetupMode(false);
      setVerificationCode("");
    } catch (err: any) {
      setError(err.message || "Failed to enable 2FA");
    }
  }

  async function disable2FA() {
    const code = prompt("Voer je huidige 2FA code in om uit te schakelen:");
    if (!code) return;

    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/2fa/enable", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Disable failed");
      }

      setMessage("✅ 2FA uitgeschakeld");
      setTwoFactorEnabled(false);
    } catch (err: any) {
      setError(err.message || "Failed to disable 2FA");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-neutral-600">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin")}
            className="text-[#F27501] hover:text-[#d96800] mb-4 flex items-center gap-2"
          >
            ← Terug naar Dashboard
          </button>
          <h1 className="text-3xl font-bold text-neutral-900">Admin Instellingen</h1>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* 2FA Section */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
                🔒 Two-Factor Authentication
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                Extra beveiliging voor je admin account
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              twoFactorEnabled
                ? "bg-green-100 text-green-700"
                : "bg-neutral-100 text-neutral-700"
            }`}>
              {twoFactorEnabled ? "✓ Actief" : "Inactief"}
            </div>
          </div>

          {!setupMode && !twoFactorEnabled && (
            <div>
              <p className="text-neutral-700 mb-4">
                Beveilig je account met een extra verificatiestap. Je hebt een authenticator app nodig zoals:
              </p>
              <ul className="list-disc list-inside text-neutral-600 mb-6 space-y-1">
                <li>Google Authenticator (iOS/Android)</li>
                <li>Authy (iOS/Android/Desktop)</li>
                <li>Microsoft Authenticator (iOS/Android)</li>
              </ul>
              <button
                onClick={startSetup}
                className="px-6 py-3 bg-[#F27501] text-white rounded-lg hover:bg-[#d96800] font-medium"
              >
                2FA Instellen
              </button>
            </div>
          )}

          {!setupMode && twoFactorEnabled && (
            <div>
              <p className="text-neutral-700 mb-4">
                Two-factor authentication is actief voor je account. Bij elke login wordt naast je wachtwoord ook een 6-cijferige code gevraagd.
              </p>
              <button
                onClick={disable2FA}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                2FA Uitschakelen
              </button>
            </div>
          )}

          {setupMode && (
            <div className="space-y-6">
              {/* Step 1: QR Code */}
              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">
                  Stap 1: Scan QR Code
                </h3>
                <p className="text-sm text-neutral-600 mb-4">
                  Open je authenticator app en scan deze QR code:
                </p>
                <div className="bg-white p-4 rounded-lg border-2 border-neutral-200 inline-block">
                  <img src={qrCode} alt="2FA QR Code" className="w-64 h-64" />
                </div>
              </div>

              {/* Step 2: Manual Entry */}
              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">
                  Of voer handmatig in:
                </h3>
                <div className="bg-neutral-100 p-3 rounded font-mono text-sm">
                  {secret}
                </div>
              </div>

              {/* Step 3: Backup Codes */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  ⚠️ Bewaar deze backup codes!
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  Deze codes kun je gebruiken als je geen toegang hebt tot je authenticator app.
                  Elke code werkt maar 1 keer. Bewaar ze veilig!
                </p>
                <div className="bg-white p-4 rounded border border-yellow-300 grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((code, i) => (
                    <div key={i} className="text-neutral-700">{code}</div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(backupCodes.join("\n"));
                    setMessage("Backup codes gekopieerd naar clipboard");
                    setTimeout(() => setMessage(""), 3000);
                  }}
                  className="mt-3 text-sm text-yellow-700 hover:text-yellow-900 underline"
                >
                  📋 Kopieer alle codes
                </button>
              </div>

              {/* Step 4: Verify */}
              <div>
                <h3 className="font-semibold text-neutral-900 mb-2">
                  Stap 4: Verifieer
                </h3>
                <p className="text-sm text-neutral-600 mb-3">
                  Voer de 6-cijferige code in uit je authenticator app:
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg font-mono text-lg text-center tracking-widest"
                    maxLength={6}
                  />
                  <button
                    onClick={enable2FA}
                    disabled={verificationCode.length !== 6}
                    className="px-6 py-3 bg-[#F27501] text-white rounded-lg hover:bg-[#d96800] font-medium disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    Verifieer & Activeer
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setSetupMode(false);
                  setVerificationCode("");
                }}
                className="text-neutral-600 hover:text-neutral-900 text-sm"
              >
                Annuleren
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

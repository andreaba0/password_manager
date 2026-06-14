import { useState } from "react";
import { Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

type Props = { onLogin: () => void };

export function LoginPage({ onLogin }: Props) {
  const [showPassword,       setShowPassword]       = useState(false);
  const [showMasterPassword, setShowMasterPassword] = useState(false);

  return (
    <div
      className="flex h-screen w-full items-center justify-center"
      style={{ background: "var(--sidebar)" }}
    >
      {/* Card */}
      <div
        className="w-full mx-4 rounded-2xl overflow-hidden"
        style={{ maxWidth: 400, background: "var(--card)", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}
      >
        {/* Top stripe */}
        <div
          className="px-8 pt-8 pb-6 flex flex-col items-center"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--primary)" }}
          >
            <Lock size={22} color="white" />
          </div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--foreground)", textAlign: "center" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: "0.82rem", color: "var(--muted-foreground)", marginTop: "0.3rem", textAlign: "center" }}>
            Sign in to unlock your vault
          </p>
        </div>

        {/* Form */}
        <form
          className="px-8 py-6 space-y-4"
          onSubmit={(e) => { e.preventDefault(); onLogin(); }}
        >
          <Field label="Email or Username">
            <input
              type="text"
              placeholder="you@example.com"
              autoComplete="username"
              className="w-full px-3 py-2.5 rounded-xl outline-none transition-colors"
              style={{
                background: "var(--input-background)",
                border: "1px solid var(--border)",
                fontSize: "0.88rem",
                color: "var(--foreground)",
              }}
            />
          </Field>

          <Field label="Password">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full px-3 py-2.5 pr-10 rounded-xl outline-none transition-colors"
                style={{
                  background: "var(--input-background)",
                  border: "1px solid var(--border)",
                  fontSize: "0.88rem",
                  color: "var(--foreground)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword
                  ? <EyeOff size={15} style={{ color: "var(--muted-foreground)" }} />
                  : <Eye size={15} style={{ color: "var(--muted-foreground)" }} />
                }
              </button>
            </div>
          </Field>

          <Field label="Master Password">
            <div className="relative">
              <input
                type={showMasterPassword ? "text" : "password"}
                placeholder="••••••••••••"
                autoComplete="off"
                className="w-full px-3 py-2.5 pr-10 rounded-xl outline-none transition-colors"
                style={{
                  background: "var(--input-background)",
                  border: "1px solid var(--border)",
                  fontSize: "0.88rem",
                  color: "var(--foreground)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowMasterPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showMasterPassword
                  ? <EyeOff size={15} style={{ color: "var(--muted-foreground)" }} />
                  : <Eye size={15} style={{ color: "var(--muted-foreground)" }} />
                }
              </button>
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "0.4rem" }}>
              Your master password is never sent to our servers.
            </p>
          </Field>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-opacity hover:opacity-90 active:opacity-80 mt-2"
            style={{ background: "var(--primary)", color: "white" }}
          >
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Unlock Vault</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
            Forgot your master password?{" "}
            <button style={{ color: "var(--primary)", fontWeight: 500 }}>
              Get help
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

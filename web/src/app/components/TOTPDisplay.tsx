import { useState, useEffect, useCallback } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";

async function generateTOTP(secret: string): Promise<string> {
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

  let bits = "";
  for (const char of secret.toUpperCase().replace(/=+$/, "").replace(/\s/g, "")) {
    const val = base32Chars.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
  }

  const counter = Math.floor(Date.now() / 1000 / 30);
  const counterBytes = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, counterBytes);
  const hmac = new Uint8Array(sig);

  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1_000_000).toString().padStart(6, "0");
}

function getSecondsRemaining() {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

type Props = { secret: string };

export function TOTPDisplay({ secret }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(getSecondsRemaining());
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const c = await generateTOTP(secret);
      setCode(c);
      setError(false);
    } catch {
      setError(true);
    }
  }, [secret]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const tick = setInterval(() => {
      const secs = getSecondsRemaining();
      setSecondsLeft(secs);
      if (secs === 30) refresh();
    }, 1000);
    return () => clearInterval(tick);
  }, [refresh]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const progress = secondsLeft / 30;
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * progress;

  const urgent = secondsLeft <= 7;

  if (error) {
    return (
      <p style={{ fontSize: "0.78rem", color: "var(--destructive)" }}>
        Invalid TOTP secret
      </p>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* Code */}
      <div className="flex items-center gap-1.5">
        {code
          ? [code.slice(0, 3), code.slice(3)].map((group, i) => (
              <span
                key={i}
                style={{
                  fontSize: "1.6rem",
                  fontFamily: "monospace",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  color: urgent ? "var(--destructive)" : "var(--primary)",
                  transition: "color 0.3s",
                }}
              >
                {group}
              </span>
            ))
          : <span style={{ fontSize: "1.6rem", fontFamily: "monospace", color: "var(--muted-foreground)" }}>
              ······
            </span>
        }
      </div>

      {/* Countdown ring */}
      <div className="relative flex items-center justify-center" style={{ width: 32, height: 32 }}>
        <svg width="32" height="32" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx="16" cy="16" r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="2.5"
          />
          {/* Progress */}
          <circle
            cx="16" cy="16" r={radius}
            fill="none"
            stroke={urgent ? "var(--destructive)" : "var(--primary)"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            style={{ transition: "stroke-dasharray 0.9s linear, stroke 0.3s" }}
          />
        </svg>
        <span style={{ fontSize: "0.62rem", fontWeight: 600, color: urgent ? "var(--destructive)" : "var(--muted-foreground)", position: "relative" }}>
          {secondsLeft}
        </span>
      </div>

      {/* Copy */}
      <button
        onClick={handleCopy}
        className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-black/5"
        title="Copy code"
      >
        {copied
          ? <Check size={14} style={{ color: "#10b981" }} />
          : <Copy size={14} style={{ color: "var(--muted-foreground)" }} />
        }
      </button>

      {/* Force refresh */}
      <button
        onClick={refresh}
        className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-black/5"
        title="Refresh"
      >
        <RefreshCw size={13} style={{ color: "var(--muted-foreground)" }} />
      </button>
    </div>
  );
}

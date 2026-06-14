import { useState } from "react";
import {
  Eye,
  EyeOff,
  Copy,
  Star,
  ExternalLink,
  Globe,
  CreditCard,
  FileText,
  Wifi,
  Key,
  Tag,
  Clock,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import type { VaultItem } from "./data";
import { TOTPDisplay } from "./TOTPDisplay";

type Props = {
  item: VaultItem | null;
};

export function DetailPanel({ item }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ background: "var(--background)" }}>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "var(--muted)" }}
        >
          <Key size={24} style={{ color: "var(--muted-foreground)" }} />
        </div>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.88rem" }}>
          Select an item to view details
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
            style={{ background: item.color }}
          >
            <TypeIcon type={item.type} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--foreground)" }}>
              {item.title}
            </h1>
            <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>{item.subtitle}</p>
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1"
                    style={{
                      background: "var(--secondary)",
                      color: "var(--muted-foreground)",
                      fontSize: "0.68rem",
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: 9999,
                    }}
                  >
                    <Tag size={9} />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <IconBtn title="Favorite">
              <Star size={15} fill={item.favorite ? "#f59e0b" : "none"} color={item.favorite ? "#f59e0b" : "var(--muted-foreground)"} />
            </IconBtn>
            <IconBtn title="Edit">
              <Pencil size={15} style={{ color: "var(--muted-foreground)" }} />
            </IconBtn>
            <IconBtn title="Delete">
              <Trash2 size={15} style={{ color: "var(--muted-foreground)" }} />
            </IconBtn>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {/* Login fields */}
        {item.type === "login" && (
          <>
            {item.url && (
              <Field label="Website">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "0.84rem", color: "var(--foreground)" }}>{item.url}</span>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0">
                    <ExternalLink size={13} style={{ color: "var(--primary)" }} />
                  </a>
                </div>
              </Field>
            )}
            {item.username && (
              <Field label="Username">
                <CopyRow value={item.username} field="username" copied={copied} onCopy={handleCopy} />
              </Field>
            )}
            {item.totp && (
              <Field label="One-Time Password">
                <TOTPDisplay secret={item.totp} />
              </Field>
            )}
            {item.password && (
              <Field label="Password">
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontSize: "0.84rem",
                      color: "var(--foreground)",
                      fontFamily: showPassword ? "inherit" : "monospace",
                      letterSpacing: showPassword ? "normal" : "0.12em",
                    }}
                  >
                    {showPassword ? item.password : "•".repeat(Math.min(item.password.length, 18))}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <IconBtn title={showPassword ? "Hide" : "Reveal"} onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? (
                        <EyeOff size={13} style={{ color: "var(--muted-foreground)" }} />
                      ) : (
                        <Eye size={13} style={{ color: "var(--muted-foreground)" }} />
                      )}
                    </IconBtn>
                    <CopyBtn value={item.password} field="password" copied={copied} onCopy={handleCopy} />
                  </div>
                </div>
                {item.password && <PasswordStrength password={item.password} />}
              </Field>
            )}
          </>
        )}

        {/* Credit card */}
        {item.type === "card" && (
          <>
            <CreditCardPreview item={item} />
            {item.cardNumber && (
              <Field label="Card Number">
                <CopyRow value={item.cardNumber} field="cardNumber" copied={copied} onCopy={handleCopy} />
              </Field>
            )}
            {item.cardHolder && (
              <Field label="Cardholder Name">
                <span style={{ fontSize: "0.84rem", color: "var(--foreground)" }}>{item.cardHolder}</span>
              </Field>
            )}
            <div className="flex gap-4">
              {item.cardExpiry && (
                <Field label="Expiry">
                  <span style={{ fontSize: "0.84rem", color: "var(--foreground)" }}>{item.cardExpiry}</span>
                </Field>
              )}
              {item.cardCVV && (
                <Field label="CVV">
                  <span style={{ fontSize: "0.84rem", color: "var(--foreground)", fontFamily: "monospace" }}>{item.cardCVV}</span>
                </Field>
              )}
            </div>
          </>
        )}

        {/* Note */}
        {item.type === "note" && item.notes && (
          <Field label="Contents">
            <pre
              style={{
                fontSize: "0.82rem",
                color: "var(--foreground)",
                fontFamily: "monospace",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {item.notes}
            </pre>
          </Field>
        )}

        {/* Wifi */}
        {item.type === "wifi" && (
          <>
            <Field label="Network Name (SSID)">
              <CopyRow value={item.subtitle} field="ssid" copied={copied} onCopy={handleCopy} />
            </Field>
            {item.wifiPassword && (
              <Field label="Password">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "0.84rem", color: "var(--foreground)", fontFamily: "monospace", letterSpacing: "0.12em" }}>
                    {"•".repeat(item.wifiPassword.length)}
                  </span>
                  <CopyBtn value={item.wifiPassword} field="wifi" copied={copied} onCopy={handleCopy} />
                </div>
              </Field>
            )}
          </>
        )}

        {/* API Key */}
        {item.type === "key" && (
          <>
            {item.apiKey && (
              <Field label="API Key">
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--foreground)",
                      fontFamily: "monospace",
                      flex: 1,
                      wordBreak: "break-all",
                    }}
                  >
                    {showKey ? "sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcd" : item.apiKey}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <IconBtn onClick={() => setShowKey((v) => !v)}>
                      {showKey ? <EyeOff size={13} style={{ color: "var(--muted-foreground)" }} /> : <Eye size={13} style={{ color: "var(--muted-foreground)" }} />}
                    </IconBtn>
                    <CopyBtn value={item.apiKey} field="key" copied={copied} onCopy={handleCopy} />
                  </div>
                </div>
              </Field>
            )}
          </>
        )}

        {/* Notes (generic) */}
        {item.notes && item.type !== "note" && (
          <Field label="Notes">
            <p style={{ fontSize: "0.82rem", color: "var(--foreground)", lineHeight: 1.6 }}>{item.notes}</p>
          </Field>
        )}

        {/* Last modified */}
        <div className="flex items-center gap-1.5 pt-2">
          <Clock size={12} style={{ color: "var(--muted-foreground)" }} />
          <span style={{ fontSize: "0.73rem", color: "var(--muted-foreground)" }}>
            Modified {item.lastModified}
          </span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <p style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.35rem" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function CopyRow({ value, field, copied, onCopy }: { value: string; field: string; copied: string | null; onCopy: (v: string, f: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: "0.84rem", color: "var(--foreground)", flex: 1 }} className="truncate">{value}</span>
      <CopyBtn value={value} field={field} copied={copied} onCopy={onCopy} />
    </div>
  );
}

function CopyBtn({ value, field, copied, onCopy }: { value: string; field: string; copied: string | null; onCopy: (v: string, f: string) => void }) {
  const isCopied = copied === field;
  return (
    <button
      onClick={() => onCopy(value, field)}
      className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-black/5"
      title="Copy"
    >
      {isCopied ? <Check size={12} style={{ color: "#10b981" }} /> : <Copy size={12} style={{ color: "var(--muted-foreground)" }} />}
    </button>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5"
      title={title}
    >
      {children}
    </button>
  );
}

function TypeIcon({ type }: { type: VaultItem["type"] }) {
  const props = { size: 20, color: "white" };
  switch (type) {
    case "login": return <Globe {...props} />;
    case "card": return <CreditCard {...props} />;
    case "note": return <FileText {...props} />;
    case "wifi": return <Wifi {...props} />;
    case "key": return <Key {...props} />;
  }
}

function PasswordStrength({ password }: { password: string }) {
  const score = (() => {
    let s = 0;
    if (password.length >= 12) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = ["#ef4444", "#f59e0b", "#10b981", "#0066cc"];

  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{ background: i < score ? colors[score - 1] : "var(--muted)" }}
          />
        ))}
      </div>
      <span style={{ fontSize: "0.7rem", color: colors[score - 1] || "var(--muted-foreground)", fontWeight: 500 }}>
        {labels[score - 1] || "Very Weak"}
      </span>
    </div>
  );
}

function CreditCardPreview({ item }: { item: VaultItem }) {
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}cc 100%)`,
        aspectRatio: "1.586 / 1",
        maxWidth: 320,
      }}
    >
      <div className="absolute inset-0 opacity-10"
        style={{
          background: "radial-gradient(circle at 80% 20%, white 0%, transparent 50%)",
        }}
      />
      <div className="relative h-full flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.9rem", fontWeight: 600 }}>
            {item.title}
          </span>
          <CreditCard size={22} color="rgba(255,255,255,0.8)" />
        </div>
        <div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", fontFamily: "monospace", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>
            {item.cardNumber}
          </p>
          <div className="flex items-end justify-between">
            <div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Cardholder</p>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.75rem", fontFamily: "monospace" }}>{item.cardHolder}</p>
            </div>
            <div className="text-right">
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Expires</p>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.75rem", fontFamily: "monospace" }}>{item.cardExpiry}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

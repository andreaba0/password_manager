import { useState } from "react";
import {
  Shield, Globe, CreditCard, FileText, Wifi, Key,
  Star, Trash2, Search, ChevronDown,
  Lock, Settings, Users, Mail,
} from "lucide-react";
import type { VaultItem } from "./data";
import type { SharedVault } from "./sharedData";
import { CURRENT_USER_ID } from "./sharedData";

export type Category = {
  id: string;
  label: string;
  icon: React.ReactNode;
  count: number;
};

type SidebarProps = {
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  sharedVaults: SharedVault[];
  activeSharedVaultId: string | null;
  activeSharedType: string | null;
  onSelectSharedType: (vaultId: string, type: string | null) => void;
  onOpenVaultSettings: (id: string) => void;
  pendingInviteCount: number;
  showingInvites: boolean;
  onShowInvites: () => void;
};

const vaultCategories: Category[] = [
  { id: "all",       label: "All Items",       icon: <Shield size={15} />,     count: 24 },
  { id: "logins",    label: "Logins",           icon: <Globe size={15} />,      count: 18 },
  { id: "cards",     label: "Credit Cards",     icon: <CreditCard size={15} />, count: 3  },
  { id: "notes",     label: "Secure Notes",     icon: <FileText size={15} />,   count: 2  },
  { id: "wifi",      label: "Wi-Fi Passwords",  icon: <Wifi size={15} />,       count: 1  },
  { id: "keys",      label: "API Keys",         icon: <Key size={15} />,        count: 4  },
];

const smartCategories: Category[] = [
  { id: "favorites", label: "Favorites", icon: <Star size={15} />,  count: 6 },
  { id: "trash",     label: "Trash",     icon: <Trash2 size={15} />, count: 2 },
];

const TYPE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  login: { label: "Logins",          icon: <Globe size={13} /> },
  card:  { label: "Credit Cards",    icon: <CreditCard size={13} /> },
  note:  { label: "Secure Notes",    icon: <FileText size={13} /> },
  wifi:  { label: "Wi-Fi Passwords", icon: <Wifi size={13} /> },
  key:   { label: "API Keys",        icon: <Key size={13} /> },
};

function countByType(items: VaultItem[]) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.type] = (counts[item.type] ?? 0) + 1;
  }
  return counts;
}

export function Sidebar({
  activeCategory,
  onSelectCategory,
  sharedVaults,
  activeSharedVaultId,
  activeSharedType,
  onSelectSharedType,
  onOpenVaultSettings,
  pendingInviteCount,
  showingInvites,
  onShowInvites,
}: SidebarProps) {
  const [vaultOpen,  setVaultOpen]  = useState(true);
  const [sharedOpen, setSharedOpen] = useState(true);
  // Which shared vault dropdowns are expanded
  const [expandedVaults, setExpandedVaults] = useState<Record<string, boolean>>(
    () => Object.fromEntries(sharedVaults.map((v) => [v.id, true]))
  );

  const toggleVault = (id: string) =>
    setExpandedVaults((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)" }}>

      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--primary)" }}>
          <Lock size={14} color="white" />
        </div>
        <span style={{ color: "var(--sidebar-foreground)", fontWeight: 600, fontSize: "0.95rem" }}>Vault</span>
      </div>

      {/* Search */}
      <div className="px-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.08)" }}>
          <Search size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>Search…</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">

        {/* Personal vault */}
        <SectionHeader label="Personal Vault" open={vaultOpen} onToggle={() => setVaultOpen((v) => !v)} />
        {vaultOpen && vaultCategories.map((cat) => (
          <NavItem
            key={cat.id}
            cat={cat}
            active={!activeSharedVaultId && activeCategory === cat.id}
            onClick={() => onSelectCategory(cat.id)}
          />
        ))}

        {/* Smart folders */}
        <div className="pt-3 pb-1 px-2">
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Smart Folders
          </span>
        </div>
        {smartCategories.map((cat) => (
          <NavItem
            key={cat.id}
            cat={cat}
            active={!activeSharedVaultId && activeCategory === cat.id}
            onClick={() => onSelectCategory(cat.id)}
          />
        ))}

        {/* Pending invites */}
        <div className="pt-3">
          <button
            onClick={onShowInvites}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors text-left"
            style={{
              background: showingInvites ? "var(--sidebar-accent)" : "transparent",
              color: showingInvites ? "white" : "rgba(255,255,255,0.65)",
            }}
          >
            <span style={{ color: showingInvites ? "white" : "rgba(255,255,255,0.45)" }}>
              <Mail size={15} />
            </span>
            <span style={{ fontSize: "0.82rem", flex: 1 }}>Pending Invites</span>
            {pendingInviteCount > 0 && (
              <span style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                background: showingInvites ? "rgba(255,255,255,0.2)" : "var(--primary)",
                color: "white",
                padding: "1px 6px",
                borderRadius: 9999,
                flexShrink: 0,
              }}>
                {pendingInviteCount}
              </span>
            )}
          </button>
        </div>

        {/* Shared vaults */}
        <div className="pt-2">
          <SectionHeader label="Shared Vaults" open={sharedOpen} onToggle={() => setSharedOpen((v) => !v)} />
        </div>

        {sharedOpen && sharedVaults.map((vault) => {
          const isOwner   = vault.ownerId === CURRENT_USER_ID;
          const expanded  = expandedVaults[vault.id] ?? true;
          const isActive  = activeSharedVaultId === vault.id;
          const typeCounts = countByType(vault.items);
          const types = Object.entries(typeCounts); // only types with ≥1 item

          return (
            <div key={vault.id}>
              {/* Vault row — acts as the dropdown toggle */}
              <button
                onClick={() => {
                  toggleVault(vault.id);
                  // Also select "all" within this vault when opening
                  if (!expanded) onSelectSharedType(vault.id, null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left"
                style={{ color: isActive ? "white" : "rgba(255,255,255,0.65)" }}
              >
                {/* Color swatch */}
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: vault.color }} />
                <span className="truncate flex-1" style={{ fontSize: "0.82rem" }}>{vault.name}</span>
                <ChevronDown
                  size={12}
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
                    transition: "transform 0.18s",
                    flexShrink: 0,
                  }}
                />
              </button>

              {/* Expanded sub-items */}
              {expanded && (
                <div className="ml-3 pl-2 mb-0.5 space-y-0.5" style={{ borderLeft: "1px solid rgba(255,255,255,0.08)" }}>

                  {/* Settings — owner only */}
                  {isOwner && (
                    <button
                      onClick={() => onOpenVaultSettings(vault.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left hover:bg-white/5"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      <Settings size={12} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
                      <span style={{ fontSize: "0.78rem" }}>Settings</span>
                    </button>
                  )}

                  {/* Type rows */}
                  {types.map(([type, count]) => {
                    const meta   = TYPE_META[type];
                    const active = isActive && activeSharedType === type;
                    if (!meta) return null;
                    return (
                      <button
                        key={type}
                        onClick={() => onSelectSharedType(vault.id, type)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left"
                        style={{
                          background: active ? "var(--sidebar-accent)" : "transparent",
                          color:      active ? "white" : "rgba(255,255,255,0.6)",
                        }}
                      >
                        <span style={{ color: active ? "white" : "rgba(255,255,255,0.35)", flexShrink: 0 }}>{meta.icon}</span>
                        <span className="flex-1 truncate" style={{ fontSize: "0.8rem" }}>{meta.label}</span>
                        <span style={{
                          fontSize: "0.68rem",
                          color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.28)",
                          background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                          padding: "1px 6px",
                          borderRadius: 9999,
                          flexShrink: 0,
                        }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 flex items-center gap-2.5" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--primary)" }}>
          <Users size={13} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate" style={{ color: "var(--sidebar-foreground)", fontSize: "0.78rem", fontWeight: 500 }}>Alex Johnson</p>
          <p className="truncate" style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.7rem" }}>alex@example.com</p>
        </div>
        <button className="hover:bg-white/10 w-6 h-6 rounded-md flex items-center justify-center transition-colors">
          <Settings size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors"
      onClick={onToggle}
    >
      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      <ChevronDown
        size={12}
        style={{ color: "rgba(255,255,255,0.3)", transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}
      />
    </button>
  );
}

function NavItem({ cat, active, onClick }: { cat: Category; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors text-left"
      style={{ background: active ? "var(--sidebar-accent)" : "transparent", color: active ? "white" : "rgba(255,255,255,0.65)" }}
    >
      <span style={{ color: active ? "white" : "rgba(255,255,255,0.45)" }}>{cat.icon}</span>
      <span style={{ fontSize: "0.82rem", flex: 1 }}>{cat.label}</span>
      <span style={{
        fontSize: "0.7rem",
        color: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
        background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
        padding: "1px 6px",
        borderRadius: 9999,
      }}>
        {cat.count}
      </span>
    </button>
  );
}

import { useState } from "react";
import { ArrowLeft, Menu } from "lucide-react";
import { LoginPage } from "./components/LoginPage";
import { Sidebar } from "./components/Sidebar";
import { ItemList } from "./components/ItemList";
import { DetailPanel } from "./components/DetailPanel";
import { SharedVaultSettings } from "./components/SharedVaultSettings";
import { PendingInvites } from "./components/PendingInvites";
import { vaultItems, getItemsByCategory } from "./components/data";
import { sharedVaults as initialVaults, pendingInvites as initialInvites } from "./components/sharedData";
import type { Role } from "./components/sharedData";

const categoryLabels: Record<string, string> = {
  all: "All Items", logins: "Logins", cards: "Credit Cards",
  notes: "Secure Notes", wifi: "Wi-Fi Passwords", keys: "API Keys",
  favorites: "Favorites", trash: "Trash",
};

const TYPE_LABELS: Record<string, string> = {
  login: "Logins", card: "Credit Cards", note: "Secure Notes",
  wifi: "Wi-Fi Passwords", key: "API Keys",
};

type RightPanel = "detail" | "settings";
type MobileView = "list" | "detail";

export default function App() {
  const [loggedIn,         setLoggedIn]         = useState(false);
  const [activeCategory,   setActiveCategory]   = useState("all");
  const [selectedItemId,   setSelectedItemId]   = useState<string | null>(null);
  const [activeVaultId,    setActiveVaultId]    = useState<string | null>(null);
  const [activeSharedType, setActiveSharedType] = useState<string | null>(null);
  const [rightPanel,       setRightPanel]       = useState<RightPanel>("detail");
  const [vaults,           setVaults]           = useState(initialVaults);
  const [invites,          setInvites]          = useState(initialInvites);
  const [showingInvites,   setShowingInvites]   = useState(false);
  const [mobileView,       setMobileView]       = useState<MobileView>("list");
  const [sidebarOpen,      setSidebarOpen]      = useState(false);

  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;

  /* ── Derived ── */
  const activeVault   = vaults.find((v) => v.id === activeVaultId) ?? null;
  const allVaultItems = activeVault?.items ?? [];
  const listItems     = activeVaultId
    ? (activeSharedType ? allVaultItems.filter((i) => i.type === activeSharedType) : allVaultItems)
    : getItemsByCategory(activeCategory);
  const selectedItem  = listItems.find((i) => i.id === selectedItemId) ?? null;
  const listLabel     = activeVaultId
    ? `${activeVault?.name ?? "Shared"}${activeSharedType ? ` — ${TYPE_LABELS[activeSharedType] ?? ""}` : ""}`
    : (categoryLabels[activeCategory] ?? "Items");
  const hideListPanel = rightPanel === "settings" || showingInvites;

  /* ── Handlers ── */
  const handleSelectCategory = (id: string) => {
    setActiveCategory(id);
    setActiveVaultId(null);
    setActiveSharedType(null);
    setSelectedItemId(null);
    setRightPanel("detail");
    setShowingInvites(false);
    setMobileView("list");
    setSidebarOpen(false);
  };

  const handleSelectSharedType = (vaultId: string, type: string | null) => {
    setActiveVaultId(vaultId);
    setActiveSharedType(type);
    setSelectedItemId(null);
    setRightPanel("detail");
    setShowingInvites(false);
    setMobileView("list");
    setSidebarOpen(false);
  };

  const handleOpenVaultSettings = (id: string) => {
    setActiveVaultId(id);
    setSelectedItemId(null);
    setRightPanel("settings");
    setShowingInvites(false);
    setMobileView("detail");
    setSidebarOpen(false);
  };

  const handleShowInvites = () => {
    setShowingInvites(true);
    setActiveVaultId(null);
    setActiveSharedType(null);
    setSelectedItemId(null);
    setRightPanel("detail");
    setMobileView("detail");
    setSidebarOpen(false);
  };

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
    setRightPanel("detail");
    setMobileView("detail");
  };

  const handleAcceptInvite = (id: string) => {
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

  const handleRejectInvite = (id: string) => {
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateRole = (memberId: string, role: Role) => {
    if (!activeVaultId) return;
    setVaults((prev) =>
      prev.map((v) =>
        v.id === activeVaultId
          ? { ...v, members: v.members.map((m) => m.id === memberId ? { ...m, role } : m) }
          : v
      )
    );
  };

  const handleRemoveMember = (memberId: string) => {
    if (!activeVaultId) return;
    setVaults((prev) =>
      prev.map((v) =>
        v.id === activeVaultId
          ? { ...v, members: v.members.filter((m) => m.id !== memberId) }
          : v
      )
    );
  };

  /* ── Panels ── */
  const sidebarEl = (
    <Sidebar
      activeCategory={activeCategory}
      onSelectCategory={handleSelectCategory}
      sharedVaults={vaults}
      activeSharedVaultId={activeVaultId}
      activeSharedType={activeSharedType}
      onSelectSharedType={handleSelectSharedType}
      onOpenVaultSettings={handleOpenVaultSettings}
      pendingInviteCount={invites.length}
      showingInvites={showingInvites}
      onShowInvites={handleShowInvites}
    />
  );

  const mainEl = showingInvites ? (
    <PendingInvites
      invites={invites}
      onAccept={handleAcceptInvite}
      onReject={handleRejectInvite}
    />
  ) : rightPanel === "settings" && activeVault ? (
    <SharedVaultSettings
      vault={activeVault}
      onUpdateRole={handleUpdateRole}
      onRemoveMember={handleRemoveMember}
      onClose={() => setRightPanel("detail")}
    />
  ) : (
    <div style={{ maxWidth: 680, margin: "0 auto", minHeight: "100%" }}>
      <DetailPanel item={selectedItem} />
    </div>
  );

  const mobileBackLabel = showingInvites ? "Pending Invites" : rightPanel === "settings" ? activeVault?.name ?? "Settings" : listLabel;

  /* ── Render ── */
  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Desktop (md+) ── */}
      <div className="hidden md:flex w-full h-full">
        <div className="w-52 shrink-0 h-full" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          {sidebarEl}
        </div>
        {!hideListPanel && (
          <div className="w-64 shrink-0 h-full" style={{ borderRight: "1px solid var(--border)" }}>
            <ItemList
              items={listItems}
              selectedId={selectedItemId}
              onSelect={handleSelectItem}
              categoryLabel={listLabel}
            />
          </div>
        )}
        <div className="flex-1 h-full overflow-y-auto" style={{ background: "var(--background)" }}>
          {mainEl}
        </div>
      </div>

      {/* ── Mobile (< md) ── */}
      <div className="flex md:hidden w-full h-full relative">
        {sidebarOpen && (
          <div className="absolute inset-0 z-40 flex">
            <div className="w-64 h-full shrink-0">{sidebarEl}</div>
            <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {mobileView === "list" && (
          <div className="flex flex-col w-full h-full">
            <div
              className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{ background: "var(--sidebar)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              <button onClick={() => setSidebarOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
                <Menu size={18} color="white" />
              </button>
              <span style={{ color: "white", fontWeight: 600, fontSize: "0.95rem" }} className="truncate">{listLabel}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <ItemList items={listItems} selectedId={selectedItemId} onSelect={handleSelectItem} categoryLabel={listLabel} hideCategoryLabel />
            </div>
          </div>
        )}

        {mobileView === "detail" && (
          <div className="flex flex-col w-full h-full">
            <div
              className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{ background: "var(--sidebar)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              {rightPanel === "settings" ? (
                /* Settings header: burger + vault name, same style as list header */
                <>
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors shrink-0"
                  >
                    <Menu size={18} color="white" />
                  </button>
                  <span style={{ color: "white", fontWeight: 600, fontSize: "0.95rem" }} className="truncate flex-1">
                    {activeVault?.name ?? "Settings"}
                  </span>
                </>
              ) : (
                /* Item detail / invites header: back arrow */
                <button
                  onClick={() => {
                    setMobileView("list");
                    if (showingInvites) setShowingInvites(false);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft size={16} color="white" />
                  <span style={{ color: "white", fontSize: "0.85rem" }} className="truncate">{mobileBackLabel}</span>
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto" style={{ background: "var(--background)" }}>
              {mainEl}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

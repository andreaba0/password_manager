import { useState } from "react";
import { Globe, CreditCard, FileText, Wifi, Key, Star, Search, SlidersHorizontal } from "lucide-react";
import type { VaultItem } from "./data";

const typeIcon = (type: VaultItem["type"], color: string) => {
  const props = { size: 16, color: "white" };
  switch (type) {
    case "login": return <Globe {...props} />;
    case "card": return <CreditCard {...props} />;
    case "note": return <FileText {...props} />;
    case "wifi": return <Wifi {...props} />;
    case "key": return <Key {...props} />;
  }
};

type Props = {
  items: VaultItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  categoryLabel: string;
  hideCategoryLabel?: boolean;
};

export function ItemList({ items, selectedId, onSelect, categoryLabel, hideCategoryLabel }: Props) {
  const [search, setSearch] = useState("");

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full" style={{ background: "#f8f9fc" }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        {!hideCategoryLabel && <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--foreground)" }}>
            {categoryLabel}
          </h2>
          <button className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
            <SlidersHorizontal size={15} style={{ color: "var(--muted-foreground)" }} />
          </button>
        </div>}
        {hideCategoryLabel && <div className="mb-4" />}

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <Search size={14} style={{ color: "var(--muted-foreground)" }} />
          <input
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: "0.82rem", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Count */}
      <div className="px-4 pb-2">
        <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", fontWeight: 500 }}>
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32">
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>No items found</p>
          </div>
        ) : (
          filtered.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              active={selectedId === item.id}
              onClick={() => onSelect(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ItemRow({ item, active, onClick }: { item: VaultItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
      style={{
        background: active ? "var(--accent)" : "transparent",
        border: active ? "1px solid rgba(0,102,204,0.15)" : "1px solid transparent",
      }}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
        style={{ background: item.color }}
      >
        {typeIcon(item.type, item.color)}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          style={{
            fontSize: "0.84rem",
            fontWeight: 500,
            color: active ? "var(--primary)" : "var(--foreground)",
          }}
          className="truncate"
        >
          {item.title}
        </p>
        <p
          style={{ fontSize: "0.74rem", color: "var(--muted-foreground)" }}
          className="truncate"
        >
          {item.subtitle}
        </p>
      </div>

      {/* Favorite */}
      {item.favorite && (
        <Star size={12} fill="#f59e0b" color="#f59e0b" className="shrink-0" />
      )}
    </button>
  );
}

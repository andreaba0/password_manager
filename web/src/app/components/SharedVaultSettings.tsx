import { useState } from "react";
import { Crown, ChevronDown, Trash2, Plus, X, Check, Shield, Users } from "lucide-react";
import type { SharedVault, SharedMember, Role } from "./sharedData";
import { ROLES, ROLE_META, CURRENT_USER_ID } from "./sharedData";

type Props = {
  vault: SharedVault;
  onUpdateRole: (memberId: string, role: Role) => void;
  onRemoveMember: (memberId: string) => void;
  onClose: () => void;
};

export function SharedVaultSettings({ vault, onUpdateRole, onRemoveMember, onClose }: Props) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [inviteSent, setInviteSent] = useState(false);

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    setInviteSent(true);
    setInviteEmail("");
    setTimeout(() => setInviteSent(false), 2500);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: vault.color }}
          >
            <Users size={16} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--foreground)" }}>
              {vault.name} — Settings
            </h2>
            <p style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
              Manage members and their permissions
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors"
        >
          <X size={15} style={{ color: "var(--muted-foreground)" }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem" }} className="space-y-5">

          {/* Roles legend */}
          <Section title="Permission Roles" icon={<Shield size={13} />}>
            <div className="space-y-2">
              {ROLES.map((role) => {
                const m = ROLE_META[role];
                return (
                  <div key={role} className="flex items-start gap-3 px-3 py-2.5 rounded-xl" style={{ background: "var(--muted)" }}>
                    <span
                      className="px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                      style={{ fontSize: "0.68rem", fontWeight: 700, background: m.badge, color: m.color }}
                    >
                      {m.label}
                    </span>
                    <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                      {m.description}
                    </p>
                  </div>
                );
              })}
              <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl" style={{ background: "#fef3c7", border: "1px solid #fde68a" }}>
                <Crown size={13} style={{ color: "#92400e", marginTop: 2, flexShrink: 0 }} />
                <p style={{ fontSize: "0.78rem", color: "#78350f", lineHeight: 1.5 }}>
                  The <strong>Owner</strong> always has full access and can manage members.
                </p>
              </div>
            </div>
          </Section>

          {/* Members */}
          <Section title={`Members (${vault.members.length})`} icon={<Users size={13} />}>
            <div className="space-y-1.5">
              {vault.members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isOwner={member.id === vault.ownerId}
                  onRoleChange={(role) => onUpdateRole(member.id, role)}
                  onRemove={() => onRemoveMember(member.id)}
                />
              ))}
            </div>
          </Section>

          {/* Invite */}
          <Section title="Invite a Member" icon={<Plus size={13} />}>
            <div className="space-y-3">
              <div>
                <label style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  className="mt-1.5 w-full px-3 py-2 rounded-xl outline-none"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    fontSize: "0.84rem",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Role
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {ROLES.map((role) => {
                    const m = ROLE_META[role];
                    const active = inviteRole === role;
                    return (
                      <button
                        key={role}
                        onClick={() => setInviteRole(role)}
                        className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl transition-colors"
                        style={{
                          background: active ? m.badge : "var(--muted)",
                          border: `1.5px solid ${active ? m.color + "50" : "transparent"}`,
                        }}
                      >
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: active ? m.color : "var(--muted-foreground)" }}>
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleInvite}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-colors"
                style={{
                  background: inviteSent ? "#d1fae5" : "var(--primary)",
                  color: inviteSent ? "#065f46" : "white",
                }}
              >
                {inviteSent ? (
                  <>
                    <Check size={14} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 500 }}>Invite sent!</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 500 }}>Send Invite</span>
                  </>
                )}
              </button>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

/* ── Member row ── */
function MemberRow({
  member,
  isOwner,
  onRoleChange,
  onRemove,
}: {
  member: SharedMember;
  isOwner: boolean;
  onRoleChange: (r: Role) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isCurrentUser = member.id === CURRENT_USER_ID;
  const meta = ROLE_META[member.role];

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl relative"
      style={{ background: isCurrentUser ? "var(--accent)" : "var(--card)", border: "1px solid var(--border)" }}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
        style={{ background: member.color }}
      >
        <span style={{ fontSize: "0.7rem", color: "white", fontWeight: 700 }}>{member.initials}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: "0.83rem", fontWeight: 500, color: "var(--foreground)" }} className="truncate">
            {member.name}
            {isCurrentUser && <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}> (you)</span>}
          </span>
          {isOwner && <Crown size={11} style={{ color: "#f59e0b", flexShrink: 0 }} />}
        </div>
        <p style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }} className="truncate">{member.email}</p>
      </div>

      {/* Role selector (disabled for owner and current user) */}
      {isOwner ? (
        <span
          className="px-2.5 py-1 rounded-full shrink-0"
          style={{ fontSize: "0.68rem", fontWeight: 700, background: "#fef3c7", color: "#92400e" }}
        >
          Owner
        </span>
      ) : (
        <div className="relative shrink-0">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors hover:opacity-80"
            style={{ background: meta.badge, fontSize: "0.68rem", fontWeight: 700, color: meta.color }}
          >
            {meta.label}
            <ChevronDown size={10} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden py-1"
                style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 180 }}
              >
                {ROLES.map((role) => {
                  const m = ROLE_META[role];
                  const selected = member.role === role;
                  return (
                    <button
                      key={role}
                      onClick={() => { onRoleChange(role); setOpen(false); }}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-black/5 transition-colors text-left"
                    >
                      <span
                        className="px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                        style={{ fontSize: "0.65rem", fontWeight: 700, background: m.badge, color: m.color }}
                      >
                        {m.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: "0.78rem", color: "var(--foreground)", fontWeight: selected ? 600 : 400 }}>
                          {m.label}
                        </p>
                        <p style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                          {m.description}
                        </p>
                      </div>
                      {selected && <Check size={12} style={{ color: "var(--primary)", marginTop: 4, flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Remove (not for owner or current user) */}
      {!isOwner && !isCurrentUser && (
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-50 transition-colors shrink-0"
          title="Remove member"
        >
          <Trash2 size={12} style={{ color: "var(--muted-foreground)" }} />
        </button>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}
      >
        <span style={{ color: "var(--muted-foreground)" }}>{icon}</span>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)" }}>{title}</span>
      </div>
      <div className="p-3" style={{ background: "var(--card)" }}>{children}</div>
    </div>
  );
}

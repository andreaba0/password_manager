import { useState } from "react";
import { Users, Check, X, Clock, Mail } from "lucide-react";
import type { PendingInvite } from "./sharedData";
import { ROLE_META } from "./sharedData";

type Props = {
  invites: PendingInvite[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
};

export function PendingInvites({ invites, onAccept, onReject }: Props) {
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", width: "100%", padding: "1.5rem 1.5rem 3rem" }}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--primary)" }}>
            <Mail size={18} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)" }}>
              Pending Invites
            </h1>
            <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
              {invites.length === 0
                ? "No pending invites"
                : `${invites.length} invite${invites.length !== 1 ? "s" : ""} waiting for your response`}
            </p>
          </div>
        </div>

        {/* Empty state */}
        {invites.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-2xl"
            style={{ border: "1px dashed var(--border)" }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--muted)" }}>
              <Users size={22} style={{ color: "var(--muted-foreground)" }} />
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--muted-foreground)" }}>You're all caught up</p>
          </div>
        )}

        {/* Invite cards */}
        <div className="space-y-3">
          {invites.map((invite) => (
            <InviteCard key={invite.id} invite={invite} onAccept={onAccept} onReject={onReject} />
          ))}
        </div>
      </div>
    </div>
  );
}

function InviteCard({
  invite,
  onAccept,
  onReject,
}: {
  invite: PendingInvite;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [state, setState] = useState<"idle" | "accepted" | "rejected">("idle");
  const roleMeta = ROLE_META[invite.role];

  const handleAccept = () => {
    setState("accepted");
    setTimeout(() => onAccept(invite.id), 600);
  };

  const handleReject = () => {
    setState("rejected");
    setTimeout(() => onReject(invite.id), 400);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden transition-opacity"
      style={{
        border: "1px solid var(--border)",
        background: "var(--card)",
        opacity: state !== "idle" ? 0 : 1,
        transition: "opacity 0.3s",
      }}
    >
      {/* Top: vault info */}
      <div className="flex items-start gap-4 px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
        {/* Vault color badge */}
        <div
          className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center"
          style={{ background: invite.vaultColor }}
        >
          <Users size={20} color="white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--foreground)" }}>
              {invite.vaultName}
            </h3>
            <span
              className="px-2 py-0.5 rounded-full"
              style={{ fontSize: "0.67rem", fontWeight: 700, background: roleMeta.badge, color: roleMeta.color }}
            >
              {roleMeta.label}
            </span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", marginTop: "0.2rem", lineHeight: 1.5 }}>
            {invite.vaultDescription}
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "0.35rem" }}>
            {invite.memberCount} member{invite.memberCount !== 1 ? "s" : ""} · {roleMeta.description}
          </p>
        </div>
      </div>

      {/* Bottom: sender + actions */}
      <div className="flex items-center gap-3 px-5 py-3">
        {/* Sender */}
        <div
          className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center"
          style={{ background: invite.invitedByColor }}
        >
          <span style={{ fontSize: "0.58rem", color: "white", fontWeight: 700 }}>
            {invite.invitedByInitials}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: "0.76rem", color: "var(--muted-foreground)" }} className="truncate">
            Invited by <span style={{ fontWeight: 500, color: "var(--foreground)" }}>{invite.invitedBy}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Clock size={11} style={{ color: "var(--muted-foreground)" }} />
          <span style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>{invite.sentAt}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <button
            onClick={handleReject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover:bg-red-50"
            style={{ border: "1px solid var(--border)", fontSize: "0.78rem", fontWeight: 500, color: "var(--muted-foreground)" }}
          >
            <X size={13} />
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
            style={{ background: "var(--primary)", color: "white", fontSize: "0.78rem", fontWeight: 500 }}
          >
            <Check size={13} />
            Accept
          </button>
        </div>
      </div>

      {/* Accepted / rejected overlay feedback */}
      {state !== "idle" && (
        <div
          className="flex items-center justify-center gap-2 px-5 py-3"
          style={{
            background: state === "accepted" ? "#d1fae5" : "#fee2e2",
            color: state === "accepted" ? "#065f46" : "#991b1b",
          }}
        >
          {state === "accepted"
            ? <><Check size={14} /> <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>Joined {invite.vaultName}</span></>
            : <><X size={14} /> <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>Invite declined</span></>
          }
        </div>
      )}
    </div>
  );
}

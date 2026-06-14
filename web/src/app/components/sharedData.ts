import type { VaultItem } from "./data";

export type Role = "creator" | "editor" | "viewer";

export const ROLES: Role[] = ["creator", "editor", "viewer"];

export const ROLE_META: Record<Role, { label: string; description: string; color: string; badge: string }> = {
  creator: {
    label: "Creator",
    description: "Can add new items, edit existing ones, and read everything.",
    color: "#059669",
    badge: "#d1fae5",
  },
  editor: {
    label: "Editor",
    description: "Can edit existing items and read everything.",
    color: "#d97706",
    badge: "#fef3c7",
  },
  viewer: {
    label: "Viewer",
    description: "Can only read items. Cannot add or modify.",
    color: "#6b7280",
    badge: "#f3f4f6",
  },
};

export type SharedMember = {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  role: Role;
  isCurrentUser?: boolean;
};

export type SharedVault = {
  id: string;
  name: string;
  description: string;
  color: string;
  ownerId: string;
  members: SharedMember[];
  items: VaultItem[];
  lastModified: string;
};

export const CURRENT_USER_ID = "u1";

export type PendingInvite = {
  id: string;
  vaultName: string;
  vaultColor: string;
  vaultDescription: string;
  invitedBy: string;
  invitedByEmail: string;
  invitedByInitials: string;
  invitedByColor: string;
  role: Role;
  memberCount: number;
  sentAt: string;
};

export const pendingInvites: PendingInvite[] = [
  {
    id: "inv1",
    vaultName: "Product Team",
    vaultColor: "#7c3aed",
    vaultDescription: "Figma, Notion, Linear, and analytics accounts for the product org.",
    invitedBy: "Maria Chen",
    invitedByEmail: "maria@example.com",
    invitedByInitials: "MC",
    invitedByColor: "#7c3aed",
    role: "editor",
    memberCount: 5,
    sentAt: "2 hours ago",
  },
  {
    id: "inv2",
    vaultName: "DevOps",
    vaultColor: "#0891b2",
    vaultDescription: "Cloud providers, monitoring, and deployment pipeline credentials.",
    invitedBy: "James Park",
    invitedByEmail: "james@example.com",
    invitedByInitials: "JP",
    invitedByColor: "#059669",
    role: "viewer",
    memberCount: 3,
    sentAt: "Yesterday",
  },
  {
    id: "inv3",
    vaultName: "Growth",
    vaultColor: "#db2777",
    vaultDescription: "Ad platforms, email tools, and A/B testing service accounts.",
    invitedBy: "Lena Torres",
    invitedByEmail: "lena@example.com",
    invitedByInitials: "LT",
    invitedByColor: "#db2777",
    role: "creator",
    memberCount: 4,
    sentAt: "3 days ago",
  },
];

export const sharedVaults: SharedVault[] = [
  {
    id: "sv1",
    name: "Engineering",
    description: "Shared infra, CI, and staging credentials for the engineering team.",
    color: "#0066cc",
    ownerId: "u1",
    members: [
      { id: "u1", name: "Alex Johnson", email: "alex@example.com",  initials: "AJ", color: "#0066cc", role: "creator", isCurrentUser: true },
      { id: "u2", name: "Maria Chen",   email: "maria@example.com", initials: "MC", color: "#7c3aed", role: "creator" },
      { id: "u3", name: "James Park",   email: "james@example.com", initials: "JP", color: "#059669", role: "editor" },
      { id: "u4", name: "Sofia Russo",  email: "sofia@example.com", initials: "SR", color: "#d97706", role: "viewer" },
    ],
    items: [
      { id: "sv1-1", type: "login",  title: "AWS Console",     subtitle: "aws.amazon.com",   username: "alex.johnson",          password: "AW$C0ns0le!99",    url: "https://aws.amazon.com",   favorite: false, lastModified: "2h ago",    color: "#ff9900", totp: "JBSWY3DPEHPK3PXP" },
      { id: "sv1-2", type: "login",  title: "GitHub Org",      subtitle: "github.com",        username: "eng-team@example.com",  password: "G!tHub0rg#24",    url: "https://github.com",       favorite: true,  lastModified: "Yesterday", color: "#24292e" },
      { id: "sv1-3", type: "login",  title: "Datadog",         subtitle: "datadoghq.com",     username: "ops@example.com",       password: "D@tadog!Mon24",   url: "https://datadoghq.com",    favorite: false, lastModified: "3d ago",    color: "#632ca6" },
      { id: "sv1-4", type: "key",    title: "Vercel API",      subtitle: "vercel.com",        apiKey: "vc_••••••••••••••••••••", notes: "Production deploy key", favorite: false, lastModified: "1w ago",    color: "#000000" },
      { id: "sv1-5", type: "login",  title: "Sentry",          subtitle: "sentry.io",         username: "eng@example.com",       password: "$entry!Err0r24",  url: "https://sentry.io",        favorite: false, lastModified: "2w ago",    color: "#362d59" },
    ],
    lastModified: "2 hours ago",
  },
  {
    id: "sv2",
    name: "Design Team",
    description: "Figma, Adobe, stock libraries, and font service accounts.",
    color: "#f24e1e",
    ownerId: "u2",
    members: [
      { id: "u1", name: "Alex Johnson", email: "alex@example.com",  initials: "AJ", color: "#0066cc", role: "viewer",  isCurrentUser: true },
      { id: "u2", name: "Maria Chen",   email: "maria@example.com", initials: "MC", color: "#7c3aed", role: "creator" },
      { id: "u5", name: "Lena Torres",  email: "lena@example.com",  initials: "LT", color: "#db2777", role: "creator" },
    ],
    items: [
      { id: "sv2-1", type: "login", title: "Figma",         subtitle: "figma.com",        username: "design@example.com", password: "F!gm@D3$ign",   url: "https://figma.com",        favorite: true,  lastModified: "Yesterday", color: "#f24e1e" },
      { id: "sv2-2", type: "login", title: "Adobe CC",      subtitle: "adobe.com",        username: "design@example.com", password: "Adob3CC!24",    url: "https://adobe.com",        favorite: false, lastModified: "1w ago",    color: "#ff0000" },
      { id: "sv2-3", type: "login", title: "Unsplash",      subtitle: "unsplash.com",     username: "design@example.com", password: "Un$pl@sh!24",   url: "https://unsplash.com",     favorite: false, lastModified: "2w ago",    color: "#111827" },
    ],
    lastModified: "Yesterday",
  },
  {
    id: "sv3",
    name: "Finance",
    description: "Stripe, billing portals, and payment processor accounts.",
    color: "#059669",
    ownerId: "u1",
    members: [
      { id: "u1", name: "Alex Johnson", email: "alex@example.com",  initials: "AJ", color: "#0066cc", role: "creator", isCurrentUser: true },
      { id: "u6", name: "David Kim",    email: "david@example.com", initials: "DK", color: "#9f1239", role: "viewer" },
    ],
    items: [
      { id: "sv3-1", type: "login", title: "Stripe",   subtitle: "stripe.com",   username: "billing@example.com", password: "$tr!pe$afe24", url: "https://stripe.com",   favorite: false, lastModified: "3d ago", color: "#635bff" },
      { id: "sv3-2", type: "card",  title: "Corp Visa", subtitle: "Chase Bank",  cardNumber: "4111 •••• •••• 1234", cardExpiry: "11/27", cardCVV: "•••", cardHolder: "EXAMPLE CORP", favorite: false, lastModified: "1mo ago", color: "#0066cc" },
    ],
    lastModified: "3 days ago",
  },
];

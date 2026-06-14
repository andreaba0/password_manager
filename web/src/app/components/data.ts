export type VaultItem = {
  id: string;
  type: "login" | "card" | "note" | "wifi" | "key";
  title: string;
  subtitle: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  favorite: boolean;
  lastModified: string;
  tags?: string[];
  cardNumber?: string;
  cardExpiry?: string;
  cardCVV?: string;
  cardHolder?: string;
  wifiPassword?: string;
  apiKey?: string;
  totp?: string;
  color: string;
};

export const vaultItems: VaultItem[] = [
  {
    id: "1",
    type: "login",
    title: "GitHub",
    subtitle: "github.com",
    username: "alex.johnson@example.com",
    password: "Gh!$ecureP@ss2024",
    url: "https://github.com",
    notes: "Work and personal projects",
    totp: "JBSWY3DPEHPK3PXP",
    favorite: true,
    lastModified: "2 hours ago",
    tags: ["work", "dev"],
    color: "#24292e",
  },
  {
    id: "2",
    type: "login",
    title: "Figma",
    subtitle: "figma.com",
    username: "alex.johnson@example.com",
    password: "F!gm@D3sign#99",
    url: "https://figma.com",
    totp: "N5XGS43UOJSXI53POJSS4Y3PNVSQ",
    favorite: true,
    lastModified: "Yesterday",
    tags: ["work", "design"],
    color: "#f24e1e",
  },
  {
    id: "3",
    type: "login",
    title: "Notion",
    subtitle: "notion.so",
    username: "alex@example.com",
    password: "N0tion$ecure!2024",
    url: "https://notion.so",
    notes: "Team workspace",
    favorite: false,
    lastModified: "3 days ago",
    tags: ["work"],
    color: "#000000",
  },
  {
    id: "4",
    type: "login",
    title: "Netflix",
    subtitle: "netflix.com",
    username: "alex.johnson@example.com",
    password: "Netfl!x#Watch2024",
    url: "https://netflix.com",
    favorite: true,
    lastModified: "1 week ago",
    tags: ["personal"],
    color: "#e50914",
  },
  {
    id: "5",
    type: "login",
    title: "Spotify",
    subtitle: "spotify.com",
    username: "alex.johnson@example.com",
    password: "Sp0tify!Mu$ic24",
    url: "https://spotify.com",
    favorite: false,
    lastModified: "2 weeks ago",
    tags: ["personal"],
    color: "#1db954",
  },
  {
    id: "6",
    type: "login",
    title: "Linear",
    subtitle: "linear.app",
    username: "alex@example.com",
    password: "L!nearApp#2024",
    url: "https://linear.app",
    favorite: true,
    lastModified: "4 days ago",
    tags: ["work", "pm"],
    color: "#5e6ad2",
  },
  {
    id: "7",
    type: "login",
    title: "AWS Console",
    subtitle: "aws.amazon.com",
    username: "alex.johnson",
    password: "AW$C0ns0le!Secure99",
    url: "https://aws.amazon.com",
    notes: "Production account — use MFA",
    totp: "KRUGKICCMFRDMNJT",
    favorite: true,
    lastModified: "5 days ago",
    tags: ["work", "infra"],
    color: "#ff9900",
  },
  {
    id: "8",
    type: "card",
    title: "Visa Sapphire",
    subtitle: "Chase Bank",
    cardNumber: "4532 •••• •••• 7291",
    cardExpiry: "09/27",
    cardCVV: "•••",
    cardHolder: "ALEX JOHNSON",
    favorite: false,
    lastModified: "1 month ago",
    color: "#0066cc",
  },
  {
    id: "9",
    type: "card",
    title: "Amex Platinum",
    subtitle: "American Express",
    cardNumber: "3782 •••••• •4437",
    cardExpiry: "12/26",
    cardCVV: "••••",
    cardHolder: "ALEX JOHNSON",
    favorite: false,
    lastModified: "2 months ago",
    color: "#9b8f75",
  },
  {
    id: "10",
    type: "note",
    title: "Recovery Codes",
    subtitle: "2FA backup codes",
    notes: "GitHub: 8h2k-9xmq-4rnp\nFigma: 3kp2-8qmx-7nrt\nAWS: 9xn4-2kmq-8prs",
    favorite: false,
    lastModified: "3 weeks ago",
    color: "#6b7280",
  },
  {
    id: "11",
    type: "wifi",
    title: "Home Network",
    subtitle: "HomeAP_5G",
    wifiPassword: "MyS3cur3WiFi!2024",
    favorite: false,
    lastModified: "6 months ago",
    color: "#0891b2",
  },
  {
    id: "12",
    type: "key",
    title: "OpenAI API",
    subtitle: "platform.openai.com",
    apiKey: "sk-proj-••••••••••••••••••••••••••••••••••••••",
    notes: "Production API key — billing on main account",
    favorite: true,
    lastModified: "1 week ago",
    tags: ["work", "dev"],
    color: "#10a37f",
  },
];

export function getItemsByCategory(category: string): VaultItem[] {
  switch (category) {
    case "logins": return vaultItems.filter((i) => i.type === "login");
    case "cards": return vaultItems.filter((i) => i.type === "card");
    case "notes": return vaultItems.filter((i) => i.type === "note");
    case "wifi": return vaultItems.filter((i) => i.type === "wifi");
    case "keys": return vaultItems.filter((i) => i.type === "key");
    case "favorites": return vaultItems.filter((i) => i.favorite);
    case "trash": return [];
    default: return vaultItems;
  }
}

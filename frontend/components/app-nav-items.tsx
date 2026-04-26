import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PenSquare,
  PlayCircle,
  BookOpen,
  HelpCircle,
  Store,
} from "lucide-react";

export const GITHUB_REPO_URL = "https://github.com/gautammanak1/shotenx-ai";

export type AppNavItem = { href: string; icon: LucideIcon; label: string };

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/marketplace", icon: Store, label: "Marketplace" },
  { href: "/create-agent", icon: PenSquare, label: "Create Agent" },
  { href: "/demo", icon: PlayCircle, label: "Demo" },
  { href: "/docs", icon: BookOpen, label: "Docs" },
  { href: "/help", icon: HelpCircle, label: "Help" },
];

// components/nav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { IconOverview, IconPackageRoute, IconRider, IconChart, IconLog, IconSettings } from "@/lib/icons";

const LINKS = [
  { href: "/", label: "Overview", icon: IconOverview },
  { href: "/reverse-engine", label: "Reverse Logistics Engine", icon: IconPackageRoute },
  { href: "/rider-engine", label: "Rider Verification Engine", icon: IconRider },
  { href: "/business-impact", label: "Business Impact", icon: IconChart },
  { href: "/decision-log", label: "Decision Log", icon: IconLog },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header style={{ backgroundColor: "var(--meesho-purple)" }}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="[&_.font-bold]:text-white"><Logo size={34} /></div>
        <nav className="flex items-center gap-1 flex-wrap">
          {LINKS.map((l) => {
            const Icon = l.icon;
            const isActive = pathname === l.href;
            return (
              <Link key={l.href} href={l.href} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition ${isActive ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
                <Icon />{l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
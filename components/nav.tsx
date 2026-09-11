// components/nav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/reverse-engine", label: "Reverse Logistics Engine" },
  { href: "/rider-engine", label: "Rider Verification Engine" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header style={{ backgroundColor: "var(--meesho-purple)" }}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="[&_.font-bold]:text-white">
          <Logo size={34} />
        </div>
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                pathname === l.href ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
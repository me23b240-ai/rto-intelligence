// app/page.tsx
"use client";
import Link from "next/link";
import { Nav } from "@/components/nav";

export const dynamic = "force-dynamic";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="text-center pt-8 pb-4">
          <h1 className="text-3xl font-bold text-slate-900">Delivery Recovery OS</h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto">
            Two independent engines, each solving a different moment in the delivery journey - Rider Verification
            governs the attempt itself; Reverse Logistics governs what happens if that attempt still fails.
            They're built on the same cost-and-weight assumptions (see Settings), but operate as separate tools
            in this prototype.
          </p>
          <p className="text-xs text-slate-400 mt-3">Phase 1: transparent rules engine - not a trained model.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 relative">
          <Link href="/rider-engine" className="rounded-xl border-2 border-slate-200 bg-white p-6 hover:border-[var(--meesho-purple)] transition">
            <div className="text-xs font-semibold text-[var(--meesho-purple)] uppercase tracking-wide">At the moment of attempt</div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Rider Verification & Payout Engine</h2>
            <p className="text-sm text-slate-500 mt-2">
              Fair allocation, GPS + device verification, anti-spoof checks, and difficulty-weighted pay.
            </p>
          </Link>

          <Link href="/reverse-engine" className="rounded-xl border-2 border-slate-200 bg-white p-6 hover:border-[var(--meesho-purple)] transition">
            <div className="text-xs font-semibold text-[var(--meesho-orange-dark)] uppercase tracking-wide">If the attempt fails</div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Reverse Logistics Engine</h2>
            <p className="text-sm text-slate-500 mt-2">
              Routes an already-failed parcel to the cheapest responsible recovery path - reattempt, batch,
              backhaul, or liquidation - instead of auto-reversing everything at ₹120.
            </p>
          </Link>
        </div>

        <div className="text-center">
          <Link href="/settings" className="text-sm text-[var(--meesho-purple)] hover:underline">
            Every cost and weight assumption used here is editable in Settings →
          </Link>
        </div>
      </main>
    </div>
  );
}
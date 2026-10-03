// app/page.tsx
"use client";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { ParcelJourney } from "@/components/parcel-journey";
import { IconLog, IconRider, IconChart } from "@/lib/icons";

export const dynamic = "force-dynamic";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="text-center pt-8 pb-4">
          <h1 className="text-3xl font-bold text-slate-900">Delivery Recovery OS</h1>
          <p className="text-slate-500 mt-2 max-w-2xl mx-auto">
            Three independent tools, each addressing a different point in the delivery lifecycle - before an attempt,
            at the moment of allocation, and after a parcel has already failed. They share the same cost assumptions
            and the same discipline: transparent rules, explicit evidence tags, no automated decision without an
            explanation.
          </p>
          <p className="text-xs text-slate-400 mt-3">Phase 1: transparent rules engine - not a trained model.</p>
        </div>

        <ParcelJourney />

        <div className="grid md:grid-cols-3 gap-6">
          <Link href="/awb-terminal" className="rounded-xl border-2 border-slate-200 bg-white p-6 hover:border-[var(--meesho-purple)] transition flex flex-col">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3 text-white" style={{ backgroundColor: "var(--meesho-orange)" }}>
              <IconLog />
            </div>
            <div className="text-xs font-semibold text-[var(--meesho-orange-dark)] uppercase tracking-wide">If the attempt fails</div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">AWB Decision Terminal</h2>
            <p className="text-sm text-slate-500 mt-2 flex-1">
              Enter an AWB, get one clear instruction - reattempt, hold, redirect, or return - with the exact
              movement, deadline, and reasoning behind it. Post-RTO value recovery, not prediction.
            </p>
          </Link>

          <Link href="/rider-engine" className="rounded-xl border-2 border-slate-200 bg-white p-6 hover:border-[var(--meesho-purple)] transition flex flex-col">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3 text-white" style={{ backgroundColor: "var(--meesho-purple)" }}>
              <IconRider />
            </div>
            <div className="text-xs font-semibold text-[var(--meesho-purple)] uppercase tracking-wide">At the moment of allocation</div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Rider Engine</h2>
            <p className="text-sm text-slate-500 mt-2 flex-1">
              Route-aware parcel-to-rider allocation and payout modeling, backed by 90-day recency-weighted
              performance scoring - not just whoever's geographically closest.
            </p>
          </Link>

          <Link href="/business-impact" className="rounded-xl border-2 border-slate-200 bg-white p-6 hover:border-[var(--meesho-purple)] transition flex flex-col">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3 text-white" style={{ backgroundColor: "#059669" }}>
              <IconChart />
            </div>
            <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Why it matters</div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Business Impact</h2>
            <p className="text-sm text-slate-500 mt-2 flex-1">
              The full finance model behind both tools - RTO prevention and post-RTO value recovery, kept as
              separate, evidence-tagged KPI families, with payback period and scale projections.
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
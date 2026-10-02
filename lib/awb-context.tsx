// lib/awb-context.tsx
"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AwbParcel } from "./awb-mock-db";
import type { AwbEvaluation, AwbEvalCtx } from "./awb-engine";

export type AwbOutcome = "pending" | "delivered" | "failed_again" | "returned" | "redirected" | "reviewed" | "re_evaluated";
export interface AwbTimelineEvent { at: number; label: string }
export interface AwbDecisionRecord {
  id: string; awb: string; createdAt: number; nowMin: number; ctx: AwbEvalCtx;
  parcel: AwbParcel; evaluation: AwbEvaluation; confirmed: boolean; confirmedAt?: number;
  operator: string; stage: number; outcome: AwbOutcome; timeline: AwbTimelineEvent[];
}

const KEY = "dro-awb-records";

interface Ctx {
  records: AwbDecisionRecord[];
  fills: Record<string, number>;
  addRecord: (r: AwbDecisionRecord) => void;
  removeRecord: (id: string) => void;
  confirmRecord: (id: string, operator: string) => void;
  advanceRecord: (id: string, outcome?: "delivered" | "failed_again") => void;
  clearRecords: () => void;
}

const AwbContext = createContext<Ctx | null>(null);

export function AwbProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<AwbDecisionRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try { const saved = localStorage.getItem(KEY); if (saved) setRecords(JSON.parse(saved)); } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem(KEY, JSON.stringify(records.slice(0, 200))); }, [records, hydrated]);

  const fills = useMemo(() => {
    const f: Record<string, number> = {};
    for (const r of records) { const id = r.confirmed ? r.evaluation.target?.movementId : undefined; if (id) f[id] = (f[id] ?? 0) + 1; }
    return f;
  }, [records]);

  function addRecord(r: AwbDecisionRecord) { setRecords((prev) => [r, ...prev].slice(0, 200)); }
  function removeRecord(id: string) { setRecords((prev) => prev.filter((r) => r.id !== id)); }

  function confirmRecord(id: string, operator: string) {
    setRecords((prev) => prev.map((r) => {
      if (r.id !== id || r.confirmed) return r;
      const now = Date.now();
      return { ...r, confirmed: true, confirmedAt: now, operator, stage: 0, timeline: [...r.timeline, { at: now, label: `Action confirmed by ${operator}` }, { at: now, label: r.evaluation.lifecycle[0] }] };
    }));
  }

  function advanceRecord(id: string, outcome?: "delivered" | "failed_again") {
    setRecords((prev) => prev.map((r) => {
      if (r.id !== id || !r.confirmed) return r;
      const last = r.evaluation.lifecycle.length - 1;
      if (r.stage >= last) return r;
      const stage = r.stage + 1;
      let label = r.evaluation.lifecycle[stage];
      let out: AwbOutcome = r.outcome;
      if (stage === last) {
        switch (r.evaluation.decision) {
          case "REATTEMPT": out = outcome ?? "delivered"; label = out === "delivered" ? "Delivered ✓ — attempt verified (GPS + OTP)" : "Failed again — parcel returns to the decision queue"; break;
          case "RETURN": out = "returned"; break;
          case "REDIRECT": out = "redirected"; break;
          case "HOLD": out = "re_evaluated"; break;
          case "MANUAL_REVIEW": out = "reviewed"; break;
        }
      }
      return { ...r, stage, outcome: out, timeline: [...r.timeline, { at: Date.now(), label }] };
    }));
  }

  function clearRecords() { setRecords([]); }

  return (
    <AwbContext.Provider value={{ records, fills, addRecord, removeRecord, confirmRecord, advanceRecord, clearRecords }}>
      {children}
    </AwbContext.Provider>
  );
}

export function useAwb() {
  const ctx = useContext(AwbContext);
  if (!ctx) throw new Error("useAwb must be used inside AwbProvider");
  return ctx;
}
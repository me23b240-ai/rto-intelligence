// lib/operations-context.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { CapacityPools, DEFAULT_CAPACITY, RiderSlot, DecisionLogEntry, OutcomeStatus } from "./types";

const DEFAULT_ROSTER: RiderSlot[] = [
  { id: "RDR-1", name: "Rider 1", farStopsToday: 0 },
  { id: "RDR-2", name: "Rider 2", farStopsToday: 0 },
  { id: "RDR-3", name: "Rider 3", farStopsToday: 0 },
  { id: "RDR-4", name: "Rider 4", farStopsToday: 0 },
  { id: "RDR-5", name: "Rider 5", farStopsToday: 0 },
];

interface Ctx {
  capacity: CapacityPools;
  consumeBackhaul: () => void;
  consumeBatch: () => void;
  resetCapacity: () => void;

  roster: RiderSlot[];
  allocateFarStop: (farStopCap: number) => { riderId: string; rotated: boolean };
  resetRoster: () => void;

  decisionLog: DecisionLogEntry[];
  addDecision: (entry: Omit<DecisionLogEntry, "id" | "timestamp" | "outcome">) => void;
  recordOutcome: (id: string, outcome: OutcomeStatus) => void;
  clearLog: () => void;
}

const OperationsContext = createContext<Ctx | null>(null);

export function OperationsProvider({ children }: { children: React.ReactNode }) {
  const [capacity, setCapacity] = useState<CapacityPools>(DEFAULT_CAPACITY);
  const [roster, setRoster] = useState<RiderSlot[]>(DEFAULT_ROSTER);
  const [decisionLog, setDecisionLog] = useState<DecisionLogEntry[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("dro-decision-log");
    if (saved) {
      try { setDecisionLog(JSON.parse(saved)); } catch { /* ignore corrupt storage */ }
    }
  }, []);

  function persistLog(next: DecisionLogEntry[]) {
    setDecisionLog(next);
    localStorage.setItem("dro-decision-log", JSON.stringify(next));
  }

  function consumeBackhaul() {
    setCapacity((prev) => ({ ...prev, backhaulUsedToday: prev.backhaulUsedToday + 1 }));
  }
  function consumeBatch() {
    setCapacity((prev) => ({ ...prev, batchUsedToday: prev.batchUsedToday + 1 }));
  }
  function resetCapacity() {
    setCapacity(DEFAULT_CAPACITY);
  }

  // Picks the least-loaded rider under the cap; if everyone's at/over cap,
  // rotates to the least-loaded anyway and flags it as an over-cap rotation.
  function allocateFarStop(farStopCap: number): { riderId: string; rotated: boolean } {
    let result = { riderId: roster[0].id, rotated: false };
    setRoster((prev) => {
      const sorted = [...prev].sort((a, b) => a.farStopsToday - b.farStopsToday);
      const underCap = sorted.find((r) => r.farStopsToday < farStopCap);
      const chosen = underCap ?? sorted[0];
      result = { riderId: chosen.id, rotated: !underCap };
      return prev.map((r) => (r.id === chosen.id ? { ...r, farStopsToday: r.farStopsToday + 1 } : r));
    });
    return result;
  }
  function resetRoster() { setRoster(DEFAULT_ROSTER); }

  function addDecision(entry: Omit<DecisionLogEntry, "id" | "timestamp" | "outcome">) {
    const next: DecisionLogEntry = {
      ...entry,
      id: `DEC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      outcome: "pending",
    };
    persistLog([next, ...decisionLog].slice(0, 200));
  }
  function recordOutcome(id: string, outcome: OutcomeStatus) {
    persistLog(decisionLog.map((d) => (d.id === id ? { ...d, outcome } : d)));
  }
  function clearLog() { persistLog([]); }

  return (
    <OperationsContext.Provider
      value={{ capacity, consumeBackhaul, consumeBatch, resetCapacity, roster, allocateFarStop, resetRoster, decisionLog, addDecision, recordOutcome, clearLog }}
    >
      {children}
    </OperationsContext.Provider>
  );
}

export function useOperations() {
  const ctx = useContext(OperationsContext);
  if (!ctx) throw new Error("useOperations must be used inside OperationsProvider");
  return ctx;
}
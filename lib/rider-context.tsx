// lib/rider-context.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_INCENTIVES, PayoutIncentiveConfig } from "./rider-payout-engine";
import type { RouteOption } from "./rider-route-engine";
import { generateRiderHistory, DailyRecord } from "./rider-history";
import { Rider, ParcelCandidate, buildInitialRiders, buildInitialParcels, seededExtraParcels, RouteStop, DC_LOCATION } from "./rider-mock-data";

const KEY = "dro-rider-engine-v2";

interface AssignmentLogEntry { id: string; awb: string; riderId: string; at: number; incrementalKm: number }

interface Ctx {
  riders: Rider[];
  parcels: ParcelCandidate[];
  incentives: PayoutIncentiveConfig;
  assignmentLog: AssignmentLogEntry[];
  resetToken: number;
  assignParcel: (parcel: ParcelCandidate, riderId: string, option: RouteOption) => void;
  updateIncentives: (cfg: Partial<PayoutIncentiveConfig>) => void;
  resetDemo: () => void;
  riderHistory: Record<string, DailyRecord[]>;
}

const RiderContext = createContext<Ctx | null>(null);

function initialState() {
  const riders = buildInitialRiders();
  const fixedParcels = buildInitialParcels();
  const avoidPoints = [
    DC_LOCATION,
    ...riders.map((r) => r.currentLocation),
    ...riders.flatMap((r) => r.route.map((s) => s.location)),
    ...fixedParcels.map((p) => p.location),
  ];
  return {
    riders: buildInitialRiders(),
    parcels: [...buildInitialParcels(), ...seededExtraParcels(4)],
    incentives: DEFAULT_INCENTIVES,
    assignmentLog: [] as AssignmentLogEntry[],
    resetToken: 0,
  };
}

export function RiderProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [riderHistory] = useState(() =>
    Object.fromEntries(state.riders.map((r) => [r.id, generateRiderHistory(r.id, r.overallSuccessRate)]))
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setState(JSON.parse(saved));
    } catch { /* ignore corrupt storage */ }
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem(KEY, JSON.stringify(state)); }, [state, hydrated]);

  function assignParcel(parcel: ParcelCandidate, riderId: string, option: RouteOption) {
    setState((prev) => {
      const riders = prev.riders.map((r) => {
        if (r.id !== riderId) return r;
        const newRoute: RouteStop[] = option.newRoute;
        return {
          ...r,
          route: newRoute,
          todayRouteDistanceKm: Math.round((r.todayRouteDistanceKm + option.incrementalDistanceKm) * 100) / 100,
        };
      });
      const parcels = prev.parcels.filter((p) => p.awb !== parcel.awb);
      const assignmentLog: AssignmentLogEntry[] = [
        { id: `${parcel.awb}-${Date.now()}`, awb: parcel.awb, riderId, at: Date.now(), incrementalKm: option.incrementalDistanceKm },
        ...prev.assignmentLog,
      ].slice(0, 100);
      return { ...prev, riders, parcels, assignmentLog };
    });
  }

  function updateIncentives(cfg: Partial<PayoutIncentiveConfig>) {
    setState((prev) => ({ ...prev, incentives: { ...prev.incentives, ...cfg } }));
  }

  function resetDemo() {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    setState((prev) => ({ ...initialState(), resetToken: prev.resetToken + 1 }));
  }

  return (
    <RiderContext.Provider value={{ ...state, riderHistory, assignParcel, updateIncentives, resetDemo }}>
      {children}
    </RiderContext.Provider>
  );
}

export function useRiderEngine() {
  const ctx = useContext(RiderContext);
  if (!ctx) throw new Error("useRiderEngine must be used inside RiderProvider");
  return ctx;
}
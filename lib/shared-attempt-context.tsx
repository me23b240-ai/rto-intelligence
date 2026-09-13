// lib/shared-attempt-context.tsx
"use client";
import { createContext, useContext, useState } from "react";
import { Attempt } from "./types";

interface Ctx {
  lastFlaggedAttempt: Attempt | null;
  setLastFlaggedAttempt: (a: Attempt) => void;
  clearLastFlaggedAttempt: () => void;
}

const SharedAttemptContext = createContext<Ctx | null>(null);

export function SharedAttemptProvider({ children }: { children: React.ReactNode }) {
  const [lastFlaggedAttempt, setLastFlaggedAttemptState] = useState<Attempt | null>(null);

  return (
    <SharedAttemptContext.Provider
      value={{
        lastFlaggedAttempt,
        setLastFlaggedAttempt: setLastFlaggedAttemptState,
        clearLastFlaggedAttempt: () => setLastFlaggedAttemptState(null),
      }}
    >
      {children}
    </SharedAttemptContext.Provider>
  );
}

export function useSharedAttempt() {
  const ctx = useContext(SharedAttemptContext);
  if (!ctx) throw new Error("useSharedAttempt must be used inside SharedAttemptProvider");
  return ctx;
}
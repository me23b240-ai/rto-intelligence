// lib/settings-context.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Settings, DEFAULT_SETTINGS } from "./types";

interface Ctx {
  settings: Settings;
  updateSetting: (key: keyof Settings, value: number) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const saved = localStorage.getItem("dro-settings");
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch {
        // ignore corrupt storage, keep defaults
      }
    }
  }, []);

  function updateSetting(key: keyof Settings, value: number) {
    setSettings((prev: Settings) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("dro-settings", JSON.stringify(next));
      return next;
    });
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem("dro-settings", JSON.stringify(DEFAULT_SETTINGS));
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
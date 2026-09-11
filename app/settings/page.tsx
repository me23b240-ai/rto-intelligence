// app/settings/page.tsx
"use client";
import { Nav } from "@/components/nav";
import { EvidenceTagBadge } from "@/components/evidence-tag";
import { useSettings } from "@/lib/settings-context";
import { Settings, SETTINGS_TAGS } from "@/lib/types";

const FIELDS: { key: keyof Settings; label: string; prefix?: string; suffix?: string }[] = [
  { key: "forwardCost", label: "Forward logistics cost", prefix: "₹" },
  { key: "standardReverseCost", label: "Standard reverse logistics cost", prefix: "₹" },
  { key: "backhaulCost", label: "Backhaul cost", prefix: "₹" },
  { key: "batchCost", label: "Batch consolidation cost", prefix: "₹" },
  { key: "liquidationCost", label: "Local liquidation cost", prefix: "₹" },
  { key: "fastSecureCost", label: "Fast & secure return cost", prefix: "₹" },
  { key: "lowValueThreshold", label: "Low-value threshold", prefix: "₹" },
  { key: "highValueThreshold", label: "High-value threshold", prefix: "₹" },
  { key: "basePay", label: "Rider base pay", prefix: "₹" },
  { key: "baseKmCovered", label: "Distance covered by base pay", suffix: "km" },
  { key: "perKmRate", label: "Per-km rate beyond base", prefix: "₹" },
  { key: "hardAddressBonus", label: "Hard-address bonus", prefix: "₹" },
  { key: "farStopThreshold", label: "Far-stop distance threshold", suffix: "km" },
  { key: "farStopBonus", label: "Far-stop return bonus", prefix: "₹" },
  { key: "farStopCap", label: "Far-stop cap per shift", suffix: "stops" },
];

function SettingsContent() {
  const { settings, updateSetting, resetSettings } = useSettings();

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-400">Every assumption used by both engines — change it and both pages recalculate live.</p>
          </div>
          <button onClick={resetSettings} className="text-xs font-medium text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-100">
            Reset to defaults
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between px-5 py-3">
              <div>
                <span className="text-sm text-slate-700">{f.label}</span>
                <EvidenceTagBadge tag={SETTINGS_TAGS[f.key]} />
              </div>
              <div className="flex items-center gap-1">
                {f.prefix && <span className="text-sm text-slate-400">{f.prefix}</span>}
                <input
                  type="number"
                  value={settings[f.key]}
                  onChange={(e) => updateSetting(f.key, Number(e.target.value))}
                  className="w-24 text-right border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-[var(--meesho-purple)]"
                />
                {f.suffix && <span className="text-sm text-slate-400">{f.suffix}</span>}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}
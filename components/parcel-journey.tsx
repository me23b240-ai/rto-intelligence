// components/parcel-journey.tsx
"use client";
import { useState } from "react";
import { IconBook, IconCheck, IconBox, IconTruck, IconRider, IconDoor, IconReturn } from "@/lib/icons";

const STAGES = [
  { title: "Book", icon: IconBook, breaks: "No confirmation sent after a COD order is placed." },
  { title: "Confirmed", icon: IconCheck, breaks: "High-RTO pincodes aren't flagged at this stage." },
  { title: "Pickup", icon: IconBox, breaks: "New addresses aren't trained on yet." },
  { title: "In transit", icon: IconTruck, breaks: "Customer intent quietly decreases as transit days pass." },
  { title: "Last-mile", icon: IconRider, breaks: "No check on whether the customer is actually available." },
  { title: "Attempt", icon: IconDoor, breaks: "Customer may not have cash on hand for COD." },
  { title: "RTO", icon: IconReturn, breaks: "Every failure gets the same treatment — full reverse journey.", isEnd: true },
];

export function ParcelJourney() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900">A parcel's journey — tap a step to see where it breaks</h2>
      </div>

      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const isActive = active === i;
          return (
            <div key={s.title} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => setActive(isActive ? null : i)}
                className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition ${
                  isActive ? (s.isEnd ? "bg-red-50" : "bg-[var(--meesho-purple-light)]") : "hover:bg-slate-50"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    s.isEnd ? "bg-red-500 text-white" : "text-white"
                  }`}
                  style={!s.isEnd ? { backgroundColor: "var(--meesho-purple)" } : {}}
                >
                  <Icon />
                </div>
                <span className="text-[11px] font-medium text-slate-700 truncate w-full text-center">{s.title}</span>
              </button>
              {i < STAGES.length - 1 && <div className="text-slate-300 text-xs px-0.5">→</div>}
            </div>
          );
        })}
      </div>

      {active !== null && (
        <div className={`mt-3 rounded-lg border px-4 py-2.5 text-sm ${STAGES[active].isEnd ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
          ⚠ {STAGES[active].breaks}
        </div>
      )}
    </div>
  );
}
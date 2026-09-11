// components/evidence-tag.tsx
import { EvidenceTag } from "@/lib/types";

const LABEL: Record<EvidenceTag, string> = {
  "evidence-backed": "🟢 Case fact",
  "benchmark-based": "🟡 Benchmark",
  "assumption": "🟠 Assumption",
};

export function EvidenceTagBadge({ tag }: { tag: EvidenceTag }) {
  return <span className="text-[11px] text-slate-400 ml-1.5">{LABEL[tag]}</span>;
}
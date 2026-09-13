// components/evidence-tag.tsx
import { EvidenceTag } from "@/lib/types";

const LABEL: Record<EvidenceTag, string> = {
  fact: "FACT",
  primary: "PRIMARY",
  calculated: "CALCULATED",
  hypothesis: "HYPOTHESIS",
};

const STYLE: Record<EvidenceTag, string> = {
  fact: "bg-purple-50 text-[var(--meesho-purple)] border-purple-200",
  primary: "bg-blue-50 text-blue-700 border-blue-200",
  calculated: "bg-slate-100 text-slate-600 border-slate-200",
  hypothesis: "bg-amber-50 text-amber-700 border-amber-200",
};

export function EvidenceTagBadge({ tag }: { tag: EvidenceTag }) {
  return (
    <span className={`inline-block text-[10px] font-semibold tracking-wide border rounded px-1.5 py-0.5 ml-1.5 ${STYLE[tag]}`}>
      {LABEL[tag]}
    </span>
  );
}
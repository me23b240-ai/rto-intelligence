// components/finance-tag.tsx
export type FinanceTagType = "case" | "calculated" | "model" | "hypothesis" | "assumption" | "illustrative" | "public" | "team" | "simulated";

const LABEL: Record<FinanceTagType, string> = {
  case: "CASE-GIVEN", calculated: "CALCULATED", model: "MODEL ASSUMPTION", hypothesis: "HYPOTHESIS",
  assumption: "ASSUMPTION", illustrative: "ILLUSTRATIVE", public: "PUBLIC", team: "TEAM-PROVIDED", simulated: "SIMULATED",
};
const STYLE: Record<FinanceTagType, string> = {
  case: "bg-purple-50 text-purple-700 border-purple-200",
  calculated: "bg-slate-100 text-slate-600 border-slate-200",
  model: "bg-amber-50 text-amber-700 border-amber-200",
  hypothesis: "bg-orange-50 text-orange-700 border-orange-200",
  assumption: "bg-blue-50 text-blue-700 border-blue-200",
  illustrative: "bg-indigo-50 text-indigo-700 border-indigo-200",
  public: "bg-green-50 text-green-700 border-green-200",
  team: "bg-teal-50 text-teal-700 border-teal-200",
  simulated: "bg-pink-50 text-pink-700 border-pink-200",
};

export function FinanceTag({ type }: { type: FinanceTagType }) {
  return <span className={`inline-block text-[9.5px] font-semibold tracking-wide border rounded px-1.5 py-0.5 ml-1.5 ${STYLE[type]}`}>{LABEL[type]}</span>;
}
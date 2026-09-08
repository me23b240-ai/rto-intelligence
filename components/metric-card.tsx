// components/metric-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  label, value, help, accent,
}: { label: string; value: string; help?: string; accent?: "purple" | "pink" | "mango" | "red" }) {
  const accentBar: Record<string, string> = {
    purple: "bg-[var(--meesho-purple)]",
    pink: "bg-[var(--meesho-pink)]",
    mango: "bg-[var(--meesho-mango)]",
    red: "bg-[var(--meesho-red)]",
  };
  return (
    <Card className="relative overflow-hidden border-slate-200">
      {accent && <div className={`absolute top-0 left-0 h-1 w-full ${accentBar[accent]}`} />}
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        {help && <p className="text-xs text-slate-400 mt-1">{help}</p>}
      </CardContent>
    </Card>
  );
}
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  change?: { value: string; trend: "up" | "down"; isPositive: boolean };
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

export function KpiCard({
  label,
  value,
  change,
  icon: Icon,
  iconColor = "text-lumen-glow",
  iconBg = "bg-slate-100",
}: KpiCardProps) {
  const TrendIcon = change?.trend === "up" ? TrendingUp : TrendingDown;
  const trendColor = change?.isPositive
    ? "text-lumen-pulse"
    : "text-lumen-flag";

  return (
    <Card className="p-5 hover:translate-y-[-2px] transition-all">
      <div className="flex justify-between items-start mb-3">
        <span className="text-overline text-slate-500 uppercase">{label}</span>
        <div className={cn("w-9 h-9 rounded flex items-center justify-center", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </div>
      <div className="text-display-md tracking-tight mb-1">{value}</div>
      {change && (
        <div className={cn("text-caption flex items-center gap-1", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          <span>{change.value}</span>
        </div>
      )}
    </Card>
  );
}

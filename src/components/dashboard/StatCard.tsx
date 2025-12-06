
import type { StatCardData } from "@/lib/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeType,
  className,
}: StatCardData & { className?: string }) {
  return (
    <Card className={cn("rounded-none border-0 shadow-none bg-background p-8", className)}>
      <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-sm uppercase tracking-widest font-medium text-zinc-400">{title}</CardTitle>
        <Icon className="h-5 w-5 text-zinc-300" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="text-4xl font-light tracking-tighter">{value}</div>
        {change && (
          <p className="text-xs text-zinc-400 mt-2">
            <span className={cn(
              changeType === "increase" && "text-green-600",
              changeType === "decrease" && "text-red-600"
            )}>
              {change}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

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
}: StatCardData) {
  return (
    <Card className="rounded-3xl bg-white/65 backdrop-blur-md border-white/40 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-secondary-text">{title}</CardTitle>
        <Icon className="h-5 w-5 text-tertiary-text" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary-text">{value}</div>
        {change && (
          <p
            className={cn(
              "text-xs text-secondary-text",
              changeType === "increase" && "text-success-text",
              changeType === "decrease" && "text-red-600"
            )}
          >
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

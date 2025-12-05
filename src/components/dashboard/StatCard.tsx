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
        {/* Title remains responsive with a good default size */}
        <CardTitle className="text-sm font-medium text-secondary-text">{title}</CardTitle>
        {/* Icon size remains consistent */}
        <Icon className="h-5 w-5 text-tertiary-text" />
      </CardHeader>
      <CardContent>
        {/* Responsiveness Fix: The value text now defaults to 'text-xl' for small screens 
          and scales up to 'text-2xl' for medium/larger screens ('sm' breakpoint and up).
        */}
        <div className="text-xl sm:text-2xl font-bold text-primary-text">{value}</div>
        {change && (
          <div
            className={cn(
              "text-xs text-secondary-text inline-block px-2 py-1 rounded-full mt-1",
              changeType === "increase" && "text-success-text bg-success-bg/60",
              changeType === "decrease" && "text-red-600 bg-red-100/60"
            )}
          >
            {change}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
"use client";

import type { RevenueData } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

type RevenueChartProps = {
  data: RevenueData[];
};

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--foreground))",
  },
};

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card className="rounded-none border-0 shadow-none bg-transparent p-0">
      <CardHeader className="p-0 mb-8">
        <CardTitle className="text-sm uppercase tracking-widest font-medium text-zinc-400">
          Revenue Overview
        </CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Showing revenue for the last 7 days
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ChartContainer config={chartConfig} className="w-full h-[250px]">
          <ResponsiveContainer>
            <AreaChart
              accessibilityLayer
              data={data}
              margin={{
                top: 5,
                right: 5,
                left: -30, 
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `Rs. ${Number(value) / 1000}k`}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <ChartTooltip
                cursor={true}
                content={<ChartTooltipContent 
                    indicator="dot" 
                    className="rounded-none border-zinc-200 bg-background"
                />}
              />
              <Area 
                dataKey="revenue" 
                type="natural"
                strokeWidth={2}
                stroke="var(--color-revenue)" 
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

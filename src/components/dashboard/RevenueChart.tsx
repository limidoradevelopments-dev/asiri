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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

type RevenueChartProps = {
  data: RevenueData[];
};

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
};

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card className="rounded-3xl bg-white/65 backdrop-blur-md border-white/40 shadow-sm flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-primary-text">
          Revenue Overview
        </CardTitle>
        <CardDescription className="text-sm text-secondary-text">
          Showing revenue for the last 7 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {/*
          Key for responsiveness: w-full ensures it fits the card width.
          h-64 (256px) is the mobile/default height.
          sm:h-80 (320px) increases the height on small screens and up.
        */}
        <ChartContainer config={chartConfig} className="w-full h-full min-h-64 sm:min-h-80">
          {/* ResponsiveContainer makes the BarChart scale its dimensions to its parent */}
          <ResponsiveContainer>
            <BarChart
              accessibilityLayer
              data={data}
              margin={{
                top: 5,
                right: 5,
                // Left margin is slightly negative to give the YAxis labels more room on all screens
                left: -20, 
                bottom: 5,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                // Shorten the day names (e.g., 'Mon') for all screens
                tickFormatter={(value) => value.slice(0, 3)} 
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                // Format the revenue for readability (e.g., 'Rs. 50k')
                tickFormatter={(value) => `Rs. ${value / 1000}k`} 
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={8} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

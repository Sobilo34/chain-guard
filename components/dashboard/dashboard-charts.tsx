"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const volatilityData = [
  { time: "00:00", volatility: 8.2, threshold: 15 },
  { time: "04:00", volatility: 9.1, threshold: 15 },
  { time: "08:00", volatility: 12.4, threshold: 15 },
  { time: "12:00", volatility: 18.2, threshold: 15 },
  { time: "16:00", volatility: 14.8, threshold: 15 },
  { time: "20:00", volatility: 11.3, threshold: 15 },
  { time: "Now", volatility: 10.5, threshold: 15 },
];

const liquidityData = [
  { name: "Pool A", current: 85, threshold: 70 },
  { name: "Pool B", current: 92, threshold: 70 },
  { name: "Pool C", current: 65, threshold: 70 },
  { name: "Pool D", current: 78, threshold: 70 },
  { name: "Pool E", current: 88, threshold: 70 },
];

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function DashboardCharts() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Market Volatility Chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Market Volatility (24h)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Aggregate volatility across all monitored contracts
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volatilityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="volatilityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="threshold"
                  stroke="hsl(var(--chart-3))"
                  strokeDasharray="5 5"
                  fill="none"
                  strokeWidth={1.5}
                  name="Threshold"
                />
                <Area
                  type="monotone"
                  dataKey="volatility"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#volatilityGradient)"
                  strokeWidth={2}
                  name="Volatility"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Liquidity Health Chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Liquidity Health
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Current liquidity vs minimum threshold
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={liquidityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="current" 
                  fill="hsl(var(--chart-2))" 
                  radius={[4, 4, 0, 0]}
                  name="Current"
                />
                <Bar 
                  dataKey="threshold" 
                  fill="hsl(var(--chart-3))" 
                  radius={[4, 4, 0, 0]}
                  fillOpacity={0.3}
                  name="Threshold"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

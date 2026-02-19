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

type VolatilityPoint = { name: string; volatility: number };
type LiquidityPoint = { name: string; tvl: number };

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {payload.map((entry, index) => {
          const isTvl = entry.name.toLowerCase() === "tvl";
          const value = isTvl
            ? `$${(entry.value / 1_000_000).toFixed(1)}M`
            : `${entry.value}%`;
          return (
            <p
              key={index}
              className="text-sm font-semibold"
              style={{ color: entry.color }}
            >
              {entry.name}: {value}
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

export function DashboardCharts({
  volatilitySeries,
  liquiditySeries,
}: {
  volatilitySeries: VolatilityPoint[];
  liquiditySeries: LiquidityPoint[];
}) {
  const hasVolatility = volatilitySeries.length > 0;
  const hasLiquidity = liquiditySeries.length > 0;

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
            {hasVolatility ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={volatilitySeries}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="volatilityGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
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
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No volatility data available.
              </div>
            )}
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
            {hasLiquidity ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={liquiditySeries}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                    tickFormatter={(value) => `$${Number(value) / 1_000_000}M`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="tvl"
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                    name="TVL"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No TVL data available.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

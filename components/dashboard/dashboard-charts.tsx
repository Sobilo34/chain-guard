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

// High-contrast colors for chart elements so they remain visible in dark mode
const CHART_AXIS_AND_GRID = "rgb(148 163 184)"; // slate-400, visible on dark bg
const CHART_VOLATILITY_STROKE = "rgb(56 189 248)"; // sky-400
const CHART_LIQUIDITY_FILL = "rgb(34 197 94)";   // green-500

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
                      <stop offset="0%" stopColor={CHART_VOLATILITY_STROKE} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_VOLATILITY_STROKE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_AXIS_AND_GRID} strokeOpacity={0.6} vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: CHART_AXIS_AND_GRID, fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: CHART_AXIS_AND_GRID, fontSize: 12, fontWeight: 600 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="volatility"
                    stroke={CHART_VOLATILITY_STROKE}
                    fill="url(#volatilityGradient)"
                    strokeWidth={2.5}
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
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_AXIS_AND_GRID} strokeOpacity={0.6} vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: CHART_AXIS_AND_GRID, fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: CHART_AXIS_AND_GRID, fontSize: 12, fontWeight: 600 }}
                    tickFormatter={(value) => `$${Number(value) / 1_000_000}M`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="tvl"
                    fill={CHART_LIQUIDITY_FILL}
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

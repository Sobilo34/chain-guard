"use client";

import { use } from "react";
import Link from "next/link";
import * as framerMotion from "framer-motion";
const motion =
  (framerMotion as any).motion ||
  (framerMotion as any).default?.motion ||
  (framerMotion as any).default;
const AnimatePresence =
  (framerMotion as any).AnimatePresence ||
  (framerMotion as any).default?.AnimatePresence;
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  AlertTriangle,
  TrendingUp,
  Droplets,
  Activity,
  Shield,
  Sparkles,
  Clock,
  Settings,
  Zap,
  ChevronRight,
} from "lucide-react";

// Mock data
const contractData = {
  id: "1",
  name: "Uniswap V3 Pool",
  address: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
  chain: "ethereum",
  status: "monitored",
  tvl: "$8.2M",
  price: "$2,847.32",
  volume24h: "$1.2M",
  liquidity: "85%",
};

const volatilityHistory = [
  { time: "Mon", value: 8.2 },
  { time: "Tue", value: 9.5 },
  { time: "Wed", value: 12.1 },
  { time: "Thu", value: 18.4 },
  { time: "Fri", value: 14.2 },
  { time: "Sat", value: 10.8 },
  { time: "Sun", value: 8.9 },
];

const liquidityData = [
  { name: "Current", value: 85, threshold: 70 },
  { name: "Min (24h)", value: 78, threshold: 70 },
  { name: "Max (24h)", value: 92, threshold: 70 },
];

const riskBreakdown = [
  { name: "Volatility", value: 30, color: "hsl(var(--chart-1))" },
  { name: "Liquidity", value: 20, color: "hsl(var(--chart-2))" },
  { name: "Manipulation", value: 15, color: "hsl(var(--chart-3))" },
  { name: "Depeg", value: 35, color: "hsl(var(--chart-4))" },
];

const riskScoreHistory = [
  { time: "1h", score: 72 },
  { time: "2h", score: 75 },
  { time: "3h", score: 68 },
  { time: "4h", score: 71 },
  { time: "5h", score: 74 },
  { time: "6h", score: 72 },
];

const historicalAlerts = [
  {
    id: "1",
    time: "2 hours ago",
    type: "Volatility Spike",
    severity: "medium",
    status: "resolved",
  },
  {
    id: "2",
    time: "6 hours ago",
    type: "Liquidity Drop",
    severity: "low",
    status: "resolved",
  },
  {
    id: "3",
    time: "1 day ago",
    type: "Price Deviation",
    severity: "high",
    status: "resolved",
  },
  {
    id: "4",
    time: "2 days ago",
    type: "Volume Surge",
    severity: "low",
    status: "resolved",
  },
];

const aiSuggestions = [
  {
    title: "Increase Liquidity Threshold",
    description:
      "Based on recent volatility patterns, consider raising your liquidity drop threshold from 20% to 25% to receive earlier warnings.",
  },
  {
    title: "Enable Manipulation Detection",
    description:
      "Your contract shows patterns that could benefit from our advanced manipulation detection feature. This monitors for sandwich attacks and front-running.",
  },
  {
    title: "Add Price Feed Redundancy",
    description:
      "Consider adding multiple oracle price feeds for this asset to improve accuracy and reduce single point of failure risk.",
  },
];

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-semibold text-foreground">
            {entry.name}: {entry.value}
            {entry.name === "Volatility" || entry.name === "value" ? "%" : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case "low":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-0 px-3 font-bold tracking-tight uppercase text-[10px]">
          Low Risk
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-amber-500/10 text-amber-500 border-0 px-3 font-bold tracking-tight uppercase text-[10px]">
          Moderate
        </Badge>
      );
    case "high":
      return (
        <Badge className="bg-rose-500/10 text-rose-500 border-0 px-3 font-bold tracking-tight uppercase text-[10px]">
          Critical
        </Badge>
      );
    default:
      return (
        <Badge
          variant="secondary"
          className="px-3 font-bold uppercase text-[10px]"
        >
          Unknown
        </Badge>
      );
  }
};

export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="mx-auto w-full space-y-8 p-6 lg:p-10">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
            <Link
              href="/dashboard"
              className="transition-colors hover:text-primary"
            >
              Terminal
            </Link>
            <span className="opacity-30">/</span>
            <Link
              href="/dashboard/contracts"
              className="transition-colors hover:text-primary"
            >
              Registry
            </Link>
            <span className="opacity-30">/</span>
            <span className="text-foreground">{contractData.id}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-primary/10 text-primary shadow-inner">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground lg:text-4xl">
                {contractData.name}
                <span className="text-primary italic">.</span>
              </h1>
              <div className="mt-1 flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-full bg-muted/30 px-3 py-1 text-[11px] font-mono font-medium text-muted-foreground border border-border/40">
                  {contractData.address.slice(0, 10)}...
                  {contractData.address.slice(-8)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 hover:text-primary"
                    onClick={() => copyToClipboard(contractData.address)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <Badge
                  variant="outline"
                  className="h-6 gap-1.5 rounded-full border-border/40 px-2.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-[#627EEA] shadow-[0_0_8px_#627EEA]" />
                  Ethereum Mainnet
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3"
        >
          <Button
            variant="outline"
            className="h-12 rounded-[1.25rem] border-border/40 bg-card/40 font-bold backdrop-blur-xl"
          >
            <Settings className="mr-2 h-4 w-4" />
            Tuning
          </Button>
          <Button className="h-12 rounded-[1.25rem] bg-primary px-8 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
            <ExternalLink className="mr-2 h-4 w-4" />
            Etherscan
          </Button>
        </motion.div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
        {[
          {
            label: "Total Value Locked",
            value: contractData.tvl,
            icon: Droplets,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Token Exchange",
            value: contractData.price,
            icon: TrendingUp,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Daily Volume",
            value: contractData.volume24h,
            icon: Activity,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
          },
          {
            label: "Liquidity Depth",
            value: contractData.liquidity,
            icon: Zap,
            color: "text-rose-500",
            bg: "bg-rose-500/10",
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 p-6 backdrop-blur-xl transition-all hover:border-primary/20"
          >
            <div
              className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}
            >
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-black text-foreground">
              {stat.value}
            </p>
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-colors" />
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Volatility Chart */}
          <Card className="overflow-hidden rounded-[2.5rem] border-border/40 bg-card/20 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 px-8 py-6">
              <div>
                <CardTitle className="text-xl font-black tracking-tight">
                  Market Variance
                </CardTitle>
                <CardDescription className="text-xs font-medium text-muted-foreground">
                  Rolling 7-day volatility analysis.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                <Activity className="h-3 w-3" />
                Stable Stream
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volatilityHistory}>
                    <defs>
                      <linearGradient
                        id="chartGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fontWeight: 600,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fontWeight: 600,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        stroke: "hsl(var(--primary))",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      fill="url(#chartGrad)"
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* AI Strategy Insights */}
          <div className="space-y-6">
            <h3 className="flex items-center gap-2 text-lg font-black tracking-tight text-foreground px-2">
              <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500" />
              Machine Learning Forensics
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {aiSuggestions.map((suggestion, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -5 }}
                  className="rounded-[2rem] border border-border/40 bg-card/40 p-6 backdrop-blur-xl"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[1rem] bg-background/50 shadow-inner">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="mb-2 text-sm font-black text-foreground">
                    {suggestion.title}
                  </h4>
                  <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                    {suggestion.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Center - Sidebar */}
        <div className="space-y-8">
          {/* Risk Health */}
          <Card className="rounded-[2.5rem] border-border/40 bg-card/40 backdrop-blur-xl">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="text-lg font-black tracking-tight">
                Sentinel Health
              </CardTitle>
              <CardDescription className="text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                Aggregate Risk Score
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="relative flex items-center justify-center py-6">
                <div className="text-center">
                  <span className="text-6xl font-black tracking-tighter text-foreground">
                    72
                  </span>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    Nominal
                  </p>
                </div>
                {/* Animated Pulse around score */}
                <div className="absolute inset-x-0 inset-y-0 -z-10 bg-emerald-500/5 blur-3xl rounded-full" />
              </div>

              <div className="mt-8 space-y-4">
                {riskBreakdown.map((item, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="text-foreground">{item.value}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 1, delay: i * 0.2 }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Event Log */}
          <Card className="rounded-[2.5rem] border-border/40 bg-card/20 backdrop-blur-xl">
            <CardHeader className="px-8 pt-8 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight">
                  Audit Log
                </CardTitle>
                <CardDescription className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
                  Recent Signals
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full border border-border/40"
              >
                <Clock className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-4">
              {historicalAlerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/40 p-4 transition-colors hover:bg-background/60"
                >
                  <div
                    className={`mt-1 h-2 w-2 rounded-full ${alert.severity === "high" ? "bg-rose-500" : alert.severity === "medium" ? "bg-amber-500" : "bg-emerald-500"}`}
                  />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-foreground">
                      {alert.type}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground">
                      {alert.time}
                    </p>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="h-11 w-full rounded-2xl border-border/40 font-bold text-xs uppercase tracking-widest"
              >
                Full History
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

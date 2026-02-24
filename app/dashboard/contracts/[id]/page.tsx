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
import { getContractDetail } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";

interface HistoryItem {
  time: string;
  value?: number;
  score?: number;
}

interface AISuggestion {
  title: string;
  description: string;
}

interface HistoricalAlert {
  id: string;
  time: string;
  type: string;
  severity: string;
  status: string;
}

export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: contractAddress } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const detail = await getContractDetail(contractAddress);
        setData(detail);
        setError(null);
      } catch (err: any) {
        console.error("Failed to fetch contract detail", err);
        const message =
          typeof err?.message === "string" ? err.message : String(err || "Unknown error");
        setError(message);
        toast.error("Failed to load contract detail", {
          description: message,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [contractAddress]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex bg-slate-900 h-[80vh] items-center justify-center rounded-3xl m-6 border border-slate-800 shadow-2xl">
        <div className="text-center space-y-6 max-w-md px-10">
          <div className="mx-auto w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center border border-warning/20">
            <AlertTriangle className="h-10 w-10 text-warning" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
              Terminal Locked
            </h2>
            <p className="text-slate-400 font-medium">
              {error
                ? `Failed to load contract detail: ${error}`
                : "The requested oracle stream is not registered in the ecosystem."}
            </p>
          </div>
          <Link href="/dashboard/contracts">
            <Button
              variant="outline"
              className="mt-4 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 transition-all rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-[10px]"
            >
              Back to Registry
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Use the fetched data
  const contractData = {
    id: data.address,
    name: data.name,
    address: data.address,
    chain: data.chain,
    status: data.riskLevel.toLowerCase(),
    tvl: data.metrics?.tvl
      ? `$${(data.metrics.tvl / 1000000).toFixed(1)}M`
      : "$0.0M",
    price: `$${data.metrics?.price?.toFixed(2) || "0.00"}`,
    volume24h: data.metrics?.volume24h
      ? `$${(data.metrics.volume24h / 1000000).toFixed(1)}M`
      : "$0.0M",
    liquidity: `${data.metrics?.liquidity?.toFixed(0) || "0"}%`,
  };

  const volatilityHistory: HistoryItem[] = data.history?.volatility || [];
  // const riskScoreHistory: HistoryItem[] = data.history?.riskScore || [];
  const historicalAlerts: HistoricalAlert[] = data.recentAlerts || [];
  const aiSuggestions: AISuggestion[] = data.aiSuggestions || [];

  const riskBreakdown = [
    {
      name: "Volatility",
      value: data.riskScore > 30 ? 30 : data.riskScore,
      color: "hsl(var(--chart-1))",
    },
    { name: "Liquidity", value: 20, color: "hsl(var(--chart-2))" },
    { name: "Manipulation", value: 15, color: "hsl(var(--chart-3))" },
    { name: "Depeg", value: 35, color: "hsl(var(--chart-4))" },
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

          {/* Detailed Gemini AI Analysis */}
          {data.latestScan && (
            <div className="space-y-6">
              <h3 className="flex items-center gap-2 text-lg font-black tracking-tight text-foreground px-2">
                <Zap className="h-5 w-5 text-primary fill-primary" />
                Gemini Pro Intelligence
              </h3>
              
              <div className="rounded-[2.5rem] border border-primary/20 bg-primary/5 p-8 backdrop-blur-xl">
                <div className="space-y-6">
                  {/* Summary & Reasoning */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black uppercase text-primary/70 tracking-widest">Executive Summary</h5>
                    <p className="text-sm font-medium leading-relaxed text-foreground/90 bg-background/30 p-4 rounded-2xl border border-primary/10">
                      {data.latestScan.reasoning}
                    </p>
                  </div>

                  {/* Root Cause & Consequences */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase text-rose-500/70 tracking-widest flex items-center gap-1.5">
                         <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                         Root Cause Analysis
                      </h5>
                      <p className="text-xs font-semibold leading-relaxed text-muted-foreground p-4 rounded-2xl border border-rose-500/10 bg-rose-500/[0.02]">
                        {data.latestScan.cause || "No root cause identified."}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase text-amber-500/70 tracking-widest flex items-center gap-1.5">
                         <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                         Potential Impact
                      </h5>
                      <p className="text-xs font-semibold leading-relaxed text-muted-foreground p-4 rounded-2xl border border-amber-500/10 bg-amber-500/[0.02]">
                        {data.latestScan.consequences || "Impact assessment pending."}
                      </p>
                    </div>
                  </div>

                  {/* Mitigation Strategy */}
                  {data.latestScan.mitigationStrategy && (
                    <div className="space-y-3 pt-2">
                      <h5 className="text-[10px] font-black uppercase text-emerald-500/70 tracking-widest flex items-center gap-1.5">
                         <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                         Technical Mitigation Strategy
                      </h5>
                      <div className="text-xs font-bold leading-relaxed text-emerald-500/90 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] shadow-inner font-mono">
                        {data.latestScan.mitigationStrategy}
                      </div>
                    </div>
                  )}

                  {/* Immediate Next Steps */}
                  {data.latestScan.nextSteps && data.latestScan.nextSteps.length > 0 && (
                     <div className="space-y-4 pt-4 border-t border-primary/10">
                       <h5 className="text-[10px] font-black uppercase text-primary tracking-widest">Action Items</h5>
                       <div className="space-y-2">
                         {data.latestScan.nextSteps.map((step: string, i: number) => (
                           <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-primary/5 group/step hover:bg-background/60 transition-colors">
                             <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
                               {i + 1}
                             </div>
                             <span className="text-xs font-bold text-foreground/80 group-hover/step:text-primary transition-colors">{step}</span>
                           </div>
                         ))}
                       </div>
                     </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Strategy Insights */}
          <div className="space-y-6">
            <h3 className="flex items-center gap-2 text-lg font-black tracking-tight text-foreground px-2">
              <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500" />
              Machine Learning Forensics
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {aiSuggestions.map((suggestion: AISuggestion, i: number) => (
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
                    {data.riskScore}
                  </span>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    {data.riskScore < 40
                      ? "Low"
                      : data.riskScore < 75
                        ? "Nominal"
                        : "Warning"}
                  </p>
                </div>
                {/* Animated Pulse around score */}
                <div className="absolute inset-x-0 inset-y-0 -z-10 bg-emerald-500/5 blur-3xl rounded-full" />
              </div>

              <div className="mt-8 space-y-4">
                {riskBreakdown.map((item: any, i: number) => (
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
              {historicalAlerts.map((alert: HistoricalAlert, i: number) => (
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

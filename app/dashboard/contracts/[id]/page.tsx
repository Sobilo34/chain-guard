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
  Pencil,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getContractDetail, runAnalyzeStream, type AnalyzeResult, type NeedMoreInfoQuestion } from "@/lib/api";
import { ContractStorage } from "@/lib/storage";
import { formatTvl, formatVolume, formatPrice, formatLiquidityPercent, formatSyncTime } from "@/lib/format-metrics";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";

const DEFAULT_RISK_THRESHOLDS = {
  depegTolerance: 0.02,
  volatilityMax: 0.15,
  liquidityDropMax: 0.25,
  collateralRatioMin: 1.5,
};

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
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [tuningOpen, setTuningOpen] = useState(false);
  const [thresholdForm, setThresholdForm] = useState(DEFAULT_RISK_THRESHOLDS);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<
    "discovering" | "pre-cre" | "cre" | "post-cre" | "complete" | "error"
  >("discovering");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisLogLines, setAnalysisLogLines] = useState<string[]>([]);
  const analysisLogRef = useRef<HTMLDivElement>(null);
  const [analysisNeedMoreInfo, setAnalysisNeedMoreInfo] = useState<{
    questions: NeedMoreInfoQuestion[];
    message?: string;
  } | null>(null);
  const [needMoreInfoFormValues, setNeedMoreInfoFormValues] = useState<Record<string, string>>({});
  const [liveMetrics, setLiveMetrics] = useState<{ tvl?: number; price?: number; volume24h?: number | null; liquidity?: number | null } | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const detail = await getContractDetail(contractAddress);
        setData(detail);
        setError(null);
        setEditedName(detail?.name ?? "");
        setThresholdForm({ ...DEFAULT_RISK_THRESHOLDS, ...(detail?.riskThresholds || {}) });
        if (detail?.fullAnalysis) {
          setAnalyzeResult(detail.fullAnalysis);
        }
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

  // Fetch real-time portfolio metrics (TVL from chain) when contract is loaded.
  // Use this contract's discovered tokens when available (from add or analysis); otherwise API falls back to network default list.
  useEffect(() => {
    if (!data?.address) return;
    const network =
      data.chain ||
      (() => {
        const sel = (data.chainSelectorName || "").toLowerCase();
        if (sel.includes("arbitrum") && !sel.includes("sepolia")) return "arbitrumMainnet";
        if (sel.includes("optimism") && !sel.includes("sepolia")) return "optimismMainnet";
        if (sel.includes("base") && !sel.includes("sepolia")) return "baseMainnet";
        if (sel.includes("polygon") && !sel.includes("amoy")) return "polygonMainnet";
        return "ethereumMainnet";
      })();
    const hasDiscoveredTokens = Array.isArray(data.discoveredTokens) && data.discoveredTokens.length > 0;
    const req = hasDiscoveredTokens
      ? fetch("/api/cre/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: data.address,
            network,
            tokens: data.discoveredTokens,
          }),
        })
      : fetch(`/api/cre/portfolio?address=${encodeURIComponent(data.address)}&network=${encodeURIComponent(network)}`);
    req
      .then((res) => (res.ok ? res.json() : null))
      .then((json: any) => {
        if (json && (json.tvl != null || json.price != null)) {
          setLiveMetrics({
            tvl: json.tvl,
            price: json.price,
            volume24h: json.volume24h ?? null,
            liquidity: json.liquidity ?? null,
          });
          const with0x = data.address.startsWith("0x") ? data.address : `0x${data.address}`;
          ContractStorage.updateContract(with0x, {
            metrics: {
              tvl: json.tvl,
              totalValueLocked: json.tvl,
              price: json.price,
              currentPrice: json.price,
            },
          });
        }
      })
      .catch(() => {});
  }, [data?.address, data?.chain, data?.chainSelectorName, data?.discoveredTokens]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const networkFromContract = data?.chain || (() => {
    const sel = (data?.chainSelectorName || "").toLowerCase();
    if (sel.includes("arbitrum") && !sel.includes("sepolia")) return "arbitrumMainnet";
    if (sel.includes("optimism") && !sel.includes("sepolia")) return "optimismMainnet";
    if (sel.includes("base") && !sel.includes("sepolia")) return "baseMainnet";
    if (sel.includes("polygon") && !sel.includes("amoy")) return "polygonMainnet";
    return "ethereumMainnet";
  })();

  useEffect(() => {
    if (analysisLogRef.current) {
      analysisLogRef.current.scrollTop = analysisLogRef.current.scrollHeight;
    }
  }, [analysisLogLines]);

  const applyAnalysisResult = (result: AnalyzeResult & { discoveredTokens?: Array<{ address: string; symbol: string; decimals?: number }> }) => {
    const addr = (data?.address || "").toLowerCase().trim();
    const with0x = addr.startsWith("0x") ? addr : `0x${addr}`;
    const f = result.finalAnalysis;
    const latestScanFromAnalysis = {
      reasoning: f?.summary ?? result.creObservations?.latestScan?.reasoning,
      cause: f?.rootCause,
      consequences: f?.potentialImpact,
      estimatedImpact: f?.potentialImpact,
      mitigationStrategy: f?.recommendations?.length
        ? f.recommendations.join("\n\n")
        : undefined,
      nextSteps: f?.nextSteps,
      suggestedActions: f?.suggestedActions,
      affectedMetrics: result.creObservations?.metrics ? Object.keys(result.creObservations.metrics) : undefined,
      riskLevel: result.creObservations?.riskLevel,
    };
    const discoveredTokens = result.discoveredTokens?.length ? result.discoveredTokens : undefined;
    ContractStorage.updateContract(with0x, {
      fullAnalysis: result,
      latestScan: latestScanFromAnalysis,
      riskLevel: (result.creObservations?.riskLevel || "LOW").toLowerCase() as any,
      status: result.creObservations?.riskLevel || "LOW",
      riskScore: result.creObservations?.riskScore,
      metrics: result.creObservations?.metrics ? { ...data?.metrics, ...result.creObservations.metrics } : undefined,
      ...(discoveredTokens ? { discoveredTokens } : {}),
    });
    const analyzedAt = new Date().toISOString();
    setData((prev: any) =>
      prev
        ? {
            ...prev,
            fullAnalysis: result,
            latestScan: latestScanFromAnalysis,
            lastUpdate: analyzedAt,
            ...(discoveredTokens ? { discoveredTokens } : {}),
          }
        : prev
    );
    setAnalyzeResult(result);
  };

  const runAnalysisStream = async (userContext?: Record<string, string>) => {
    if (!data?.address) return;
    const callbacks = {
      onNarrative(text: string) {
        setAnalysisLogLines((prev) => [...prev, text]);
      },
      onResult(result: AnalyzeResult) {
        applyAnalysisResult(result);
        setAnalysisStage("complete");
        setAnalysisLogLines((prev) =>
          prev[prev.length - 1] === "Done. Analysis saved." ? prev : [...prev, "Done. Analysis saved."]
        );
        toast.success("Full analysis complete", {
          description: "Analysis saved. It will persist until you run another.",
        });
        setTimeout(() => setAnalysisModalOpen(false), 2200);
        setAnalyzeLoading(false);
      },
      onError(message: string) {
        setAnalysisError(message);
        setAnalysisStage("error");
        setAnalysisLogLines((prev) => [...prev.filter((l) => !l.startsWith("Error:")), `Error: ${message}`]);
        toast.error("Analysis failed", { description: message });
        setTimeout(() => setAnalysisModalOpen(false), 3000);
        setAnalyzeLoading(false);
      },
      onNeedMoreInfo(questions: NeedMoreInfoQuestion[], message?: string) {
        setAnalysisNeedMoreInfo({ questions, message });
        setAnalysisLogLines((prev) => [...prev, "I need a bit more information to give you an accurate result."]);
        setAnalyzeLoading(false);
      },
    };
    try {
      await runAnalyzeStream(data.address, networkFromContract, callbacks, userContext);
    } catch (err: any) {
      const msg = err?.message || "Analysis failed";
      setAnalysisError(msg);
      setAnalysisStage("error");
      setAnalysisLogLines((prev) => [...prev.filter((l) => !l.startsWith("Error:")), `Error: ${msg}`]);
      toast.error("Analysis failed", { description: msg });
      setTimeout(() => setAnalysisModalOpen(false), 3000);
      setAnalyzeLoading(false);
    }
  };

  const handleFullAnalysis = async () => {
    if (!data?.address) return;
    setAnalyzeLoading(true);
    setAnalyzeResult(null);
    setAnalysisError(null);
    setAnalysisStage("discovering");
    setAnalysisNeedMoreInfo(null);
    setNeedMoreInfoFormValues({});
    setAnalysisLogLines(["Starting full analysis…"]);
    setAnalysisModalOpen(true);
    await runAnalysisStream();
  };

  const handleNeedMoreInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userContext: Record<string, string> = {};
    Object.entries(needMoreInfoFormValues).forEach(([id, value]) => {
      if (value != null && String(value).trim() !== "") userContext[id] = String(value).trim();
    });
    setAnalysisNeedMoreInfo(null);
    setNeedMoreInfoFormValues({});
    setAnalysisLogLines((prev) => [...prev, "Using your answers, running analysis again…"]);
    setAnalyzeLoading(true);
    runAnalysisStream(userContext);
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

  // Use the fetched data; prefer live portfolio, then CRE metrics, then stored data
  const metrics = {
    ...data.metrics,
    ...(data.fullAnalysis?.creObservations?.metrics || {}),
    ...(liveMetrics || {}),
  };
  const rawTvl = metrics?.tvl ?? metrics?.totalValueLocked;
  const rawPrice = metrics?.currentPrice ?? metrics?.price;
  const rawVolume = metrics?.volume24h;
  const rawLiquidity = metrics?.liquidity ?? metrics?.totalLiquidity;
  const contractData = {
    id: data.address,
    name: data.name,
    address: data.address,
    chain: data.chain,
    status: data.riskLevel.toLowerCase(),
    tvl:
      rawTvl !== undefined && rawTvl !== null && Number.isFinite(Number(rawTvl))
        ? formatTvl(Number(rawTvl))
        : (data.tvl && data.tvl !== "$0.0M" ? data.tvl : "$0.00"),
    price:
      rawPrice !== undefined && rawPrice !== null && Number.isFinite(Number(rawPrice))
        ? formatPrice(Number(rawPrice))
        : (data.price && data.price !== "$0.00" ? data.price : "$0.00"),
    volume24h:
      rawVolume != null && Number(rawVolume) > 0
        ? formatVolume(Number(rawVolume))
        : (data.volume24h && data.volume24h !== "$0.0M" ? data.volume24h : "$0.00"),
    liquidity:
      rawLiquidity !== undefined && rawLiquidity !== null
        ? formatLiquidityPercent(Number(rawLiquidity))
        : (data.liquidity && data.liquidity !== "0%" ? data.liquidity : "0%"),
  };

  // Real volatility: prefer CRE/metrics, then history, then parsed contract.volatility
  const currentVolatility =
    typeof metrics?.volatility === "number"
      ? metrics.volatility <= 1 ? metrics.volatility * 100 : metrics.volatility
      : typeof data.metrics?.volatility === "number"
      ? data.metrics.volatility <= 1 ? data.metrics.volatility * 100 : data.metrics.volatility
      : (() => {
          const v = data.volatility;
          if (typeof v === "string") {
            const n = parseFloat(v.replace(/%/g, ""));
            return Number.isFinite(n) ? n : null;
          }
          return null;
        })();
  const volatilityHistory: HistoryItem[] =
    data.history?.volatility?.length > 0
      ? data.history.volatility
      : currentVolatility != null
        ? ["6d", "5d", "4d", "3d", "2d", "1d", "Now"].map((time, i) => ({
            time,
            value: Math.max(0, currentVolatility * (0.85 + (0.15 * (7 - i)) / 7)),
          }))
        : [
            { time: "10:00", value: 2.1 },
            { time: "11:00", value: 2.4 },
            { time: "12:00", value: 2.2 },
            { time: "13:00", value: 2.5 },
            { time: "14:00", value: 2.3 },
            { time: "15:00", value: 2.4 },
          ];
  // const riskScoreHistory: HistoryItem[] = data.history?.riskScore || [];
  const historicalAlerts: HistoricalAlert[] = data.recentAlerts || [];
  
  // Map AI feedback from latestScan if it exists
  const aiScan = data.latestScan || {};
  const aiSuggestions: AISuggestion[] = aiScan.suggestedActions 
    ? aiScan.suggestedActions.map((action: string, i: number) => ({
        id: `action-${i}`,
        title: action,
        description: aiScan.nextSteps ? aiScan.nextSteps[i] || "" : "",
        priority: aiScan.riskLevel === "CRITICAL" ? "high" : "medium"
      }))
    : (data.aiSuggestions || []);

  const riskBreakdown = [
    {
      name: "Volatility",
      value: metrics?.volatility != null ? Math.round(Number(metrics.volatility) * (metrics.volatility <= 1 ? 100 : 1)) : (data.riskScore > 30 ? Math.min(100, data.riskScore) : 23),
      color: "hsl(var(--chart-1))",
    },
    { name: "Liquidity", value: (metrics?.liquidity != null || metrics?.totalLiquidity != null) ? Math.round(metrics?.liquidity ?? (metrics?.totalLiquidity > 1 ? metrics.totalLiquidity * 100 : (metrics?.totalLiquidity ?? 0.2) * 100)) : 20, color: "hsl(var(--chart-2))" },
    { name: "Manipulation", value: (metrics as any)?.manipulation != null ? Math.round((metrics as any).manipulation * 100) : 15, color: "hsl(var(--chart-3))" },
    { name: "Depeg", value: (metrics?.priceDeviationFromPeg != null) ? Math.round(Number(metrics.priceDeviationFromPeg) * (metrics.priceDeviationFromPeg <= 1 ? 100 : 1)) : (data.riskScore > 50 ? 35 : 5), color: "hsl(var(--chart-4))" },
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
    <>
      {/* Full-screen Full Analysis progress modal — streaming log style */}
      <AnimatePresence>
        {analysisModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-emerald-500/5" />
            <div className="relative z-10 w-full max-w-2xl mx-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-[2rem] border border-border/50 bg-card/95 shadow-2xl shadow-primary/10 overflow-hidden"
              >
                <div className="px-8 pt-8 pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-foreground">Full Analysis</h2>
                      <p className="text-xs text-muted-foreground font-medium">AI is analyzing your contract — here’s what’s happening</p>
                    </div>
                  </div>
                </div>
                {/* Streaming log — like generative AI output */}
                <div className="px-8 pb-8">
                  <div className="rounded-2xl border border-border/50 bg-black/40 font-mono text-sm text-foreground/90 overflow-hidden">
                    <div
                      ref={analysisLogRef}
                      className="p-4 min-h-[280px] max-h-[50vh] overflow-y-auto flex flex-col gap-0.5"
                    >
                      {analysisLogLines.map((line, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "leading-relaxed",
                            line.startsWith("Error:") && "text-rose-500 font-semibold",
                            line.startsWith("Done.") && "text-emerald-500 dark:text-emerald-400 font-semibold"
                          )}
                        >
                          <span className="text-muted-foreground/70 select-none mr-2">$</span>
                          {line}
                        </motion.div>
                      ))}
                      {analysisModalOpen && analysisStage !== "complete" && analysisStage !== "error" && !analysisNeedMoreInfo && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-1 leading-relaxed text-primary"
                        >
                          <span className="text-muted-foreground/70 select-none mr-2">$</span>
                          <span className="inline-block w-2 h-4 bg-primary animate-pulse" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
                {analysisNeedMoreInfo && (
                  <div className="px-8 pb-6">
                    <form onSubmit={handleNeedMoreInfoSubmit} className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-4">
                      {analysisNeedMoreInfo.message && (
                        <p className="text-sm font-medium text-foreground">{analysisNeedMoreInfo.message}</p>
                      )}
                      {analysisNeedMoreInfo.questions.map((q) => (
                        <div key={q.id} className="space-y-1.5">
                          <Label htmlFor={q.id} className="text-xs font-semibold text-muted-foreground">
                            {q.label}
                          </Label>
                          <Input
                            id={q.id}
                            type="text"
                            placeholder={q.placeholder}
                            value={needMoreInfoFormValues[q.id] ?? ""}
                            onChange={(e) =>
                              setNeedMoreInfoFormValues((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                            className="rounded-xl bg-background/80 border-border font-normal"
                          />
                        </div>
                      ))}
                      <Button type="submit" className="w-full rounded-xl font-bold">
                        Continue analysis
                      </Button>
                    </form>
                  </div>
                )}
                {analysisStage === "complete" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-8 pb-8 pt-0">
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Closing shortly…</p>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <div className="flex items-center gap-2 flex-wrap">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const name = editedName.trim() || contractData.name;
                          const addr = (data.address || "").toLowerCase().trim();
                          const with0x = addr.startsWith("0x") ? addr : `0x${addr}`;
                          ContractStorage.updateContract(with0x, { name });
                          setData((p: any) => (p ? { ...p, name } : p));
                          setEditedName(name);
                          setIsEditingName(false);
                          toast.success("Name updated");
                        }
                        if (e.key === "Escape") {
                          setEditedName(contractData.name);
                          setIsEditingName(false);
                        }
                      }}
                      className="text-2xl font-black max-w-md h-12"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-emerald-500 hover:text-emerald-400"
                      onClick={() => {
                        const name = editedName.trim() || contractData.name;
                        const addr = (data.address || "").toLowerCase().trim();
                        const with0x = addr.startsWith("0x") ? addr : `0x${addr}`;
                        ContractStorage.updateContract(with0x, { name });
                        setData((p: any) => (p ? { ...p, name } : p));
                        setEditedName(name);
                        setIsEditingName(false);
                        toast.success("Name updated");
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <h1 className="text-3xl font-black tracking-tight text-foreground lg:text-4xl flex items-center gap-2">
                    {contractData.name}
                    <span className="text-primary italic">.</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setEditedName(contractData.name);
                        setIsEditingName(true);
                      }}
                      title="Edit contract name"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </h1>
                )}
              </div>
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
                {data?.lastUpdate && (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground" title={data.lastUpdate}>
                    <Clock className="h-3 w-3" />
                    Last analyzed: {formatSyncTime(data.lastUpdate)}
                  </span>
                )}
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
            disabled={analyzeLoading}
            onClick={handleFullAnalysis}
            className="h-12 rounded-[1.25rem] border-border/40 bg-card/40 font-bold backdrop-blur-xl"
          >
            <Sparkles className={cn("mr-2 h-4 w-4", analyzeLoading && "animate-pulse")} />
            {analyzeLoading ? "Analyzing…" : "Full Analysis"}
          </Button>
          <Dialog open={tuningOpen} onOpenChange={(open) => {
            setTuningOpen(open);
            if (open && data?.riskThresholds) setThresholdForm({ ...DEFAULT_RISK_THRESHOLDS, ...data.riskThresholds });
          }}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-12 rounded-[1.25rem] border-border/40 bg-card/40 font-bold backdrop-blur-xl"
              >
                <Settings className="mr-2 h-4 w-4" />
                Tuning
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl border-border/40 bg-card/80 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-black">CRE thresholds</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  These values are used when triggering the Chainlink Risk Engine for this contract. Sensible defaults are set; you can adjust them per contract.
                </p>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Depeg tolerance (0–0.1)</Label>
                  <Input
                    type="number"
                    min={0.001}
                    max={0.1}
                    step={0.001}
                    value={thresholdForm.depegTolerance}
                    onChange={(e) => setThresholdForm((p) => ({ ...p, depegTolerance: Math.max(0.001, Math.min(0.1, Number(e.target.value) || 0.02)) }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Volatility max (0.05–0.5)</Label>
                  <Input
                    type="number"
                    min={0.05}
                    max={0.5}
                    step={0.01}
                    value={thresholdForm.volatilityMax}
                    onChange={(e) => setThresholdForm((p) => ({ ...p, volatilityMax: Math.max(0.05, Math.min(0.5, Number(e.target.value) || 0.15)) }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Liquidity drop max (0.1–0.5)</Label>
                  <Input
                    type="number"
                    min={0.1}
                    max={0.5}
                    step={0.01}
                    value={thresholdForm.liquidityDropMax}
                    onChange={(e) => setThresholdForm((p) => ({ ...p, liquidityDropMax: Math.max(0.1, Math.min(0.5, Number(e.target.value) || 0.25)) }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Collateral ratio min (1.0–3.0)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={3}
                    step={0.1}
                    value={thresholdForm.collateralRatioMin}
                    onChange={(e) => setThresholdForm((p) => ({ ...p, collateralRatioMin: Math.max(1, Math.min(3, Number(e.target.value) || 1.5)) }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTuningOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    const addr = (data?.address || "").toLowerCase().trim();
                    const with0x = addr.startsWith("0x") ? addr : `0x${addr}`;
                    ContractStorage.updateContract(with0x, { riskThresholds: { ...thresholdForm } });
                    setData((p: any) => (p ? { ...p, riskThresholds: { ...thresholdForm } } : p));
                    setTuningOpen(false);
                    toast.success("CRE thresholds updated for this contract.");
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

      {/* AI Risk Intelligence */}
      {(() => {
            const fa = data.fullAnalysis?.finalAnalysis;
            const scan = data.latestScan;
            const reasoning = fa?.summary ?? scan?.reasoning;
            const cause = fa?.rootCause ?? scan?.cause;
            const consequences = fa?.potentialImpact ?? scan?.consequences;
            const mitigationStrategy = scan?.mitigationStrategy ?? (fa?.recommendations?.length ? fa.recommendations.join("\n\n") : undefined);
            const nextSteps = fa?.nextSteps ?? scan?.nextSteps;
            const suggestedActions = fa?.suggestedActions ?? scan?.suggestedActions;
            if (!data.fullAnalysis && !data.latestScan) return null;
            return (
            <div className="space-y-6">
              <h3 className="flex items-center gap-2 text-lg font-black tracking-tight text-foreground px-2">
                <Zap className="h-5 w-5 text-primary fill-primary" />
                AI Risk Intelligence
              </h3>
              
              <div className="rounded-[2.5rem] border border-primary/20 bg-primary/5 p-8 backdrop-blur-xl">
                <div className="space-y-6">
                  {/* Executive Summary - always visible */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black uppercase text-primary/70 tracking-widest">Executive Summary</h5>
                    <p className="text-sm font-medium leading-relaxed text-foreground/90 bg-background/30 p-4 rounded-2xl border border-primary/10 whitespace-pre-wrap">
                      {reasoning || "Run Full Analysis or Force Scan for an AI summary."}
                    </p>
                  </div>

                  {/* Collapsible sections */}
                  <Accordion type="multiple" className="w-full space-y-2" defaultValue={["root-cause", "mitigation"]}>
                    <AccordionItem value="root-cause" className="border border-border/40 rounded-2xl px-4">
                      <AccordionTrigger className="text-[10px] font-black uppercase text-foreground/90 hover:no-underline py-4">
                        Root Cause & Potential Impact
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          <div className="space-y-3">
                            <h5 className="text-[10px] font-black uppercase text-rose-500/70 tracking-widest flex items-center gap-1.5">
                               <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                               Root Cause Analysis
                            </h5>
                            <p className="text-xs font-semibold leading-relaxed text-muted-foreground p-4 rounded-2xl border border-rose-500/10 bg-rose-500/[0.02] whitespace-pre-wrap">
                              {cause || "Run Full Analysis or Force Scan (with post-CRE AI) for root cause analysis."}
                            </p>
                          </div>
                          <div className="space-y-3">
                            <h5 className="text-[10px] font-black uppercase text-amber-500/70 tracking-widest flex items-center gap-1.5">
                               <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                               Potential Impact
                            </h5>
                            <p className="text-xs font-semibold leading-relaxed text-muted-foreground p-4 rounded-2xl border border-amber-500/10 bg-amber-500/[0.02] whitespace-pre-wrap">
                              {consequences || "Run Full Analysis or Force Scan for impact assessment."}
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {(scan?.estimatedImpact ?? consequences) && (
                      <AccordionItem value="estimated-impact" className="border border-border/40 rounded-2xl px-4">
                        <AccordionTrigger className="text-[10px] font-black uppercase text-foreground/90 hover:no-underline py-4">
                          Estimated Impact (Financial & Operational)
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <p className="text-xs font-semibold leading-relaxed text-muted-foreground p-4 rounded-2xl border border-amber-500/10 bg-amber-500/[0.02] whitespace-pre-wrap">
                            {scan?.estimatedImpact ?? consequences}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {scan?.affectedMetrics && scan.affectedMetrics.length > 0 && (
                      <AccordionItem value="affected-metrics" className="border border-border/40 rounded-2xl px-4">
                        <AccordionTrigger className="text-[10px] font-black uppercase text-foreground/90 hover:no-underline py-4">
                          Affected / Reviewed Metrics
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="flex flex-wrap gap-2">
                            {scan.affectedMetrics.map((m: string, i: number) => (
                              <Badge key={i} variant="secondary" className="rounded-full text-[10px] font-bold uppercase">
                                {m}
                              </Badge>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    <AccordionItem value="mitigation" className="border border-border/40 rounded-2xl px-4">
                      <AccordionTrigger className="text-[10px] font-black uppercase text-foreground/90 hover:no-underline py-4">
                        {["high", "critical"].includes((scan?.riskLevel || data.riskLevel || "").toLowerCase())
                          ? "Technical Mitigation Strategy"
                          : "Recommendations to Safeguard This Contract"}
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="text-xs font-semibold leading-relaxed text-foreground/90 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] whitespace-pre-wrap">
                          {mitigationStrategy || "Run Full Analysis or Force Scan (with post-CRE AI) for recommendations."}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {nextSteps && nextSteps.length > 0 && (
                      <AccordionItem value="action-items" className="border border-border/40 rounded-2xl px-4">
                        <AccordionTrigger className="text-[10px] font-black uppercase text-foreground/90 hover:no-underline py-4">
                          Immediate Action Items
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="space-y-2">
                            {nextSteps.map((step: string, i: number) => (
                              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-primary/5 group/step hover:bg-background/60 transition-colors">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
                                  {i + 1}
                                </div>
                                <span className="text-xs font-bold text-foreground/80 group-hover/step:text-primary transition-colors">{step}</span>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {suggestedActions && suggestedActions.length > 0 && (
                      <AccordionItem value="long-term" className="border border-border/40 rounded-2xl px-4">
                        <AccordionTrigger className="text-[10px] font-black uppercase text-foreground/90 hover:no-underline py-4">
                          {["high", "critical"].includes((scan?.riskLevel || data.riskLevel || "").toLowerCase())
                            ? "Long-term Actions"
                            : "Tips to Safeguard for Future Occurrence"}
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <ul className="space-y-2">
                            {suggestedActions.map((action: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-xs font-semibold text-foreground/85">
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </div>
              </div>
            </div>
            );
          })()}

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
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(56 189 248)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="rgb(56 189 248)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgb(148 163 184)"
                      strokeOpacity={0.6}
                    />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fontWeight: 600, fill: "rgb(148 163 184)" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fontWeight: 600, fill: "rgb(148 163 184)" }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ stroke: "rgb(56 189 248)", strokeWidth: 1, strokeDasharray: "4 4" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="rgb(56 189 248)"
                      strokeWidth={3}
                      fill="url(#chartGrad)"
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
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
        </div>
      </div>

      {/* Full Analysis (Pre-CRE + CRE + Post-CRE) */}
      {analyzeResult && (
        <Card className="overflow-hidden rounded-[2.5rem] border-border/40 bg-card/20 backdrop-blur-xl">
          <CardHeader className="border-b border-border/40 px-8 py-6">
            <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
              <Sparkles className="h-5 w-5 text-primary" />
              Full Analysis
            </CardTitle>
            <CardDescription className="text-xs font-medium text-muted-foreground">
              Pre-CRE AI analysis, CRE observations, and post-CRE AI analysis with key points.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="pre-cre" className="border border-border/40 rounded-2xl px-4 mb-4">
                <AccordionTrigger className="text-sm font-bold uppercase tracking-wider text-primary/90 hover:no-underline py-4">
                  Pre-CRE analysis (AI from contract context)
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-muted-foreground space-y-3">
                  {analyzeResult.initialAnalysis?.summary && (
                    <p className="leading-relaxed">{analyzeResult.initialAnalysis.summary}</p>
                  )}
                  {analyzeResult.initialAnalysis?.keyRisks?.length ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {analyzeResult.initialAnalysis.keyRisks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                  {analyzeResult.initialAnalysis?.recommendations?.length ? (
                    <div>
                      <span className="font-semibold text-foreground">Recommendations: </span>
                      <ul className="list-disc pl-5 mt-1">
                        {analyzeResult.initialAnalysis.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="cre" className="border border-border/40 rounded-2xl px-4 mb-4">
                <AccordionTrigger className="text-sm font-bold uppercase tracking-wider text-primary/90 hover:no-underline py-4">
                  CRE observations
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-muted-foreground">
                  {analyzeResult.creObservations && (
                    <pre className="rounded-xl bg-muted/30 p-4 overflow-x-auto text-xs whitespace-pre-wrap font-mono">
                      {JSON.stringify(analyzeResult.creObservations, null, 2)}
                    </pre>
                  )}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="post-cre" className="border border-border/40 rounded-2xl px-4">
                <AccordionTrigger className="text-sm font-bold uppercase tracking-wider text-primary/90 hover:no-underline py-4">
                  Post-CRE analysis (AI from CRE results)
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-muted-foreground space-y-3">
                  {analyzeResult.finalAnalysis?.summary && (
                    <p className="leading-relaxed">{analyzeResult.finalAnalysis.summary}</p>
                  )}
                  {analyzeResult.finalAnalysis?.keyFindings?.length ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {analyzeResult.finalAnalysis.keyFindings.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  ) : null}
                  {analyzeResult.finalAnalysis?.comparisonWithPreCRE && (
                    <p className="leading-relaxed"><span className="font-semibold text-foreground">Comparison with pre-CRE: </span>{analyzeResult.finalAnalysis.comparisonWithPreCRE}</p>
                  )}
                  {analyzeResult.finalAnalysis?.recommendations?.length ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {analyzeResult.finalAnalysis.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Machine Learning Forensics */}
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

      {/* Audit Log - last */}
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
    </>
  );
}

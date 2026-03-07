"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import * as framerMotion from "framer-motion";
const motion =
  (framerMotion as any).motion ||
  (framerMotion as any).default?.motion ||
  (framerMotion as any).default;
const AnimatePresence =
  (framerMotion as any).AnimatePresence ||
  (framerMotion as any).default?.AnimatePresence;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  FileCode2,
  AlertTriangle,
  TrendingUp,
  Activity,
  Plus,
  ArrowUpRight,
  Clock,
  ChevronRight,
  Zap,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { useDashboardScan } from "@/app/dashboard/scan-context";
import {
  getOverview,
  addContract,
  syncToServer,
  type DashboardAlert,
  type DashboardContract,
} from "@/lib/api";
import { ContractStorage } from "@/lib/storage";
import { formatTvl, formatSyncTime, parseTvlToNumber } from "@/lib/format-metrics";
import { createPublicClient, http, parseAbi } from "viem";
import { toast } from "@/components/ui/toast";

const getRiskBadge = (level: string) => {
  const normalizedLevel = level.toLowerCase();
  switch (normalizedLevel) {
    case "low":
    case "min":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-0 rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
          Low Risk
        </Badge>
      );
    case "medium":
    case "med":
      return (
        <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-0 rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
          Medium Risk
        </Badge>
      );
    case "high":
    case "crit":
    case "critical":
      return (
        <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-0 rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
          High Risk
        </Badge>
      );
    default:
      return (
        <Badge className="bg-muted text-muted-foreground border-0 rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
          Unknown
        </Badge>
      );
  }
};

const getSeverityBadge = (severity: string) => {
  const normalizedSeverity = severity.toLowerCase();
  switch (normalizedSeverity) {
    case "low":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
          LOW
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-amber-500/10 text-amber-500 border-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
          MEDIUM
        </Badge>
      );
    case "high":
    case "critical":
      return (
        <Badge className="bg-rose-500/10 text-rose-500 border-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
          HIGH
        </Badge>
      );
    default:
      return (
        <Badge className="bg-muted text-muted-foreground border-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
          -
        </Badge>
      );
  }
};

const getStatusBadge = (status: string) => {
  const normalizedStatus = status.toLowerCase();
  switch (normalizedStatus) {
    case "active":
      return (
        <Badge className="bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg px-2 py-0.5 text-[10px] font-medium">
          Active
        </Badge>
      );
    case "acknowledged":
      return (
        <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg px-2 py-0.5 text-[10px] font-medium">
          Acknowledged
        </Badge>
      );
    case "resolved":
    case "complete":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg px-2 py-0.5 text-[10px] font-medium">
          Resolved
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-500/10 text-slate-500 border border-slate-500/20 rounded-lg px-2 py-0.5 text-[10px] font-medium">
          {status}
        </Badge>
      );
  }
};

const getChainBadge = (chain: string) => {
  switch (chain) {
    case "ethereum-mainnet":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#627EEA]" />
          Ethereum
        </span>
      );
    case "arbitrum-mainnet":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#28A0F0]" />
          Arbitrum
        </span>
      );
    case "optimism-mainnet":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#FF0420]" />
          Optimism
        </span>
      );
    case "base-mainnet":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#0052FF]" />
          Base
        </span>
      );
    case "polygon-mainnet":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#8247E5]" />
          Polygon
        </span>
      );
    default:
      return <span className="text-xs text-muted-foreground">{chain}</span>;
  }
};

const formatSystemState = (value: string) => {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatLastSync = (value: string) => {
  if (!value) return "Unknown";
  if (value.includes("ago") || value.includes("just now")) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

// (erc20Abi removed as manual detection is handled by backend discovery)

function getChainConfig(chain: string) {
  const preset: Record<string, { chainName: string; chainSelectorName: string }> = {
    ethereumMainnet: { chainName: "Ethereum Mainnet", chainSelectorName: "ethereum-mainnet" },
    arbitrumMainnet: { chainName: "Arbitrum Mainnet", chainSelectorName: "ethereum-mainnet-arbitrum-1" },
    optimismMainnet: { chainName: "Optimism Mainnet", chainSelectorName: "ethereum-mainnet-optimism-1" },
    baseMainnet: { chainName: "Base Mainnet", chainSelectorName: "base-mainnet" },
    polygonMainnet: { chainName: "Polygon Mainnet", chainSelectorName: "polygon-mainnet" },
  };
  return preset[chain] || preset.ethereumMainnet;
}

export default function DashboardPage() {
  const router = useRouter();
  const [liveKpis, setLiveKpis] = useState<any[]>([]);
  const [liveContracts, setLiveContracts] = useState<DashboardContract[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<DashboardAlert[]>([]);
  const [systemStatus, setSystemStatus] = useState<{
    oracle?: string;
    riskEngine?: string;
    alertService?: string;
    lastSync?: string;
  }>({});
  const scanContext = useDashboardScan();
  const refreshRef = useRef<(() => void) | undefined>(undefined);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [detectMessage, setDetectMessage] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    address: "",
    chain: "ethereumMainnet",
    name: "",
    protocol: "Normal",
    riskProfile: "balanced",
    customChainName: "",
    customChainSelectorName: "",
    customRpcUrl: "",
    customChainId: "",
  });

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const refresh = async () => {
      try {
        const response = await getOverview();
        const data = response.data;

        setLiveKpis([
          {
            title: "Monitored Contracts",
            value: `${data.kpis.monitoredContracts}`,
            change: "Live data",
            icon: FileCode2,
            color: "text-primary",
            bgColor: "bg-primary/10",
          },
          {
            title: "Active Alerts",
            value: `${data.kpis.activeAlerts}`,
            change: `${data.kpis.activeAlerts} currently active`,
            icon: AlertTriangle,
            color: "text-danger",
            bgColor: "bg-danger/10",
          },
          {
            title: "Total Value Locked",
            value: formatTvl(data.kpis.totalValueLocked),
            change: "Derived from monitored contracts",
            icon: TrendingUp,
            color: "text-success",
            bgColor: "bg-success/10",
          },
          {
            title: "Risk Score",
            value: `${data.kpis.riskScore}/100`,
            change:
              data.kpis.riskScore >= 70 ? "Elevated risk" : "Good standing",
            icon: ShieldCheck,
            color: data.kpis.riskScore >= 70 ? "text-warning" : "text-success",
            bgColor:
              data.kpis.riskScore >= 70 ? "bg-warning/10" : "bg-success/10",
          },
        ]);
        setLiveContracts(data.contracts);
        setLiveAlerts(data.alerts);
        setSystemStatus({
          oracle: data.system.oracle,
          riskEngine: data.system.riskEngine,
          alertService: data.system.alertService,
          lastSync: data.system.lastSync,
        });
        try {
          const alertsRes = await fetch("/api/alerts?limit=3");
          if (alertsRes.ok) {
            const json = await alertsRes.json();
            if (Array.isArray(json.alerts)) {
              setLiveAlerts(json.alerts);
            }
          }
        } catch {
          // keep data.alerts from getOverview
        }
      } catch (err) {
        console.error("Dashboard refresh failed:", err);
      }
    };

    refreshRef.current = refresh;
    refresh();
    intervalId = setInterval(refresh, 15000);
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Auto-scan at interval: always use /api/cron/scan so the contract list comes from the on-chain registry
  // (all contracts added in the frontend and synced are scanned). Alerts and contract updates applied server-side.
  // For 24/7 scanning when the tab is closed, set up Vercel Cron (or similar) to POST /api/cron/scan at this interval.
  useEffect(() => {
    const raw = process.env.NEXT_PUBLIC_CHAIN_GUARD_SCAN_INTERVAL_MS;
    const intervalMs = raw ? Math.max(5000, parseInt(raw, 10) || 900000) : 15 * 60 * 1000;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const runBackgroundScan = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (liveContracts.length === 0) return;
      try {
        const cronRes = await fetch("/api/cron/scan", { method: "POST" });
        if (cronRes.ok) {
          const syncRes = await fetch("/api/sync");
          if (syncRes.ok) {
            const { contracts } = await syncRes.json();
            if (Array.isArray(contracts) && contracts.length > 0) {
              ContractStorage.saveContracts(contracts);
            }
          }
          refreshRef.current?.();
        }
      } catch (e) {
        console.error("Background scan failed:", e);
      }
    };

    intervalId = setInterval(runBackgroundScan, intervalMs);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [liveContracts.length]);

  const handleQuickScan = () => {
    scanContext?.runForceScan();
  };

  const getRiskThresholds = (profile: string) => {
    switch (profile) {
      case "conservative":
        return {
          volatilityMax: 0.1,
          liquidityDropMax: 0.12,
          depegTolerance: 0.005,
          collateralRatioMin: 1.8,
        };
      case "aggressive":
        return {
          volatilityMax: 0.25,
          liquidityDropMax: 0.3,
          depegTolerance: 0.05,
          collateralRatioMin: 1.1,
        };
      case "balanced":
      default:
        return {
          volatilityMax: 0.15,
          liquidityDropMax: 0.2,
          depegTolerance: 0.02,
          collateralRatioMin: 1.5,
        };
    }
  };

  const handleAddContract = async () => {
    const address = addForm.address.trim();
    const isAddressValid = /^0x[a-fA-F0-9]{40}$/.test(address);
    if (!isAddressValid) {
      setAddError("Please enter a valid 0x contract address.");
      return;
    }
    setAddError(null);
    setIsAdding(true);
    try {
      const chainConfig = getChainConfig(addForm.chain);
      const with0x = address.startsWith("0x") ? address : `0x${address}`;
      await addContract({
        address: with0x.toLowerCase(),
        name: addForm.name?.trim() || "New Contract",
        chain: chainConfig.chainSelectorName,
        chainSelectorName: chainConfig.chainSelectorName,
        priceFeeds: [],
        riskThresholds: getRiskThresholds(addForm.riskProfile),
        alertChannels: ["email"],
      });
      const network = addForm.chain;
      try {
        const portfolioRes = await fetch(
          `/api/cre/portfolio?address=${encodeURIComponent(with0x)}&network=${encodeURIComponent(network)}`
        );
        if (portfolioRes.ok) {
          const portfolioJson = await portfolioRes.json();
          if (portfolioJson && (portfolioJson.tvl != null || portfolioJson.price != null)) {
            ContractStorage.updateContract(with0x.toLowerCase(), {
              metrics: {
                tvl: portfolioJson.tvl,
                totalValueLocked: portfolioJson.tvl,
                price: portfolioJson.price,
                currentPrice: portfolioJson.price,
              },
            });
          }
        }
      } catch {
        // non-blocking: contract is added; portfolio can refresh when user opens detail
      }
      syncToServer({ contracts: ContractStorage.getContracts() });
      const res = await getOverview();
      const d = res?.data;
      if (d) {
        setLiveKpis([
          { title: "Monitored Contracts", value: `${d.kpis.monitoredContracts}`, change: "Live data", icon: FileCode2, color: "text-primary", bgColor: "bg-primary/10" },
          { title: "Active Alerts", value: `${d.kpis.activeAlerts}`, change: `${d.kpis.activeAlerts} currently active`, icon: AlertTriangle, color: "text-danger", bgColor: "bg-danger/10" },
          { title: "Total Value Locked", value: formatTvl(d.kpis.totalValueLocked), change: "Derived from monitored contracts", icon: TrendingUp, color: "text-success", bgColor: "bg-success/10" },
          { title: "Risk Score", value: `${d.kpis.riskScore}/100`, change: d.kpis.riskScore >= 70 ? "Elevated risk" : "Good standing", icon: ShieldCheck, color: d.kpis.riskScore >= 70 ? "text-warning" : "text-success", bgColor: d.kpis.riskScore >= 70 ? "bg-warning/10" : "bg-success/10" },
        ]);
        setLiveContracts(d.contracts);
        setLiveAlerts(d.alerts);
        setSystemStatus({ oracle: d.system.oracle, riskEngine: d.system.riskEngine, alertService: d.system.alertService, lastSync: d.system.lastSync });
      }
      setAddForm({ address: "", chain: "ethereumMainnet", name: "", protocol: "Normal", riskProfile: "balanced", customChainName: "", customChainSelectorName: "", customRpcUrl: "", customChainId: "" });
      setIsAddDialogOpen(false);
      toast.success("Contract added", { description: "Open the contract and run Full Analysis to start monitoring." });
    } catch (err) {
      console.error("Failed to add contract", err);
      setAddError("Failed to save contract. Try again.");
      toast.error("Could not add contract");
    } finally {
      setIsAdding(false);
    }
  };

  const parsePercentage = (value?: string) => {
    if (!value) return null;
    const cleaned = value.replace(/%/g, "");
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  };

  // Prefer real metrics from CRE scan (metrics.volatility 0–1 or 0–100, metrics.tvl/totalValueLocked in dollars)
  const volatilitySeries = liveContracts
    .map((contract) => {
      const raw = (contract as any).metrics?.volatility;
      const vol =
        typeof raw === "number"
          ? raw <= 1 ? raw * 100 : raw
          : parsePercentage(contract.volatility);
      return { name: contract.name, volatility: vol };
    })
    .filter((item) => item.volatility != null && Number.isFinite(item.volatility)) as Array<{
    name: string;
    volatility: number;
  }>;

  const liquiditySeries = liveContracts
    .map((contract) => {
      const raw = (contract as any).metrics?.tvl ?? (contract as any).metrics?.totalValueLocked;
      const tvl =
        typeof raw === "number" && raw >= 0
          ? raw
          : parseTvlToNumber(contract.tvl);
      return { name: contract.name, tvl };
    })
    .filter((item) => item.tvl != null && Number.isFinite(item.tvl)) as Array<{
    name: string;
    tvl: number;
  }>;

  return (
    <div className="mx-auto w-full space-y-8 p-6 lg:p-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1.5"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold tracking-wider text-primary uppercase">
            <Zap className="h-3 w-3 fill-primary" />
            Live Intelligence
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground lg:text-4xl">
            Command Center<span className="text-primary italic">.</span>
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            End-to-end security monitoring for your on-chain assets powered by
            Chainlink & OpenRouter AI.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-wrap items-center gap-3"
        >
          <div className="hidden h-10 items-center gap-4 rounded-2xl border border-border/40 bg-muted/20 px-4 xl:flex">
            <div className="flex items-center gap-2 border-r border-border/40 pr-4">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-foreground/80">
                Oracle: {systemStatus.oracle || "Loading"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground tabular-nums" title={systemStatus.lastSync || undefined}>
                Sync: {formatSyncTime(systemStatus.lastSync)}
              </span>
            </div>
          </div>

          {(scanContext?.scanMessage ?? null) && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-2 border border-primary/20"
            >
              <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="text-xs font-bold text-primary italic">
                {scanContext?.scanMessage}
              </span>
            </motion.div>
          )}

          <Button
            size="lg"
            variant="outline"
            disabled={scanContext?.isScanning}
            onClick={handleQuickScan}
            className="h-12 rounded-2xl border-border/60 bg-background/50 backdrop-blur-md transition-all hover:border-primary/50 hover:bg-primary/5"
          >
            <RefreshCw
              className={cn(
                "mr-2 h-4 w-4 text-primary",
                scanContext?.isScanning && "animate-spin",
              )}
            />
            {scanContext?.isScanning ? "Scanning Ecosystem..." : "Force Scan"}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="h-12 rounded-2xl bg-primary px-6 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Contract
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-3xl border-border/40 bg-card/90 backdrop-blur-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  Add new contract to monitor
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Provide the contract address and network. Our AI will
                  automatically discover implementation details, held tokens,
                  and mapping feeds.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="address"
                    className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider"
                  >
                    Contract Address
                  </Label>
                  <Input
                    id="address"
                    placeholder="0x..."
                    className="h-12 rounded-xl border-border/40 bg-muted/30 font-mono text-sm focus-visible:ring-primary/20"
                    value={addForm.address}
                    onChange={(e) =>
                      setAddForm({ ...addForm, address: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="chain"
                      className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider"
                    >
                      Network
                    </Label>
                    <div className="relative">
                      <select
                        id="chain"
                        value={addForm.chain}
                        onChange={(e) =>
                          setAddForm({ ...addForm, chain: e.target.value })
                        }
                        className="h-12 w-full appearance-none rounded-xl border border-border/40 bg-muted/30 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <optgroup label="Mainnets">
                          <option value="ethereumMainnet">
                            Ethereum Mainnet
                          </option>
                          <option value="arbitrumMainnet">
                            Arbitrum Mainnet
                          </option>
                          <option value="optimismMainnet">
                            Optimism Mainnet
                          </option>
                          <option value="baseMainnet">Base Mainnet</option>
                          <option value="polygonMainnet">
                            Polygon Mainnet
                          </option>
                        </optgroup>
                      </select>
                      <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {addForm.chain === "customMainnet" && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="customChainName"
                        className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider"
                      >
                        Custom Chain Name
                      </Label>
                      <Input
                        id="customChainName"
                        placeholder="e.g., Custom mainnet"
                        className="h-12 rounded-xl border-border/40 bg-muted/30 text-sm focus-visible:ring-primary/20"
                        value={addForm.customChainName}
                        onChange={(e) =>
                          setAddForm({
                            ...addForm,
                            customChainName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="customChainSelector"
                        className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider"
                      >
                        Chain Selector Name
                      </Label>
                      <Input
                        id="customChainSelector"
                        placeholder="e.g., ethereum-mainnet"
                        className="h-12 rounded-xl border-border/40 bg-muted/30 text-sm focus-visible:ring-primary/20"
                        value={addForm.customChainSelectorName}
                        onChange={(e) =>
                          setAddForm({
                            ...addForm,
                            customChainSelectorName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label
                        htmlFor="customRpcUrl"
                        className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider"
                      >
                        RPC URL (Testnet)
                      </Label>
                      <Input
                        id="customRpcUrl"
                        placeholder="https://..."
                        className="h-12 rounded-xl border-border/40 bg-muted/30 text-sm focus-visible:ring-primary/20"
                        value={addForm.customRpcUrl}
                        onChange={(e) =>
                          setAddForm({
                            ...addForm,
                            customRpcUrl: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label
                        htmlFor="customChainId"
                        className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider"
                      >
                        Chain ID (optional)
                      </Label>
                      <Input
                        id="customChainId"
                        placeholder="11155111"
                        className="h-12 rounded-xl border-border/40 bg-muted/30 text-sm focus-visible:ring-primary/20"
                        value={addForm.customChainId}
                        onChange={(e) =>
                          setAddForm({
                            ...addForm,
                            customChainId: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 p-4 rounded-2xl border border-border/40 bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary animate-pulse" />
                    <p className="text-xs font-bold text-primary uppercase tracking-tight">
                      Intelligent Discovery Active
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    System will automatically fetch protocol name, contract type
                    (Proxy/Diamond), and map tokens to Chainlink feeds.
                  </p>
                  {detectMessage && (
                    <motion.p
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[11px] font-semibold text-primary/80 italic"
                    >
                      {detectMessage}
                    </motion.p>
                  )}
                </div>
                {addError && (
                  <p className="text-sm text-rose-500 font-medium">
                    {addError}
                  </p>
                )}
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  variant="ghost"
                  className="rounded-xl font-bold"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-xl px-8 font-bold bg-primary hover:bg-primary/90"
                  onClick={handleAddContract}
                  disabled={isAdding}
                >
                  {isAdding ? "Adding..." : "Add to Monitoring"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {liveKpis.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="group relative overflow-hidden rounded-3xl border-border/40 bg-card/40 backdrop-blur-xl transition-all hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5">
              <div
                className={cn(
                  "absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl transition-opacity group-hover:opacity-100 opacity-40",
                  kpi.bgColor,
                )}
              />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[13px] font-bold tracking-tight text-muted-foreground uppercase">
                  {kpi.title}
                </CardTitle>
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl",
                    kpi.bgColor,
                  )}
                >
                  <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black tabular-nums tracking-tight text-foreground">
                  {kpi.value}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium brightness-110">
                  <span className={cn("flex items-center gap-0.5", kpi.color)}>
                    <ChevronRight className="h-3 w-3" />
                    {kpi.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <DashboardCharts
        volatilitySeries={volatilitySeries}
        liquiditySeries={liquiditySeries}
        scope="aggregate"
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Monitored Assets summary – full list lives on /dashboard/contracts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="h-full rounded-3xl border-border/40 bg-card/40 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between px-8 py-7">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Monitored Assets
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Real-time status of tracked smart contracts.
                </p>
              </div>
              <Link href="/dashboard/contracts">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-2xl border-border/40 font-bold gap-2"
                >
                  View Registry
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">
                    {liveContracts.length}
                  </span>{" "}
                  contract{liveContracts.length !== 1 ? "s" : ""} monitored
                </p>
                {liveContracts.length > 0 ? (
                  <ul className="space-y-2 max-h-[320px] overflow-y-auto">
                    {liveContracts.map((contract) => (
                      <li key={contract.address}>
                        <Link
                          href={`/dashboard/contracts/${contract.id || contract.address}`}
                          className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/20 px-4 py-3 transition-colors hover:bg-primary/5 hover:border-primary/30 group"
                        >
                          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <FileCode2 className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                              <span className="text-sm font-semibold truncate">
                                {contract.name}
                              </span>
                              {getRiskBadge(contract.riskLevel || "low")}
                            </div>
                            {contract.lastUpdate && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground pl-7" title={contract.lastUpdate}>
                                <Clock className="h-2.5 w-2.5" />
                                Updated {formatSyncTime(contract.lastUpdate)}
                              </span>
                            )}
                          </div>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">
                    No contracts yet. Add one from the Registry.
                  </p>
                )}
                <Link
                  href="/dashboard/contracts"
                  className="text-xs font-bold text-primary hover:underline mt-1"
                >
                  Manage all contracts in Registry →
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Sentinel – real-time alerts (3 most recent), link to full feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="flex h-full flex-col rounded-2xl border-border/40 bg-card/40 backdrop-blur-xl">
            <CardHeader className="px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-bold tracking-tight">
                  Active Sentinel
                </CardTitle>
                <div className="flex items-center gap-2">
                  {liveAlerts.filter((a) => a.status === "active").length > 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] font-bold uppercase h-7 px-2.5 border-rose-500/30 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/alerts/clear-dashboard", { method: "POST" });
                          const data = await res.json().catch(() => ({}));
                          if (res.ok && data.success) {
                            toast.success("Dashboard cleared", {
                              description: data.acknowledged
                                ? `${data.acknowledged} alert(s) marked acknowledged. They remain in Alert Feeds.`
                                : "Active Sentinel is clear.",
                            });
                            refreshRef.current?.();
                          }
                        } catch (e) {
                          console.error("Clear dashboard failed", e);
                          toast.error("Failed to clear dashboard");
                        }
                      }}
                    >
                      Clear
                    </Button>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold uppercase border-muted-foreground/30 bg-muted/20 text-muted-foreground"
                    >
                      CLEAR
                    </Badge>
                  )}
                </div>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Real-time triggers from monitored contracts.
              </p>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 overflow-hidden px-5 pb-4">
              {liveAlerts.length > 0 ? (
                liveAlerts.slice(0, 3).map((alert, i) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.06 }}
                    className="group relative flex flex-col gap-1.5 rounded-xl border border-border/40 bg-muted/10 p-3 transition-all hover:bg-muted/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={cn(
                            "h-6 w-6 shrink-0 rounded-md flex items-center justify-center",
                            alert.severity === "high"
                              ? "bg-rose-500/10 text-rose-500"
                              : alert.severity === "medium"
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-emerald-500/10 text-emerald-500",
                          )}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold tracking-tight text-foreground truncate">
                          {alert.contractName || alert.contract || "Unknown"}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground tabular-nums shrink-0 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {typeof alert.timestamp === "string" && alert.timestamp.includes("T")
                          ? new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : alert.timestamp}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold tracking-wide text-foreground/80 uppercase truncate">
                        {alert.type}
                      </div>
                      <p className="text-[11px] leading-snug text-muted-foreground line-clamp-1">
                        {alert.description || "Security event detected. Inspect in Alerts Feed."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      {getSeverityBadge(alert.severity)}
                      {getStatusBadge(alert.status)}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 opacity-50">
                  <ShieldCheck className="h-8 w-8 text-muted-foreground mb-1.5" />
                  <p className="text-xs">No alerts. Sentinel is clear.</p>
                </div>
              )}
            </CardContent>
            <div className="px-5 pb-4 pt-0">
              <Link href="/dashboard/alerts">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-xs font-bold text-muted-foreground hover:text-primary transition-colors h-8"
                >
                  View all alerts
                  <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import * as framerMotion from "framer-motion";
const motion =
  (framerMotion as any).motion ||
  (framerMotion as any).default?.motion ||
  (framerMotion as any).default;
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
} from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import {
  getOverview,
  addContract,
  discoverContract,
  runGeminiScan,
  type DashboardAlert,
  type DashboardContract,
} from "@/lib/api";
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
    case "ethereum-testnet-sepolia":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#627EEA]" />
          Sepolia
        </span>
      );
    case "ethereum-testnet-holesky":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#627EEA]" />
          Holesky
        </span>
      );
    case "polygon-testnet-amoy":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#8247E5]" />
          Amoy
        </span>
      );
    case "ethereum-testnet-sepolia-arbitrum-1":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#28A0F0]" />
          Arb Sep
        </span>
      );
    case "ethereum-testnet-sepolia-optimism-1":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#FF0420]" />
          OP Sep
        </span>
      );
    case "ethereum-testnet-sepolia-base-1":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#0052FF]" />
          Base Sep
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

// (SUPPORTED_CHAINS and getChainConfig removed as configuration is handled by discovery API)

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
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [detectMessage, setDetectMessage] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    address: "",
    chain: "sepolia",
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
            change: "Live from bridge API",
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
            value: `$${(data.kpis.totalValueLocked / 1000000).toFixed(1)}M`,
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
      } catch (err) {
        console.error("Dashboard refresh failed:", err);
      }
    };

    refresh();
    intervalId = setInterval(refresh, 15000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const handleQuickScan = async () => {
    setIsScanning(true);
    setScanMessage("Initializing CRE Simulator...");
    try {
      const first = liveContracts[0];
      const scanResponse = await runGeminiScan(
        first
          ? {
              contractAddress: first.address,
              chainSelectorName: first.chainSelectorName,
              contractName: first.name,
            }
          : undefined,
      );

      if (scanResponse.data.quotaExceeded) {
        setScanMessage("OpenRouter quota exceeded — showing fallback assessment.");
      } else if (scanResponse.success && scanResponse.assessmentsCount === 0) {
        setScanMessage("Scan finished but no contract results returned.");
        toast.warning("No assessments returned", {
          description: "CRE completed but no contract results were received. Check that config matches your monitored contracts and see terminal/API logs.",
        });
      } else if (scanResponse.success && scanResponse.assessmentsCount > 0) {
        setScanMessage("Scan complete. Updating dashboard...");
        toast.success("Scan complete", {
          description: `${scanResponse.assessmentsCount} contract(s) updated with latest risk data.`,
        });
      } else {
        setScanMessage("Scan complete. Updating dashboard...");
      }

      // Re-fetch overview so "Updated X ago" and KPIs reflect latest state
      setScanMessage("Scan complete. Syncing state...");
      await new Promise(resolve => setTimeout(resolve, 300));
      const response = await getOverview();
      const data = response.data;
      setLiveContracts([...data.contracts]);
      setLiveAlerts([...data.alerts]);
      setLiveKpis([
        {
          title: "Monitored Contracts",
          value: `${data.kpis.monitoredContracts}`,
          change: "Live from bridge API",
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
          value: `$${(data.kpis.totalValueLocked / 1000000).toFixed(1)}M`,
          change: "Derived from monitored contracts",
          icon: TrendingUp,
          color: "text-success",
          bgColor: "bg-success/10",
        },
        {
          title: "Risk Score",
          value: `${data.kpis.riskScore}/100`,
          change: data.kpis.riskScore >= 70 ? "Elevated risk" : "Good standing",
          icon: ShieldCheck,
          color: data.kpis.riskScore >= 70 ? "text-warning" : "text-success",
          bgColor: data.kpis.riskScore >= 70 ? "bg-warning/10" : "bg-success/10",
        },
      ]);
      
      setScanMessage("Dashboard updated.");
      
      // Notify other tabs/components that storage changed
      window.dispatchEvent(new Event('storage'));
      
      setTimeout(() => setScanMessage(null), 5000);
    } catch (err) {
      setScanMessage("Scan failed. Check bridge API and terminal logs.");
      console.error(err);
    } finally {
      setIsScanning(false);
    }
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

    setIsAdding(true);
    setAddError(null);
    setDetectMessage("Intelligently discovering contract metadata...");
    
    try {
      // 1. Discover contract metadata and suggestions
    const discoveryResult = await discoverContract(address, addForm.chain);
    const { discovery, suggestedRequest, preliminaryAssessment } = discoveryResult;

    const balanceInfo = discovery.nativeBalance ? `${discovery.nativeBalance.balance} ${discovery.nativeBalance.symbol}` : '0 ETH';
    setDetectMessage(`Scanned: ${discovery.type} ${discovery.name || 'Contract'}. Found ${balanceInfo} and ${discovery.tokens.length} tokens.`);

    // 2. Add contract using suggested configuration
    await addContract({
      ...suggestedRequest,
      initialAssessment: preliminaryAssessment,
      // Ensure we pass the essential fields from our form or defaults
      alertChannels: ["email"],
      riskThresholds: suggestedRequest.riskThresholds || getRiskThresholds(addForm.riskProfile),
    });

      // 3. Refresh overview
      const overviewResponse = await getOverview();
      const data = overviewResponse.data;
      
      // Update state with new data
      setLiveKpis([
        {
          title: "Monitored Contracts",
          value: `${data.kpis.monitoredContracts}`,
          change: "Live from bridge API",
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
          value: `$${(data.kpis.totalValueLocked / 1000000).toFixed(1)}M`,
          change: "Derived from monitored contracts",
          icon: TrendingUp,
          color: "text-success",
          bgColor: "bg-success/10",
        },
        {
          title: "Risk Score",
          value: `${data.kpis.riskScore}/100`,
          change: data.kpis.riskScore >= 70 ? "Elevated risk" : "Good standing",
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

      // Reset form and close dialog
      setAddForm({
        address: "",
        chain: "sepolia",
        name: "",
        protocol: "Normal",
        riskProfile: "balanced",
        customChainName: "",
        customChainSelectorName: "",
        customRpcUrl: "",
        customChainId: "",
      });
      setDetectMessage(null);
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error("Failed to add contract", err);
      setAddError("Failed to auto-discover and add contract. Check API availability.");
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

  const parseTvl = (value?: string) => {
    if (!value) return null;
    const cleaned = value.replace(/\$/g, "");
    if (cleaned.toLowerCase().endsWith("m")) {
      const amount = Number.parseFloat(cleaned.replace(/m/i, ""));
      return Number.isFinite(amount) ? amount * 1_000_000 : null;
    }
    const parsed = Number.parseFloat(cleaned.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const volatilitySeries = liveContracts
    .map((contract) => ({
      name: contract.name,
      volatility: parsePercentage(contract.volatility),
    }))
    .filter((item) => item.volatility !== null) as Array<{
    name: string;
    volatility: number;
  }>;

  const liquiditySeries = liveContracts
    .map((contract) => ({
      name: contract.name,
      tvl: parseTvl(contract.tvl),
    }))
    .filter((item) => item.tvl !== null) as Array<{
    name: string;
    tvl: number;
  }>;

  return (
    <div className="mx-auto w-full space-y-8 p-6 lg:p-10">
      {/* Hero / Header Section */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
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
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                Sync: {systemStatus.lastSync || "--"}
              </span>
            </div>
          </div>

          {scanMessage && (
            <motion.div 
               initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
               className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-2 border border-primary/20"
            >
              <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="text-xs font-bold text-primary italic">{scanMessage}</span>
            </motion.div>
          )}

          <Button
            size="lg"
            variant="outline"
            disabled={isScanning}
            onClick={handleQuickScan}
            className="h-12 rounded-2xl border-border/60 bg-background/50 backdrop-blur-md transition-all hover:border-primary/50 hover:bg-primary/5"
          >
            <RefreshCw
              className={cn(
                "mr-2 h-4 w-4 text-primary",
                isScanning && "animate-spin",
              )}
            />
            {isScanning ? "Scanning Ecosystem..." : "Force Scan"}
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
                  Provide the contract address and network. Our AI will automatically discover implementation details, held tokens, and mapping feeds.
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
                        <optgroup label="Testnets">
                          <option value="sepolia">Ethereum Sepolia</option>
                          <option value="holesky">Ethereum Holesky</option>
                          <option value="polygonAmoy">Polygon Amoy</option>
                          <option value="arbitrumSepolia">
                            Arbitrum Sepolia
                          </option>
                          <option value="optimismSepolia">
                            Optimism Sepolia
                          </option>
                          <option value="baseSepolia">Base Sepolia</option>
                          <option value="custom">Custom Testnet</option>
                        </optgroup>
                      </select>
                      <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {addForm.chain === "custom" && (
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
                        placeholder="e.g., Local Sepolia"
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
                        placeholder="custom-testnet"
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
                    System will automatically fetch protocol name, contract type (Proxy/Diamond), and map tokens to Chainlink feeds.
                  </p>
                  {detectMessage && (
                    <motion.p 
                      initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
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
      </div>

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
                  <span className="font-bold text-foreground">{liveContracts.length}</span> contract{liveContracts.length !== 1 ? "s" : ""} monitored
                </p>
                {liveContracts.length > 0 ? (
                  <ul className="space-y-2">
                    {liveContracts.slice(0, 4).map((contract) => (
                      <li key={contract.address}>
                        <Link
                          href={`/dashboard/contracts/${contract.id || contract.address}`}
                          className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/20 px-4 py-3 transition-colors hover:bg-primary/5 hover:border-primary/30 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileCode2 className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                            <span className="text-sm font-semibold truncate">{contract.name}</span>
                            {getRiskBadge(contract.riskLevel || "low")}
                          </div>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">No contracts yet. Add one from the Registry.</p>
                )}
                <Link href="/dashboard/contracts" className="text-xs font-bold text-primary hover:underline mt-1">
                  Manage all contracts in Registry →
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Live Threat Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="flex h-full flex-col rounded-3xl border-border/40 bg-card/40 backdrop-blur-xl">
            <CardHeader className="px-8 py-7">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold tracking-tight">
                  Active Sentinel Feed
                </CardTitle>
                <Badge
                  variant="outline"
                  className="animate-pulse border-rose-500/30 bg-rose-500/5 text-rose-500 text-[10px]"
                >
                  LIVE SCAN
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                High-sensitivity triggers and anomaly detection.
              </p>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 overflow-y-auto px-8 pb-8">
              {liveAlerts.length > 0 ? (
                liveAlerts.map((alert, i) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="group relative flex flex-col gap-3 rounded-2xl border border-border/40 bg-muted/10 p-4 transition-all hover:bg-muted/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "h-7 w-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                            alert.severity === "high"
                              ? "bg-rose-500/10 text-rose-500"
                              : alert.severity === "medium"
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-emerald-500/10 text-emerald-500",
                          )}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-bold tracking-tight text-foreground">
                          {alert.contractName || "Unknown"}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground tabular-nums flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {alert.timestamp}
                      </span>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold tracking-wide text-foreground/80 uppercase mb-1">
                        {alert.type}
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {alert.description ||
                          "Potential security event detected on-chain. Requires immediate inspection."}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      {getSeverityBadge(alert.severity)}
                      {getStatusBadge(alert.status)}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex h-full flex-col items-center justify-center opacity-40">
                  <ShieldCheck className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm">No threats currently detected.</p>
                </div>
              )}
            </CardContent>
            <div className="p-4 bg-muted/20 border-t border-border/40 rounded-b-3xl">
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
              >
                View System Historical Audit
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

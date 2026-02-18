"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck,
  FileCode2,
  AlertTriangle,
  TrendingUp,
  Activity,
  Search,
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
  runGeminiScan,
  type DashboardAlert,
  type DashboardContract,
} from "@/lib/api";

const kpiData = [
  {
    title: "Monitored Contracts",
    value: "12",
    change: "+2 this week",
    icon: FileCode2,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Active Alerts",
    value: "3",
    change: "2 high severity",
    icon: AlertTriangle,
    color: "text-danger",
    bgColor: "bg-danger/10",
  },
  {
    title: "Total Value Locked",
    value: "$24.5M",
    change: "+12.3% MTD",
    icon: TrendingUp,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Risk Score",
    value: "72/100",
    change: "Good standing",
    icon: ShieldCheck,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
];

const monitoredContracts = [
  {
    id: "1",
    name: "Uniswap V3 Pool",
    address: "0x8ad5...3f21",
    tvl: "$8.2M",
    riskLevel: "low",
    volatility: "8.2%",
    chain: "ethereum",
  },
  {
    id: "2",
    name: "Aave Lending Pool",
    address: "0x7fc7...9e42",
    tvl: "$12.1M",
    riskLevel: "medium",
    volatility: "15.4%",
    chain: "polygon",
  },
  {
    id: "3",
    name: "Curve Finance",
    address: "0x2d94...8b73",
    tvl: "$4.2M",
    riskLevel: "high",
    volatility: "32.1%",
    chain: "ethereum",
  },
];

const recentAlerts = [
  {
    id: "1",
    timestamp: "2 min ago",
    contract: "Curve Finance",
    type: "Liquidity Drop",
    severity: "high",
    status: "active",
  },
  {
    id: "2",
    timestamp: "15 min ago",
    contract: "Aave Lending Pool",
    type: "Volatility Spike",
    severity: "medium",
    status: "active",
  },
  {
    id: "3",
    timestamp: "1 hour ago",
    contract: "Uniswap V3 Pool",
    type: "Price Deviation",
    severity: "low",
    status: "resolved",
  },
  {
    id: "4",
    timestamp: "3 hours ago",
    contract: "Curve Finance",
    type: "TVL Change",
    severity: "medium",
    status: "acknowledged",
  },
  {
    id: "5",
    timestamp: "6 hours ago",
    contract: "SushiSwap Pool",
    type: "Manipulation Risk",
    severity: "high",
    status: "resolved",
  },
];

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
    case "ethereum":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#627EEA]" />
          ETH
        </span>
      );
    case "polygon":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#8247E5]" />
          MATIC
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

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [liveKpis, setLiveKpis] = useState<any[]>([]);
  const [liveContracts, setLiveContracts] = useState<DashboardContract[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<DashboardAlert[]>([]);
  const [systemStatus, setSystemStatus] = useState({
    oracle: "online",
    riskEngine: "active",
    alertService: "running",
    lastSync: "just now",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const refresh = async () => {
      try {
        const response = await getOverview();
        const data = response.data;

        const mappedKpis = [
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
        ];

        setLiveKpis(mappedKpis);
        setLiveContracts(data.contracts);
        setLiveAlerts(data.alerts);
        setSystemStatus({
          oracle: data.system.oracle,
          riskEngine: data.system.riskEngine,
          alertService: data.system.alertService,
          lastSync: data.system.lastSync,
        });
        setIsLoading(false);
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

  const filteredContracts = liveContracts.filter((contract) => {
    const query = searchQuery.toLowerCase();
    return (
      contract.name.toLowerCase().includes(query) ||
      contract.address.toLowerCase().includes(query)
    );
  });

  const handleQuickScan = async () => {
    setIsScanning(true);
    setScanMessage(null);
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
        setScanMessage("Gemini quota exceeded — showing fallback assessment.");
      } else {
        setScanMessage("Gemini scan complete.");
      }
      const response = await getOverview();
      if (response.data.alerts.length > 0) {
        setLiveAlerts(response.data.alerts);
      }
    } catch {
      setScanMessage("Scan failed. Check bridge API and Gemini config.");
    } finally {
      setIsScanning(false);
    }
  };

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
            Chainlink & Gemini LLM.
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
                Oracle: Online
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                Sync: {systemStatus.lastSync}
              </span>
            </div>
          </div>
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
          <Button
            size="lg"
            className="h-12 rounded-2xl bg-primary px-6 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Contract
          </Button>
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Monitored Assets Table */}
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
              <div className="relative w-full max-w-xs group">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="Filter contracts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-2xl border-border/40 bg-muted/30 pl-10 text-[13px] focus-visible:ring-primary/20"
                />
              </div>
            </CardHeader>
            <CardContent className="px-1 overflow-x-auto">
              <Table className="relative">
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="px-7 font-bold text-foreground/70 uppercase text-[10px]">
                      Contract Name
                    </TableHead>
                    <TableHead className="font-bold text-foreground/70 uppercase text-[10px]">
                      Network
                    </TableHead>
                    <TableHead className="font-bold text-foreground/70 uppercase text-[10px]">
                      Risk Analysis
                    </TableHead>
                    <TableHead className="text-right font-bold text-foreground/70 uppercase text-[10px]">
                      TVL (USD)
                    </TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => (
                    <TableRow
                      key={contract.address}
                      className="group border-border/20 transition-all hover:bg-primary/[0.03]"
                    >
                      <TableCell className="px-7 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-muted/40 transition-transform group-hover:scale-110">
                            <FileCode2 className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-foreground">
                              {contract.name}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground tracking-tight opacity-70">
                              {contract.address}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getChainBadge(
                          contract.chainSelectorName || "ethereum",
                        )}
                      </TableCell>
                      <TableCell>
                        {getRiskBadge(contract.riskLevel || "low")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm font-black tabular-nums">
                          {contract.tvl || "$0.00"}
                        </div>
                        <div className="text-[10px] text-emerald-500 font-bold">
                          Stable
                        </div>
                      </TableCell>
                      <TableCell className="pr-7 text-right">
                        <Link
                          href={`/dashboard/contracts/${contract.id || contract.address}`}
                          passHref
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg transition-all group-hover:bg-primary/20 group-hover:text-primary"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredContracts.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-40 text-center text-muted-foreground"
                      >
                        No contracts found matching your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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

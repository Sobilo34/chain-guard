"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  switch (level) {
    case "low":
      return (
        <Badge className="bg-success/10 text-success hover:bg-success/20 border-0">
          Low Risk
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-warning/10 text-warning hover:bg-warning/20 border-0">
          Medium Risk
        </Badge>
      );
    case "high":
      return (
        <Badge className="bg-danger/10 text-danger hover:bg-danger/20 border-0">
          High Risk
        </Badge>
      );
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case "low":
      return (
        <Badge className="bg-success/10 text-success hover:bg-success/20 border-0">
          Low
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-warning/10 text-warning hover:bg-warning/20 border-0">
          Medium
        </Badge>
      );
    case "high":
      return (
        <Badge className="bg-danger/10 text-danger hover:bg-danger/20 border-0">
          High
        </Badge>
      );
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return (
        <Badge variant="outline" className="border-danger/50 text-danger">
          Active
        </Badge>
      );
    case "acknowledged":
      return (
        <Badge variant="outline" className="border-warning/50 text-warning">
          Acknowledged
        </Badge>
      );
    case "resolved":
      return (
        <Badge variant="outline" className="border-success/50 text-success">
          Resolved
        </Badge>
      );
    default:
      return <Badge variant="outline">Unknown</Badge>;
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
  const [liveKpis, setLiveKpis] = useState(kpiData);
  const [liveContracts, setLiveContracts] = useState<DashboardContract[]>(
    monitoredContracts as DashboardContract[],
  );
  const [liveAlerts, setLiveAlerts] = useState<DashboardAlert[]>(
    recentAlerts as DashboardAlert[],
  );
  const [systemStatus, setSystemStatus] = useState({
    oracle: "online",
    riskEngine: "active",
    alertService: "running",
    lastSync: "2 min ago",
  });
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
            value: `$${data.kpis.totalValueLocked.toFixed(1)}M`,
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
        if (data.contracts.length > 0) setLiveContracts(data.contracts);
        if (data.alerts.length > 0) setLiveAlerts(data.alerts);
        setSystemStatus({
          oracle: data.system.oracle,
          riskEngine: data.system.riskEngine,
          alertService: data.system.alertService,
          lastSync: data.system.lastSync,
        });
      } catch {}
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
      await runGeminiScan(
        first
          ? {
              contractAddress: first.address,
              chainSelectorName: first.chainSelectorName,
              contractName: first.name,
            }
          : undefined,
      );
      setScanMessage("Gemini scan complete.");
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
    <div className="p-4 lg:p-6">
      {/* Hero Section */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor your smart contracts and stay ahead of market risks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
              onClick={handleQuickScan}
              disabled={isScanning}
            >
              <Zap className="h-4 w-4" />
              {isScanning ? "Scanning..." : "Quick Scan"}
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <Link href="/dashboard/contracts">
                <Plus className="h-4 w-4" />
                Add Contract
              </Link>
            </Button>
          </div>
        </div>
        {scanMessage ? (
          <p className="mt-2 text-xs text-muted-foreground">{scanMessage}</p>
        ) : null}
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {liveKpis.map((kpi) => (
          <Card
            key={kpi.title}
            className="border-border/50 transition-shadow hover:shadow-md"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {kpi.title}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {kpi.change}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.bgColor}`}
                >
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <DashboardCharts />

      {/* Main Content Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Monitored Contracts */}
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold">
                Monitored Contracts
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-primary"
                asChild
              >
                <Link href="/dashboard/contracts">
                  View all
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search contracts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1 px-2 pb-2">
                {filteredContracts.map((contract) => (
                  <Link
                    key={contract.id}
                    href={`/dashboard/contracts/${contract.id}`}
                    className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileCode2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {contract.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-muted-foreground">
                            {contract.address}
                          </code>
                          {getChainBadge(contract.chain)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden text-right sm:block">
                        <p className="text-sm font-medium text-success">
                          {contract.tvl}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Vol: {contract.volatility}
                        </p>
                      </div>
                      {getRiskBadge(contract.riskLevel)}
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 bg-transparent"
                asChild
              >
                <Link href="/dashboard/contracts">
                  <Plus className="h-4 w-4" />
                  Add New Contract
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 bg-transparent"
                asChild
              >
                <Link href="/dashboard/settings">
                  <Activity className="h-4 w-4" />
                  Configure Alerts
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 bg-transparent"
              >
                <TrendingUp className="h-4 w-4" />
                View Reports
              </Button>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Chainlink Oracle
                </span>
                <span className="flex items-center gap-1.5 text-sm text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  {formatSystemState(systemStatus.oracle)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Risk Engine
                </span>
                <span className="flex items-center gap-1.5 text-sm text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  {formatSystemState(systemStatus.riskEngine)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Alert Service
                </span>
                <span className="flex items-center gap-1.5 text-sm text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  {formatSystemState(systemStatus.alertService)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Sync</span>
                <span className="text-sm text-muted-foreground">
                  {formatLastSync(systemStatus.lastSync)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Alerts Table */}
      <Card className="mt-6 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold">
            Recent Alerts
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-primary"
            asChild
          >
            <Link href="/dashboard/alerts">
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Timestamp
                  </div>
                </TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Risk Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liveAlerts.map((alert) => (
                <TableRow key={alert.id} className="group">
                  <TableCell className="pl-6 text-muted-foreground">
                    {alert.timestamp}
                  </TableCell>
                  <TableCell className="font-medium">
                    {alert.contract}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                      {alert.type}
                    </span>
                  </TableCell>
                  <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                  <TableCell>{getStatusBadge(alert.status)}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      asChild
                    >
                      <Link href={`/dashboard/alerts/${alert.id}`}>
                        Details
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

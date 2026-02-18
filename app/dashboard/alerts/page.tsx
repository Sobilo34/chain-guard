"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertTriangle,
  Search,
  Filter,
  LayoutGrid,
  List,
  CheckCircle2,
  Eye,
  Clock,
  ExternalLink,
  FileCode2,
  Shield,
  Mail,
  MessageSquare,
  Bell,
  Plus,
  ChevronDown,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  ChevronRight,
} from "lucide-react";
import * as framerMotion from "framer-motion";
const motion =
  (framerMotion as any).motion ||
  (framerMotion as any).default?.motion ||
  (framerMotion as any).default;
const AnimatePresence =
  (framerMotion as any).AnimatePresence ||
  (framerMotion as any).default?.AnimatePresence;
const alerts = [
  {
    id: "1",
    timestamp: "2 min ago",
    contract: "Curve Finance",
    contractAddress: "0x2d94...8b73",
    type: "Liquidity Drop",
    message: "Liquidity dropped 25% in the last hour",
    severity: "high",
    status: "active",
    data: {
      metric: "Liquidity",
      current: "65%",
      threshold: "80%",
      source: "Chainlink Oracle",
      deviation: "-25%",
    },
    aiSummary:
      "A significant liquidity withdrawal occurred, reducing available liquidity to 65%. This could indicate whale movement or protocol instability. Monitor closely for further withdrawals.",
    notificationHistory: [
      { channel: "Email", time: "2 min ago", status: "sent" },
      { channel: "Slack", time: "2 min ago", status: "sent" },
    ],
  },
  {
    id: "2",
    timestamp: "15 min ago",
    contract: "Aave Lending Pool",
    contractAddress: "0x7fc7...9e42",
    type: "Volatility Spike",
    message: "Market volatility exceeded 25% threshold",
    severity: "medium",
    status: "active",
    data: {
      metric: "Volatility",
      current: "28.5%",
      threshold: "25%",
      source: "Chainlink Price Feed",
      deviation: "+3.5%",
    },
    aiSummary:
      "Volatility has increased above your configured threshold, likely due to broader market movements. The spike appears correlated with BTC price action.",
    notificationHistory: [
      { channel: "Email", time: "15 min ago", status: "sent" },
    ],
  },
  {
    id: "3",
    timestamp: "1 hour ago",
    contract: "Uniswap V3 Pool",
    contractAddress: "0x8ad5...3f21",
    type: "Price Deviation",
    message: "Price deviated 3.2% from oracle feed",
    severity: "low",
    status: "resolved",
    data: {
      metric: "Price",
      current: "$2,891.45",
      threshold: "$2,847.32",
      source: "Chainlink/Uniswap TWAP",
      deviation: "+1.5%",
    },
    aiSummary:
      "Minor price deviation detected between DEX price and oracle feed. This was resolved naturally as arbitrageurs balanced the market.",
    notificationHistory: [
      { channel: "Slack", time: "1 hour ago", status: "sent" },
    ],
  },
  {
    id: "4",
    timestamp: "3 hours ago",
    contract: "Curve Finance",
    contractAddress: "0x2d94...8b73",
    type: "TVL Change",
    message: "TVL decreased by 15% in 24 hours",
    severity: "medium",
    status: "acknowledged",
    data: {
      metric: "TVL",
      current: "$4.2M",
      threshold: "10%",
      source: "On-chain Data",
      deviation: "-15%",
    },
    aiSummary:
      "Total Value Locked has decreased significantly. This pattern often precedes larger withdrawals. Consider monitoring for potential cascade effects.",
    notificationHistory: [
      { channel: "Email", time: "3 hours ago", status: "sent" },
      { channel: "Telegram", time: "3 hours ago", status: "sent" },
    ],
  },
  {
    id: "5",
    timestamp: "6 hours ago",
    contract: "SushiSwap Pool",
    contractAddress: "0x06da...4553",
    type: "Manipulation Risk",
    message: "Potential sandwich attack detected",
    severity: "high",
    status: "resolved",
    data: {
      metric: "Transaction Pattern",
      current: "Suspicious",
      threshold: "Normal",
      source: "MEV Analysis",
      deviation: "Anomaly",
    },
    aiSummary:
      "Our MEV detection system identified a potential sandwich attack pattern. The attack was unsuccessful due to slippage protection on the target transaction.",
    notificationHistory: [
      { channel: "Email", time: "6 hours ago", status: "sent" },
      { channel: "Slack", time: "6 hours ago", status: "sent" },
      { channel: "Webhook", time: "6 hours ago", status: "sent" },
    ],
  },
];

const getSeverityBadge = (severity: string) => {
  const normalizedSeverity = (severity || "low").toLowerCase();
  switch (normalizedSeverity) {
    case "low":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase leading-none">
          Low
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-amber-500/10 text-amber-500 border-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase leading-none">
          Medium
        </Badge>
      );
    case "high":
    case "critical":
      return (
        <Badge className="bg-rose-500/10 text-rose-500 border-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase leading-none">
          High
        </Badge>
      );
    default:
      return (
        <Badge
          variant="secondary"
          className="rounded-full text-[10px] font-bold tracking-wider uppercase leading-none"
        >
          Unknown
        </Badge>
      );
  }
};

const getStatusBadge = (status: string) => {
  const normalizedStatus = (status || "active").toLowerCase();
  switch (normalizedStatus) {
    case "active":
      return (
        <Badge
          variant="outline"
          className="border-rose-500/30 bg-rose-500/5 text-rose-500 gap-1.5 px-2.5 py-1 text-[11px] font-bold transition-all hover:bg-rose-500/10"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse outline outline-rose-500/30" />
          ACTIVE
        </Badge>
      );
    case "acknowledged":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/5 text-amber-500 gap-1.5 px-2.5 py-1 text-[11px] font-bold transition-all hover:bg-amber-500/10"
        >
          <Eye className="h-3 w-3" />
          ACKNOWLEDGED
        </Badge>
      );
    case "resolved":
    case "complete":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/5 text-emerald-500 gap-1.5 px-2.5 py-1 text-[11px] font-bold transition-all hover:bg-emerald-500/10"
        >
          <CheckCircle2 className="h-3 w-3" />
          RESOLVED
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="bg-muted/50 text-muted-foreground gap-1.5 px-2.5 py-1 text-[11px] font-bold"
        >
          UNKNOWN
        </Badge>
      );
  }
};

const getChannelIcon = (channel: string) => {
  switch (channel.toLowerCase()) {
    case "email":
      return <Mail className="h-3.5 w-3.5" />;
    case "slack":
      return <MessageSquare className="h-3.5 w-3.5" />;
    case "telegram":
      return <Bell className="h-3.5 w-3.5" />;
    case "webhook":
      return <ExternalLink className="h-3.5 w-3.5" />;
    default:
      return <Bell className="h-3.5 w-3.5" />;
  }
};

export default function AlertsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [selectedAlert, setSelectedAlert] = useState<(typeof alerts)[0] | null>(
    null,
  );

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.contract.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity =
      severityFilter === "all" || alert.severity === severityFilter;
    const matchesStatus =
      statusFilter === "all" || alert.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const activeCount = alerts.filter((a) => a.status === "active").length;

  return (
    <div className="mx-auto w-full space-y-8 p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1.5"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold tracking-wider text-primary uppercase">
            <Bell className="h-3 w-3 fill-primary" />
            Threat Intelligence
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground lg:text-4xl">
            Sentinel Feed<span className="text-primary italic">.</span>
          </h1>
          <p className="max-w-xl text-muted-foreground flex items-center gap-2">
            {activeCount > 0 ? (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                <span className="font-semibold text-rose-500">
                  {activeCount} Urgent event{activeCount > 1 ? "s" : ""}{" "}
                  requiring immediate mitigation.
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Security perimeter intact. No anomalies detected in current
                cycle.
              </>
            )}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Button
            variant="outline"
            size="lg"
            className="h-12 rounded-2xl border-border/40 bg-background/50 font-bold backdrop-blur-md transition-all hover:border-primary/50 hover:bg-primary/5"
            asChild
          >
            <Link href="/dashboard/settings">
              <Plus className="mr-2 h-4 w-4" />
              Tune Sentinel Parameters
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* Filters Hub */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-4 rounded-3xl border border-border/40 bg-card/30 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-1">
          <div className="relative group flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Filter by hash, contract or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 border-border/40 bg-background/40 pl-10 text-[13px] rounded-2xl focus-visible:ring-primary/10"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="h-11 appearance-none rounded-2xl border border-border/40 bg-background/40 pl-9 pr-8 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
              >
                <option value="all">Criticality: All</option>
                <option value="high">High Severity</option>
                <option value="medium">Medium Alerts</option>
                <option value="low">Low Volatility</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
            <div className="relative">
              <Activity className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 appearance-none rounded-2xl border border-border/40 bg-background/40 pl-9 pr-8 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
              >
                <option value="all">Status: Global</option>
                <option value="active">Active Threats</option>
                <option value="acknowledged">Under Review</option>
                <option value="resolved">Archived / Resolved</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl border border-border/40 bg-background/50 p-1 backdrop-blur-sm">
          <Button
            variant={viewMode === "card" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("card")}
            className={cn(
              "h-9 w-9 rounded-xl transition-all",
              viewMode === "card" &&
                "bg-primary/10 text-primary hover:bg-primary/20",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("table")}
            className={cn(
              "h-9 w-9 rounded-xl transition-all",
              viewMode === "table" &&
                "bg-primary/10 text-primary hover:bg-primary/20",
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Alerts Feed */}
      <AnimatePresence mode="popLayout">
        {viewMode === "card" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
          >
            {filteredAlerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <Card
                  className={cn(
                    "group relative h-full cursor-pointer overflow-hidden rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-xl transition-all hover:border-primary/40 hover:shadow-2xl active:scale-[0.98]",
                    alert.status === "active" &&
                      "border-rose-500/20 bg-rose-500/[0.02]",
                  )}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <CardContent className="p-7">
                    <div className="flex items-start justify-between">
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-2xl transition-all group-hover:scale-110",
                          alert.severity === "high"
                            ? "bg-rose-500/10 text-rose-500"
                            : alert.severity === "medium"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-emerald-500/10 text-emerald-500",
                        )}
                      >
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                          <Clock className="h-3 w-3" />
                          {alert.timestamp}
                        </div>
                        {getSeverityBadge(alert.severity)}
                      </div>
                    </div>

                    <div className="mt-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                        <span className="text-xs font-black text-primary uppercase tracking-tighter">
                          {alert.type}
                        </span>
                      </div>
                      <h3 className="text-xl font-black tracking-tight text-foreground transition-colors group-hover:text-primary leading-tight">
                        {alert.contract}
                      </h3>
                      <p className="text-sm font-medium text-muted-foreground line-clamp-2 leading-relaxed">
                        {alert.message}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-6">
                      {getStatusBadge(alert.status)}
                      <div className="flex items-center -space-x-2">
                        {alert.notificationHistory.map((n, i) => (
                          <div
                            key={i}
                            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground shadow-sm"
                          >
                            {getChannelIcon(n.channel)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-xl overflow-hidden"
          >
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 bg-muted/20 hover:bg-muted/20">
                  <TableHead className="px-8 py-5 text-[11px] font-black uppercase text-foreground/70">
                    Timestamp
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase text-foreground/70">
                    Asset Node
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase text-foreground/70">
                    Trigger Event
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase text-foreground/70">
                    Severity
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase text-foreground/70">
                    Current Status
                  </TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert) => (
                  <TableRow
                    key={alert.id}
                    className="group border-border/20 cursor-pointer hover:bg-primary/[0.03] transition-all"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <TableCell className="px-8 py-6">
                      <span className="text-xs font-bold tabular-nums text-muted-foreground">
                        {alert.timestamp}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-black text-foreground">
                          {alert.contract}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground opacity-60 tracking-tight">
                          {alert.contractAddress}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-bold text-primary uppercase tracking-tighter">
                        {alert.type}
                      </p>
                    </TableCell>
                    <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                    <TableCell>{getStatusBadge(alert.status)}</TableCell>
                    <TableCell className="pr-8 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl transition-all group-hover:bg-primary/20 group-hover:text-primary"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet
        open={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
      >
        <SheetContent className="w-full sm:max-w-xl border-l-border/40 bg-card/90 backdrop-blur-2xl p-0">
          {selectedAlert && (
            <div className="flex flex-col h-full">
              <div className="px-8 py-10 border-b border-border/40">
                <div className="flex items-center justify-between mb-8">
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl",
                      selectedAlert.severity === "high"
                        ? "bg-rose-500 shadow-rose-500/20 text-white"
                        : selectedAlert.severity === "medium"
                          ? "bg-amber-500 shadow-amber-500/20 text-white"
                          : "bg-emerald-500 shadow-emerald-500/20 text-white",
                    )}
                  >
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                      Alert Reference
                    </p>
                    <p className="font-mono text-xs font-bold text-foreground">
                      #{selectedAlert.id.padStart(6, "0")}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-primary uppercase tracking-tighter">
                      {selectedAlert.type}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span className="text-sm font-bold text-muted-foreground tabular-nums">
                      {selectedAlert.timestamp}
                    </span>
                  </div>
                  <SheetTitle className="text-3xl font-black tracking-tight leading-none text-foreground">
                    {selectedAlert.contract}
                  </SheetTitle>
                  <p className="text-base font-semibold text-muted-foreground leading-relaxed italic">
                    {selectedAlert.message}
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-8">
                  {getStatusBadge(selectedAlert.status)}
                  {getSeverityBadge(selectedAlert.severity)}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-10 space-y-10">
                {/* LLM Insight Section */}
                <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary/5 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                      <Zap className="h-4 w-4 fill-primary" />
                      <span className="text-xs font-black uppercase tracking-widest">
                        Gemini Engine Analysis
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-primary/30 text-primary text-[10px] font-bold bg-background/50"
                    >
                      GPT-4o Optimized
                    </Badge>
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-foreground">
                    {selectedAlert.aiSummary}
                  </p>
                  <div className="pt-2 flex items-center gap-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-xl border-primary/30 text-xs font-bold text-primary hover:bg-primary/10"
                    >
                      Mitigation Strategy
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 rounded-xl text-xs font-bold text-muted-foreground"
                    >
                      Detailed Trace
                    </Button>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase text-muted-foreground tracking-widest">
                    Telemetry Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedAlert.data).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-2xl border border-border/40 bg-muted/10 p-4"
                      >
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                          {key}
                        </p>
                        <p className="text-sm font-black text-foreground tabular-nums">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase text-muted-foreground tracking-widest">
                    Notification Dispatch
                  </h4>
                  <div className="space-y-3">
                    {selectedAlert.notificationHistory.map((n, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-2xl border border-border/40 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                            {getChannelIcon(n.channel)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {n.channel}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase">
                              {n.time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-500 uppercase">
                            Delivered
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="p-8 border-t border-border/40 bg-muted/10">
                <div className="flex gap-4">
                  <Button className="flex-1 h-12 rounded-xl bg-primary font-bold shadow-lg shadow-primary/20 group">
                    Acknowledge Threat
                    <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-xl border-border/40 font-bold"
                  >
                    Ignore Pattern
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

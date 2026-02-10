"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

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
    aiSummary: "A significant liquidity withdrawal occurred, reducing available liquidity to 65%. This could indicate whale movement or protocol instability. Monitor closely for further withdrawals.",
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
    aiSummary: "Volatility has increased above your configured threshold, likely due to broader market movements. The spike appears correlated with BTC price action.",
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
    aiSummary: "Minor price deviation detected between DEX price and oracle feed. This was resolved naturally as arbitrageurs balanced the market.",
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
    aiSummary: "Total Value Locked has decreased significantly. This pattern often precedes larger withdrawals. Consider monitoring for potential cascade effects.",
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
    aiSummary: "Our MEV detection system identified a potential sandwich attack pattern. The attack was unsuccessful due to slippage protection on the target transaction.",
    notificationHistory: [
      { channel: "Email", time: "6 hours ago", status: "sent" },
      { channel: "Slack", time: "6 hours ago", status: "sent" },
      { channel: "Webhook", time: "6 hours ago", status: "sent" },
    ],
  },
];

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case "low":
      return <Badge className="bg-success/10 text-success hover:bg-success/20 border-0">Low</Badge>;
    case "medium":
      return <Badge className="bg-warning/10 text-warning hover:bg-warning/20 border-0">Medium</Badge>;
    case "high":
      return <Badge className="bg-danger/10 text-danger hover:bg-danger/20 border-0">High</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return (
        <Badge variant="outline" className="border-danger/50 text-danger gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
          Active
        </Badge>
      );
    case "acknowledged":
      return (
        <Badge variant="outline" className="border-warning/50 text-warning gap-1">
          <Eye className="h-3 w-3" />
          Acknowledged
        </Badge>
      );
    case "resolved":
      return (
        <Badge variant="outline" className="border-success/50 text-success gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Resolved
        </Badge>
      );
    default:
      return <Badge variant="outline">Unknown</Badge>;
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
  const [selectedAlert, setSelectedAlert] = useState<typeof alerts[0] | null>(null);

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.contract.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const activeCount = alerts.filter((a) => a.status === "active").length;

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Alerts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeCount > 0 ? (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
                {activeCount} active alert{activeCount > 1 ? "s" : ""} requiring attention
              </span>
            ) : (
              "All alerts resolved - your contracts are secure"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" asChild>
            <Link href="/dashboard/settings">
              Configure Alerts
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="relative">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="h-10 w-32 appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Severity</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 w-32 appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <Button
            variant={viewMode === "card" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => setViewMode("card")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Card View */}
      {viewMode === "card" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              className="border-border/50 cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              onClick={() => setSelectedAlert(alert)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      alert.severity === "high" ? "bg-danger/10" : 
                      alert.severity === "medium" ? "bg-warning/10" : "bg-success/10"
                    }`}>
                      <AlertTriangle className={`h-4 w-4 ${
                        alert.severity === "high" ? "text-danger" : 
                        alert.severity === "medium" ? "text-warning" : "text-success"
                      }`} />
                    </div>
                    <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                  </div>
                  {getStatusBadge(alert.status)}
                </div>
                
                <h3 className="font-semibold text-foreground mb-1">{alert.type}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {alert.message}
                </p>
                
                <div className="flex items-center justify-between">
                  <Link
                    href={`/dashboard/contracts/1`}
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileCode2 className="h-3.5 w-3.5" />
                    {alert.contract}
                  </Link>
                  {getSeverityBadge(alert.severity)}
                </div>

                {alert.status === "active" && (
                  <div className="mt-3 flex items-center gap-2 pt-3 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-success hover:bg-success/90 text-success-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      Resolve
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <Card className="border-border/50">
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
              {filteredAlerts.map((alert) => (
                <TableRow
                  key={alert.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedAlert(alert)}
                >
                  <TableCell className="pl-6 text-muted-foreground">
                    {alert.timestamp}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <FileCode2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{alert.contract}</span>
                    </div>
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
                    <Button variant="ghost" size="sm">
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Empty State */}
      {filteredAlerts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <Shield className="h-8 w-8 text-success" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No alerts found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {searchQuery || severityFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "No alerts to display - your contracts are secure!"}
          </p>
          <Button className="mt-4 gap-2" asChild>
            <Link href="/dashboard/contracts">
              <Plus className="h-4 w-4" />
              Add Contract
            </Link>
          </Button>
        </div>
      )}

      {/* Alert Detail Sheet */}
      <Sheet open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedAlert && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 mb-2">
                  {getSeverityBadge(selectedAlert.severity)}
                  {getStatusBadge(selectedAlert.status)}
                </div>
                <SheetTitle className="text-left">{selectedAlert.type}</SheetTitle>
                <SheetDescription className="text-left">
                  {selectedAlert.message}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Contract Info */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Contract</h4>
                  <Link
                    href="/dashboard/contracts/1"
                    className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <FileCode2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{selectedAlert.contract}</p>
                      <code className="text-xs text-muted-foreground">
                        {selectedAlert.contractAddress}
                      </code>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
                  </Link>
                </div>

                {/* Evidence Data */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Evidence Data</h4>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableBody>
                        {Object.entries(selectedAlert.data).map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell className="font-medium capitalize text-muted-foreground py-2">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </TableCell>
                            <TableCell className="text-right py-2">{value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* AI Summary */}
                <div>
                  <h4 className="text-sm font-medium mb-2">AI Analysis</h4>
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <p className="text-sm text-foreground leading-relaxed">
                      {selectedAlert.aiSummary}
                    </p>
                  </div>
                </div>

                {/* Notification History */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Notification History</h4>
                  <div className="space-y-2">
                    {selectedAlert.notificationHistory.map((notif, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {getChannelIcon(notif.channel)}
                          <span className="text-sm">{notif.channel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{notif.time}</span>
                          <Badge variant="outline" className="text-xs border-success/50 text-success">
                            {notif.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                {selectedAlert.status === "active" && (
                  <div className="flex items-center gap-2 pt-4 border-t border-border">
                    <Button variant="outline" className="flex-1 bg-transparent">
                      Acknowledge
                    </Button>
                    <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground">
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

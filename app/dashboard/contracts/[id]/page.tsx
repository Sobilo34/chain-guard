"use client";

import { use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  { id: "1", time: "2 hours ago", type: "Volatility Spike", severity: "medium", status: "resolved" },
  { id: "2", time: "6 hours ago", type: "Liquidity Drop", severity: "low", status: "resolved" },
  { id: "3", time: "1 day ago", type: "Price Deviation", severity: "high", status: "resolved" },
  { id: "4", time: "2 days ago", type: "Volume Surge", severity: "low", status: "resolved" },
];

const aiSuggestions = [
  {
    title: "Increase Liquidity Threshold",
    description: "Based on recent volatility patterns, consider raising your liquidity drop threshold from 20% to 25% to receive earlier warnings.",
  },
  {
    title: "Enable Manipulation Detection",
    description: "Your contract shows patterns that could benefit from our advanced manipulation detection feature. This monitors for sandwich attacks and front-running.",
  },
  {
    title: "Add Price Feed Redundancy",
    description: "Consider adding multiple oracle price feeds for this asset to improve accuracy and reduce single point of failure risk.",
  },
];

const CustomTooltip = ({ active, payload, label }: {
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
      return <Badge className="bg-success/10 text-success hover:bg-success/20 border-0">Low</Badge>;
    case "medium":
      return <Badge className="bg-warning/10 text-warning hover:bg-warning/20 border-0">Medium</Badge>;
    case "high":
      return <Badge className="bg-danger/10 text-danger hover:bg-danger/20 border-0">High</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
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
    <div className="p-4 lg:p-6">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" className="gap-1 pl-1" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <Link href="/dashboard/contracts" className="text-muted-foreground hover:text-foreground">
          Contracts
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{contractData.name}</span>
      </div>

      {/* Overview Card */}
      <Card className="mb-6 border-border/50">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{contractData.name}</h1>
                <div className="mt-1 flex items-center gap-2">
                  <code className="text-sm text-muted-foreground">
                    {contractData.address.slice(0, 10)}...{contractData.address.slice(-8)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(contractData.address)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                    <a
                      href={`https://etherscan.io/address/${contractData.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-success/10 text-success border-0">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-success" />
                Monitored
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#627EEA]" />
                Ethereum
              </Badge>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Settings className="h-4 w-4" />
                Configure
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Charts Column - 60% */}
        <div className="space-y-6 lg:col-span-3">
          {/* Market Volatility Chart */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Activity className="h-4 w-4 text-primary" />
                Market Volatility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volatilityHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volatilityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--chart-1))"
                      fill="url(#volatilityGrad)"
                      strokeWidth={2}
                      name="Volatility"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Liquidity vs Thresholds */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Droplets className="h-4 w-4 text-chart-2" />
                Liquidity vs Thresholds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={liquidityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Liquidity" />
                    <Bar dataKey="threshold" fill="hsl(var(--chart-3))" fillOpacity={0.3} radius={[4, 4, 0, 0]} name="Threshold" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Risk Breakdown Pie */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Risk Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="h-[180px] w-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {riskBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {riskBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                      <span className="text-sm font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details Column - 40% */}
        <div className="space-y-6 lg:col-span-2">
          {/* Current Data */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Current Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Price
                </span>
                <span className="text-sm font-semibold text-success">{contractData.price}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  Volume (24h)
                </span>
                <span className="text-sm font-semibold">{contractData.volume24h}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Droplets className="h-4 w-4 text-chart-1" />
                  Liquidity
                </span>
                <span className="text-sm font-semibold">{contractData.liquidity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-warning" />
                  TVL
                </span>
                <span className="text-sm font-semibold text-success">{contractData.tvl}</span>
              </div>
            </CardContent>
          </Card>

          {/* Risk Score History */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Risk Score (6h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={riskScoreHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[60, 80]} hide />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--chart-3))"
                      fill="url(#riskGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Score</span>
                <span className="font-semibold text-warning">72/100</span>
              </div>
            </CardContent>
          </Card>

          {/* Alert Rules */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Alert Thresholds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Volatility Threshold</span>
                  <span className="font-medium">15%</span>
                </div>
                <Slider defaultValue={[15]} max={50} step={1} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Liquidity Drop</span>
                  <span className="font-medium">20%</span>
                </div>
                <Slider defaultValue={[20]} max={50} step={1} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Price Deviation</span>
                  <span className="font-medium">5%</span>
                </div>
                <Slider defaultValue={[5]} max={20} step={1} />
              </div>
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                Save Thresholds
              </Button>
            </CardContent>
          </Card>

          {/* Historical Alerts */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock className="h-4 w-4" />
                Recent Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="pr-6">Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicalAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="pl-6 text-xs text-muted-foreground">
                        {alert.time}
                      </TableCell>
                      <TableCell className="text-xs">{alert.type}</TableCell>
                      <TableCell className="pr-6">{getSeverityBadge(alert.severity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Suggestions */}
      <Card className="mt-6 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Mitigation Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <Accordion type="single" collapsible className="px-4">
            {aiSuggestions.map((suggestion, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  {suggestion.title}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {suggestion.description}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

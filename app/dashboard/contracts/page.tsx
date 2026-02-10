"use client";

import { useState } from "react";
import Link from "next/link";
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
  FileCode2,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  Copy,
  ExternalLink,
  MoreVertical,
  ChevronDown,
} from "lucide-react";

const contracts = [
  {
    id: "1",
    name: "Uniswap V3 Pool",
    address: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
    tvl: "$8.2M",
    riskLevel: "low",
    volatility: "8.2%",
    chain: "ethereum",
    status: "monitored",
    lastUpdate: "2 min ago",
  },
  {
    id: "2",
    name: "Aave Lending Pool",
    address: "0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714",
    tvl: "$12.1M",
    riskLevel: "medium",
    volatility: "15.4%",
    chain: "polygon",
    status: "monitored",
    lastUpdate: "5 min ago",
  },
  {
    id: "3",
    name: "Curve Finance",
    address: "0x2d94aa3e47d9d5024503ca8491fce9a2fb4da198",
    tvl: "$4.2M",
    riskLevel: "high",
    volatility: "32.1%",
    chain: "ethereum",
    status: "monitored",
    lastUpdate: "1 min ago",
  },
  {
    id: "4",
    name: "SushiSwap Pool",
    address: "0x06da0fd433c1a5d7a4faa01111c044910a184553",
    tvl: "$2.8M",
    riskLevel: "low",
    volatility: "6.5%",
    chain: "arbitrum",
    status: "paused",
    lastUpdate: "1 hour ago",
  },
  {
    id: "5",
    name: "Compound V3",
    address: "0xc3d688b66703497daa19211eedff47f25384cdc3",
    tvl: "$18.5M",
    riskLevel: "low",
    volatility: "4.2%",
    chain: "ethereum",
    status: "monitored",
    lastUpdate: "3 min ago",
  },
];

const getRiskBadge = (level: string) => {
  switch (level) {
    case "low":
      return <Badge className="bg-success/10 text-success hover:bg-success/20 border-0">Low Risk</Badge>;
    case "medium":
      return <Badge className="bg-warning/10 text-warning hover:bg-warning/20 border-0">Medium Risk</Badge>;
    case "high":
      return <Badge className="bg-danger/10 text-danger hover:bg-danger/20 border-0">High Risk</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "monitored":
      return <Badge className="bg-success/10 text-success border-0">Monitored</Badge>;
    case "paused":
      return <Badge className="bg-warning/10 text-warning border-0">Paused</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const getChainInfo = (chain: string) => {
  const chains: Record<string, { color: string; name: string }> = {
    ethereum: { color: "#627EEA", name: "Ethereum" },
    polygon: { color: "#8247E5", name: "Polygon" },
    arbitrum: { color: "#28A0F0", name: "Arbitrum" },
    optimism: { color: "#FF0420", name: "Optimism" },
  };
  return chains[chain] || { color: "#888", name: chain };
};

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [chainFilter, setChainFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newContract, setNewContract] = useState({ address: "", chain: "ethereum", name: "" });
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChain = chainFilter === "all" || contract.chain === chainFilter;
    return matchesSearch && matchesChain;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Contracts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and monitor your smart contracts
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Contract
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contract</DialogTitle>
              <DialogDescription>
                Enter the contract address and select the chain to start monitoring.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Contract Name (Optional)</Label>
                <Input
                  id="name"
                  placeholder="e.g., My DeFi Pool"
                  value={newContract.name}
                  onChange={(e) => setNewContract({ ...newContract, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Contract Address</Label>
                <Input
                  id="address"
                  placeholder="0x..."
                  className="font-mono"
                  value={newContract.address}
                  onChange={(e) => setNewContract({ ...newContract, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chain">Chain</Label>
                <div className="relative">
                  <select
                    id="chain"
                    value={newContract.chain}
                    onChange={(e) => setNewContract({ ...newContract, chain: e.target.value })}
                    className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="polygon">Polygon</option>
                    <option value="arbitrum">Arbitrum</option>
                    <option value="optimism">Optimism</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddDialogOpen(false)}>
                Start Monitoring
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="relative">
            <select
              value={chainFilter}
              onChange={(e) => setChainFilter(e.target.value)}
              className="h-10 w-36 appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Chains</option>
              <option value="ethereum">Ethereum</option>
              <option value="polygon">Polygon</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Contracts Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredContracts.map((contract) => {
          const chainInfo = getChainInfo(contract.chain);
          return (
            <Card key={contract.id} className="border-border/50 transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileCode2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {contract.name}
                      </CardTitle>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: chainInfo.color }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {chainInfo.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setMenuOpen(menuOpen === contract.id ? null : contract.id)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {menuOpen === contract.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setMenuOpen(null)} 
                        />
                        <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border border-border bg-popover p-1 shadow-lg">
                          <Link 
                            href={`/dashboard/contracts/${contract.id}`}
                            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                            onClick={() => setMenuOpen(null)}
                          >
                            View Details
                          </Link>
                          <button 
                            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                            onClick={() => setMenuOpen(null)}
                          >
                            Configure Alerts
                          </button>
                          <button 
                            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                            onClick={() => setMenuOpen(null)}
                          >
                            Pause Monitoring
                          </button>
                          <button 
                            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-danger hover:bg-accent"
                            onClick={() => setMenuOpen(null)}
                          >
                            Remove Contract
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Address */}
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <code className="text-xs text-muted-foreground">
                    {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
                  </code>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(contract.address)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                      <a
                        href={`https://etherscan.io/address/${contract.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">TVL</p>
                    <p className="text-sm font-semibold text-success">{contract.tvl}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Volatility</p>
                    <p className="text-sm font-semibold">{contract.volatility}</p>
                  </div>
                </div>

                {/* Status & Risk */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(contract.status)}
                    {getRiskBadge(contract.riskLevel)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {contract.lastUpdate}
                  </span>
                </div>

                {/* Action */}
                <Button variant="outline" className="w-full gap-2 bg-transparent" asChild>
                  <Link href={`/dashboard/contracts/${contract.id}`}>
                    View Details
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredContracts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileCode2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No contracts found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery || chainFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Add your first contract to start monitoring"}
          </p>
          {!searchQuery && chainFilter === "all" && (
            <Button className="mt-4 gap-2" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Contract
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

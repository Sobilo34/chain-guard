"use client";

import { useEffect, useState } from "react";
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
// Force refresh
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
  Bell,
  Search,
  Plus,
  Filter,
  ChevronDown,
  LayoutGrid,
  List,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Zap,
  ChevronRight,
  Activity,
  Globe,
  FileCode2,
  Copy,
  Trash2,
} from "lucide-react";
import {
  addContract,
  getContracts,
  runGeminiScan,
  type DashboardContract,
} from "@/lib/api";

const getRiskBadge = (level: string) => {
  const normalizedLevel = (level || "low").toLowerCase();
  switch (normalizedLevel) {
    case "low":
    case "min":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
          Low Risk
        </Badge>
      );
    case "medium":
    case "med":
      return (
        <Badge className="bg-amber-500/10 text-amber-500 border-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
          Medium Risk
        </Badge>
      );
    case "high":
    case "crit":
      return (
        <Badge className="bg-rose-500/10 text-rose-500 border-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
          High Risk
        </Badge>
      );
    default:
      return (
        <Badge
          variant="secondary"
          className="rounded-full text-[10px] font-bold uppercase tracking-wider"
        >
          Unknown
        </Badge>
      );
  }
};

const getStatusBadge = (status: string | undefined) => {
  const normalizedStatus = (status || "monitored").toLowerCase();
  switch (normalizedStatus) {
    case "monitored":
    case "active":
      return (
        <div className="flex items-center gap-1.5 text-emerald-500">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-tight">
            Active Scan
          </span>
        </div>
      );
    case "paused":
      return (
        <div className="flex items-center gap-1.5 text-amber-500">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span className="text-[11px] font-bold uppercase tracking-tight">
            Paused
          </span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          <span className="text-[11px] font-bold uppercase tracking-tight">
            {status}
          </span>
        </div>
      );
  }
};

const getChainInfo = (chain: string) => {
  const normalizedChain = chain.toLowerCase();
  const chains: Record<
    string,
    { color: string; name: string; symbol: string }
  > = {
    ethereum: { color: "#627EEA", name: "Ethereum", symbol: "ETH" },
    polygon: { color: "#8247E5", name: "Polygon", symbol: "MATIC" },
    arbitrum: { color: "#28A0F0", name: "Arbitrum", symbol: "ARB" },
    optimism: { color: "#FF0420", name: "Optimism", symbol: "OP" },
  };
  return (
    chains[normalizedChain] || {
      color: "#888",
      name: chain,
      symbol: chain.slice(0, 3).toUpperCase(),
    }
  );
};

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [chainFilter, setChainFilter] = useState("all");
  const [isScanning, setIsScanning] = useState(false);
  const [contracts, setContracts] = useState<DashboardContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newContract, setNewContract] = useState({
    address: "",
    chain: "ethereum",
    name: "",
  });

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const refresh = async () => {
      try {
        const response = await getContracts();
        if (response.contracts) {
          setContracts(response.contracts);
        }
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch contracts", err);
      }
    };

    refresh();
    intervalId = setInterval(refresh, 15000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const chainToSelector = (chain: string) => {
    switch (chain) {
      case "polygon":
        return "polygon-testnet-amoy";
      case "arbitrum":
        return "ethereum-testnet-sepolia-arbitrum-1";
      case "optimism":
        return "ethereum-testnet-sepolia-optimism-1";
      default:
        return "ethereum-testnet-sepolia";
    }
  };

  const handleAddContract = async () => {
    if (!newContract.address.trim()) return;

    await addContract({
      address: newContract.address,
      chainSelectorName: chainToSelector(newContract.chain),
      name: newContract.name || undefined,
    });

    const refreshed = await getContracts();
    if (refreshed.contracts) {
      setContracts(refreshed.contracts);
    }

    setNewContract({ address: "", chain: "ethereum", name: "" });
    setIsAddDialogOpen(false);
  };

  const handleGlobalScan = async () => {
    try {
      setIsScanning(true);
      await runGeminiScan();
      alert("System-wide scan initiated across all registered contracts.");
    } catch (err) {
      console.error("Global scan failed", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleContractScan = async (address: string) => {
    try {
      setIsScanning(true);
      await runGeminiScan({ contractAddress: address });
      alert(`Targeted scan initiated for contract ${address}`);
    } catch (err) {
      console.error("Contract scan failed", err);
    } finally {
      setIsScanning(false);
    }
  };

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChain =
      chainFilter === "all" || contract.chain === chainFilter;
    return matchesSearch && matchesChain;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
            <Globe className="h-3 w-3" />
            Ecosystem Registry
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground lg:text-4xl">
            Monitored Assets<span className="text-primary italic">.</span>
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Centralized management for all your smart contracts across multiple
            chains.
          </p>
        </motion.div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="h-12 rounded-2xl bg-primary px-8 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="mr-2 h-5 w-5" />
              Register Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl border-border/40 bg-card/90 backdrop-blur-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Register New Contract
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Enter the contract metadata to begin automated indexing.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-6">
              <div className="space-y-2">
                <Label
                  htmlFor="address"
                  className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider"
                >
                  On-Chain Address
                </Label>
                <div className="relative">
                  <FileCode2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="address"
                    placeholder="0x..."
                    className="h-12 rounded-xl border-border/40 bg-muted/30 pl-10 font-mono text-sm focus-visible:ring-primary/20 transition-all"
                    value={newContract.address}
                    onChange={(e) =>
                      setNewContract({
                        ...newContract,
                        address: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider"
                  >
                    Internal Label
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Vault V1"
                    className="h-12 rounded-xl border-border/40 bg-muted/30 text-sm focus-visible:ring-primary/20"
                    value={newContract.name}
                    onChange={(e) =>
                      setNewContract({ ...newContract, name: e.target.value })
                    }
                  />
                </div>
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
                      value={newContract.chain}
                      onChange={(e) =>
                        setNewContract({
                          ...newContract,
                          chain: e.target.value,
                        })
                      }
                      className="h-12 w-full appearance-none rounded-xl border border-border/40 bg-muted/30 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="ghost"
                className="rounded-xl font-bold"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Dismiss
              </Button>
              <Button
                className="rounded-xl px-8 font-bold bg-primary hover:bg-primary/90"
                onClick={handleAddContract}
              >
                Begin Indexing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Hub */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-4 rounded-3xl border border-border/40 bg-card/30 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="relative group flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search by name, address or hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 border-border/40 bg-background/40 pl-10 text-[13px] rounded-2xl focus-visible:ring-primary/10 transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={chainFilter}
              onChange={(e) => setChainFilter(e.target.value)}
              className="h-11 appearance-none rounded-2xl border border-border/40 bg-background/40 pl-9 pr-8 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
            >
              <option value="all">All Networks</option>
              <option value="ethereum">Mainnet (Ethereum)</option>
              <option value="polygon">Polygon</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="h-11 w-px bg-border/40 hidden sm:block" />
          <Button
            variant="ghost"
            size="icon"
            disabled={isScanning}
            onClick={handleGlobalScan}
            className={cn(
              "h-11 w-11 rounded-2xl border border-border/30 hover:bg-muted/50",
              isScanning && "animate-pulse border-primary/40 text-primary",
            )}
          >
            <Zap
              className={cn(
                "h-4 w-4",
                isScanning ? "fill-primary" : "text-muted-foreground",
              )}
            />
          </Button>
        </div>
      </motion.div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredContracts.map((contract, index) => {
            const chain = getChainInfo(contract.chain || "ethereum");
            return (
              <motion.div
                key={contract.address}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <Card className="group relative h-full overflow-hidden rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-xl transition-all hover:border-primary/40 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                  <div className="absolute right-0 top-0 h-40 w-40 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  <CardHeader className="p-7">
                    <div className="flex items-start justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 shadow-inner group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500">
                        <FileCode2 className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1.5 rounded-full border border-border/40 bg-background/50 px-2.5 py-1 backdrop-blur-md">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: chain.color }}
                          />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {chain.symbol}
                          </span>
                        </div>
                        {getRiskBadge(contract.riskLevel || "low")}
                      </div>
                    </div>
                    <div className="mt-6 space-y-1">
                      <CardTitle className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                        {contract.name}
                      </CardTitle>
                      <button
                        onClick={() => copyToClipboard(contract.address)}
                        className="flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors group/addr"
                      >
                        {contract.address.slice(0, 10)}...
                        {contract.address.slice(-8)}
                        <Copy className="h-3 w-3 opacity-0 group-hover/addr:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className="px-7 pb-4">
                    <div className="grid grid-cols-2 gap-4 rounded-2xl bg-muted/30 p-4 border border-border/20">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-0.5">
                          Total Value
                        </p>
                        <p className="text-lg font-black tracking-tighter tabular-nums">
                          {contract.tvl || "$0.00"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-0.5">
                          Volatility
                        </p>
                        <p className="text-lg font-black tracking-tighter text-emerald-500 tabular-nums">
                          {contract.volatility || "0.0%"}
                        </p>
                      </div>
                    </div>
                  </CardContent>

                  <div className="px-7 pb-7 flex items-center justify-between">
                    {getStatusBadge(contract.status)}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/contracts/${contract.id || contract.address}`}
                        passHref
                      >
                        <Button className="rounded-xl border-border/40 bg-background/50 font-bold hover:bg-primary/10 hover:text-primary transition-all">
                          View Node
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isScanning}
                        onClick={() => handleContractScan(contract.address)}
                        className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                      >
                        <Zap
                          className={cn(
                            "h-4 w-4",
                            isScanning && "fill-primary",
                          )}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filteredContracts.length === 0 && (
          <div className="col-span-full flex h-80 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-border/40 bg-muted/10 opacity-60">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-muted/40 mb-4">
              <ShieldCheck className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold">No Contracts Found</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
              Refine your search parameters or register a new contract to start
              monitoring.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

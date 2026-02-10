"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Wallet, ArrowRight, ExternalLink, ChevronDown } from "lucide-react";

const chains = [
  { value: "ethereum", label: "ETH", color: "#627EEA" },
  { value: "polygon", label: "MATIC", color: "#8247E5" },
  { value: "arbitrum", label: "ARB", color: "#28A0F0" },
  { value: "optimism", label: "OP", color: "#FF0420" },
];

export default function LoginPage() {
  const router = useRouter();
  const [contractAddress, setContractAddress] = useState("");
  const [selectedChain, setSelectedChain] = useState("ethereum");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const isValidAddress = contractAddress.startsWith("0x") && contractAddress.length === 42;
  const currentChain = chains.find(c => c.value === selectedChain) || chains[0];

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
    }, 1500);
  };

  const handleStartMonitoring = () => {
    if (isValidAddress) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="rounded-xl border border-border bg-card p-8 shadow-2xl shadow-primary/5">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              ChainGuard Sentinel
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Secure your smart contracts with AI-powered market risk monitoring
            </p>
          </div>

          {/* Wallet Connect Section */}
          <div className="space-y-6">
            {!isConnected ? (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="h-12 w-full gap-2 text-base font-medium"
              >
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Connecting...
                  </span>
                ) : (
                  <>
                    <Wallet className="h-5 w-5" />
                    Connect Wallet
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 p-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-sm font-medium text-foreground">0x7a2...8f4d</span>
                </div>
                <span className="text-xs text-success">Connected</span>
              </div>
            )}

            {/* Wallet Options */}
            {!isConnected && (
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted">
                    <svg className="h-4 w-4" viewBox="0 0 35 33" fill="none">
                      <path d="M32.9582 1L19.8241 10.7183L22.2666 4.99099L32.9582 1Z" fill="#E17726"/>
                      <path d="M2.04858 1L15.0707 10.809L12.7335 4.99098L2.04858 1Z" fill="#E27625"/>
                      <path d="M28.2295 23.5334L24.735 28.872L32.2693 30.9323L34.4289 23.6501L28.2295 23.5334Z" fill="#E27625"/>
                      <path d="M0.585938 23.6501L2.73107 30.9323L10.2654 28.872L6.77085 23.5334L0.585938 23.6501Z" fill="#E27625"/>
                    </svg>
                  </div>
                  MetaMask
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.09 10.55c1.47-2.63 5.35-2.63 5.35-2.63s3.88 0 5.35 2.63c1.47 2.63-1.39 6.31-5.35 6.31s-6.82-3.68-5.35-6.31z"/>
                      <path d="M4.5 12c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5-3.36 7.5-7.5 7.5S4.5 16.14 4.5 12z" fillOpacity="0.3"/>
                    </svg>
                  </div>
                  WalletConnect
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">
                  {isConnected ? "Add Contract" : "or enter contract address"}
                </span>
              </div>
            </div>

            {/* Contract Address Input */}
            <div className="space-y-3">
              <Label htmlFor="contract" className="text-sm font-medium">
                Deployed Contract Address
              </Label>
              <div className="flex gap-2">
                <Input
                  id="contract"
                  placeholder="0x..."
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  className="h-11 flex-1 font-mono text-sm"
                />
                <div className="relative">
                  <select
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(e.target.value)}
                    className="h-11 w-28 appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm font-medium text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {chains.map((chain) => (
                      <option key={chain.value} value={chain.value}>
                        {chain.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Start Monitoring Button */}
            <Button
              onClick={handleStartMonitoring}
              disabled={!isValidAddress}
              className="h-12 w-full gap-2 text-base font-medium"
            >
              Start Monitoring
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <span>Powered by</span>
            <a
              href="#"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Chainlink CRE
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" />
          <span>Enterprise-grade security for your smart contracts</span>
        </div>
      </div>
    </div>
  );
}

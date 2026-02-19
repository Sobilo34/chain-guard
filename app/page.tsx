"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  ArrowRight,
  Activity,
  Zap,
  Lock,
  Globe,
} from "lucide-react";
import * as framerMotion from "framer-motion";
const motion =
  (framerMotion as any).motion ||
  (framerMotion as any).default?.motion ||
  (framerMotion as any).default;
const AnimatePresence =
  (framerMotion as any).AnimatePresence ||
  (framerMotion as any).default?.AnimatePresence;
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { getAlertEmail, setAlertEmail } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { open } = useAppKit();
  const [isMounted, setIsMounted] = useState(false);
  const [alertEmail, setAlertEmailState] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const saved = localStorage.getItem("chainguard.alertEmail");
    if (saved) setAlertEmailState(saved);

    getAlertEmail()
      .then((result) => {
        if (result.email) {
          setAlertEmailState(result.email);
          localStorage.setItem("chainguard.alertEmail", result.email);
        }
      })
      .catch(() => {
        // Ignore fetch errors here
      });
  }, [isMounted]);

  const handleGoToDashboard = async () => {
    const email = alertEmail.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValid) {
      setEmailError("Enter a valid email to receive alerts.");
      return;
    }

    setIsSaving(true);
    setEmailError(null);
    try {
      await setAlertEmail(email);
      localStorage.setItem("chainguard.alertEmail", email);
      router.push("/dashboard");
    } catch {
      setEmailError("Failed to save email. Check bridge API.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#030303] text-white">
      {/* Header with Connect Wallet Button */}
      <header className="absolute top-0 left-0 right-0 z-20 p-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">ChainGuard</span>
          </div>
          {!isConnected ? (
            <Button
              onClick={() => open({ view: "Connect" })}
              className="h-10 px-6 gap-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-95"
            >
              Connect Wallet
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2">
                <div className="h-6 w-6 overflow-hidden rounded-full border border-white/10">
                  <div className="h-full w-full bg-gradient-to-br from-primary to-blue-600" />
                </div>
                <span className="text-sm font-mono font-medium">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => open({ view: "Account" })}
                className="rounded-xl bg-white/5 hover:bg-white/10 text-xs border border-white/10"
              >
                Manage
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
      </div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <main className="relative z-10 flex w-full max-w-5xl flex-col items-center px-6 py-20 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </span>
          <span className="text-xs font-medium tracking-wider uppercase text-white/70">
            Powered by Chainlink CRE & Gemini AI
          </span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-4xl text-5xl font-bold tracking-tight sm:text-7xl"
        >
          Intelligence for <br />
          <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
            On-Chain Security
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 max-w-2xl text-lg text-white/50"
        >
          Real-time market risk monitoring, liquidity analysis, and depeg
          detection orchestrated by AI agents on the Chainlink Runtime
          Environment.
        </motion.p>

        {/* Action Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-2xl"
        >
          <div className="rounded-[calc(1.5rem-1px)] bg-[#0A0A0A]/80 p-8 shadow-2xl">
            <div className="flex flex-col gap-6">
              {!isConnected ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">
                      Start your Protection
                    </h3>
                    <p className="text-sm text-white/40">
                      Connect your wallet to access the sentinel
                    </p>
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">
                          Wallet Connected
                        </h3>
                        <p className="text-sm text-white/40">
                          You're ready to monitor your smart contracts
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-left">
                      <Label
                        htmlFor="alert-email"
                        className="text-sm font-medium text-white/70"
                      >
                        Alert Email
                      </Label>
                      <Input
                        id="alert-email"
                        type="email"
                        placeholder="alerts@example.com"
                        value={alertEmail}
                        onChange={(e) => setAlertEmailState(e.target.value)}
                        className="h-12 border-white/10 bg-black/50 text-white placeholder:text-white/20 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <p className="text-xs text-white/40">
                        Email is required to receive CRE + Gemini alerts. Other
                        channels coming soon.
                      </p>
                      {emailError && (
                        <p className="text-xs text-rose-400">{emailError}</p>
                      )}
                    </div>

                    <Button
                      onClick={handleGoToDashboard}
                      disabled={isSaving}
                      className="h-12 w-full gap-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-95"
                    >
                      {isSaving ? "Saving..." : "Save Email & Go to Dashboard"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="mt-24 grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: Activity,
              title: "Real-time Audits",
              desc: "Continuous monitoring of pool liquidity and volume spikes.",
            },
            {
              icon: Zap,
              title: "AI Analysis",
              desc: "Gemini-powered sentiment and transaction pattern analysis.",
            },
            {
              icon: Lock,
              title: "Autonomous Response",
              desc: "Automated alerts and circuit breakers via Chainlink CRE.",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              className="group flex flex-col items-center rounded-3xl border border-white/5 bg-white/[0.02] p-8 transition-colors hover:bg-white/[0.04]"
            >
              <div className="mb-4 rounded-2xl bg-primary/10 p-3 text-primary group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-center text-sm text-white/40 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="absolute bottom-10 left-0 right-0 z-10 hidden sm:block">
        <div className="flex items-center justify-center gap-8 text-[11px] font-medium tracking-widest uppercase text-white/20">
          <span className="flex items-center gap-2 tracking-normal">
            <Globe className="h-3 w-3" />
            Global Network
          </span>
          <span className="h-1 w-1 rounded-full bg-white/10" />
          <span>Decentralized Security</span>
          <span className="h-1 w-1 rounded-full bg-white/10" />
          <span>No-Permit Verification</span>
        </div>
      </footer>
    </div>
  );
}

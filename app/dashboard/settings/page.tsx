"use client";

import { useEffect, useState } from "react";
import * as framerMotion from "framer-motion";
const motion =
  (framerMotion as any).motion ||
  (framerMotion as any).default?.motion ||
  (framerMotion as any).default;
const AnimatePresence =
  (framerMotion as any).AnimatePresence ||
  (framerMotion as any).default?.AnimatePresence;
import {
  Bell,
  Mail,
  MessageSquare,
  Send,
  Webhook,
  Shield,
  Settings,
  User,
  Download,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Sun,
  Monitor,
  ExternalLink,
  Copy,
  Zap,
  Globe,
  Sliders,
  Database,
  Lock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { getAlertEmail, setAlertEmail, triggerTestEmail } from "@/lib/api";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [alertEmail, setAlertEmailState] = useState("");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [volatilityThreshold, setVolatilityThreshold] = useState([15]);
  const [liquidityThreshold, setLiquidityThreshold] = useState([20]);
  const [priceDeviationThreshold, setPriceDeviationThreshold] = useState([5]);
  const [aceCompliance, setAceCompliance] = useState(true);
  const [mevProtection, setMevProtection] = useState(true);
  const [autoResolve, setAutoResolve] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
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
        // ignore
      });
  }, []);

  const handleSaveEmail = async () => {
    const email = alertEmail.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValid) {
      setEmailStatus("Enter a valid email address.");
      return;
    }

    setIsSavingEmail(true);
    setEmailStatus(null);
    try {
      await setAlertEmail(email);
      localStorage.setItem("chainguard.alertEmail", email);
      setEmailStatus("Email updated successfully.");
    } catch {
      setEmailStatus("Failed to update email. Check bridge API.");
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    setEmailStatus(null);
    try {
      const result = await triggerTestEmail();
      setEmailStatus(result.message);
    } catch (err: any) {
      setEmailStatus(err.message || "Failed to trigger test notification.");
    } finally {
      setIsTestingEmail(false);
    }
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
            <Settings className="h-3 w-3 fill-primary" />
            System Configuration
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground lg:text-4xl">
            Preferences<span className="text-primary italic">.</span>
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Tune your sentinel network parameters and security infrastructure.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Button className="h-12 rounded-2xl bg-primary px-8 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
            <Download className="mr-2 h-4 w-4" />
            Backup Config
          </Button>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="notifications" className="space-y-8">
        <TabsList className="h-14 w-full justify-start gap-1 rounded-3xl border border-border/40 bg-card/30 p-1.5 backdrop-blur-xl lg:w-auto">
          {[
            { value: "notifications", icon: Bell, label: "Alerting" },
            { value: "thresholds", icon: Sliders, label: "Thresholds" },
            { value: "policies", icon: Shield, label: "Security" },
            { value: "account", icon: User, label: "Identity" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="relative h-full gap-2 rounded-2xl px-6 text-sm font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <AnimatePresence mode="wait">
          {/* Notifications Tab */}
          <TabsContent key="notifications" value="notifications">
            <motion.div
              key="notifications-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-6 lg:grid-cols-2"
            >
              {/* Email */}
              <Card className="group relative overflow-hidden rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-xl transition-all hover:border-primary/30">
                <CardHeader className="p-7">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                        <Mail className="h-7 w-7" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">
                          Email Dispatch
                        </CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                          Verified Route
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={emailEnabled}
                      onCheckedChange={setEmailEnabled}
                      className="scale-125 data-[state=checked]:bg-primary"
                    />
                  </div>
                </CardHeader>
                <AnimatePresence>
                  {emailEnabled && (
                    <motion.div
                      key="email-settings-panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <CardContent className="px-7 pb-7 space-y-6">
                        <div className="space-y-2">
                          <Label
                            htmlFor="email"
                            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                          >
                            Destination Hash
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="alerts@example.com"
                            value={alertEmail}
                            onChange={(event) =>
                              setAlertEmailState(event.target.value)
                            }
                            className="h-12 rounded-xl border-border/40 bg-muted/20 font-medium focus-visible:ring-primary/20"
                          />
                        </div>
                        <div className="flex flex-col gap-3">
                          <Button
                            onClick={handleSaveEmail}
                            disabled={isSavingEmail}
                            className="h-11 w-full rounded-xl font-bold bg-primary hover:bg-primary/90"
                          >
                            {isSavingEmail ? "Saving..." : "Save Email"}
                          </Button>
                          <Button
                            onClick={handleTestEmail}
                            disabled={isTestingEmail || !alertEmail}
                            variant="outline"
                            className="h-11 w-full rounded-xl font-bold border-primary/20 hover:bg-primary/5 text-primary"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {isTestingEmail
                              ? "Triggering..."
                              : "Test Notification"}
                          </Button>
                        </div>
                        {emailStatus && (
                          <p className="text-xs text-muted-foreground">
                            {emailStatus}
                          </p>
                        )}
                        <div className="flex items-center justify-between rounded-xl bg-emerald-500/5 px-4 py-3 border border-emerald-500/10">
                          <span className="text-xs font-bold text-muted-foreground">
                            Security Status
                          </span>
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-0 gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Badge>
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* Slack */}
              <Card className="group relative overflow-hidden rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-xl transition-all hover:border-[#4A154B]/30">
                <CardHeader className="p-7">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4A154B]/10 text-[#4A154B] dark:text-[#E01E5A] transition-transform group-hover:scale-110">
                        <MessageSquare className="h-7 w-7" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">
                          Slack Tunnel
                        </CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                          Legacy Hook
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-muted/20 text-muted-foreground border-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                      Coming Soon
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-7 pb-7">
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-xs text-muted-foreground">
                    Slack notifications are coming soon.
                  </div>
                </CardContent>
              </Card>

              {/* Telegram */}
              <Card className="group relative overflow-hidden rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-xl transition-all hover:border-[#0088CC]/30">
                <CardHeader className="p-7">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0088CC]/10 text-[#0088CC] transition-transform group-hover:scale-110">
                        <Send className="h-7 w-7 rotate-12" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">
                          Telegram Bot
                        </CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                          P2P Encrypted
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-muted/20 text-muted-foreground border-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                      Coming Soon
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-7 pb-7">
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-xs text-muted-foreground">
                    Telegram notifications are coming soon.
                  </div>
                </CardContent>
              </Card>

              {/* Webhook */}
              <Card className="group relative overflow-hidden rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-xl transition-all hover:border-emerald-500/30">
                <CardHeader className="p-7">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-110">
                        <Webhook className="h-7 w-7" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">
                          Global Webhook
                        </CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                          Developer Mode
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-muted/20 text-muted-foreground border-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                      Coming Soon
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-7 pb-7">
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-xs text-muted-foreground">
                    Webhook notifications are coming soon.
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Thresholds Tab */}
          <TabsContent key="thresholds" value="thresholds">
            <motion.div
              key="thresholds-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="rounded-[2.5rem] border-border/40 bg-card/40 backdrop-blur-xl overflow-hidden p-1">
                <div className="px-10 py-10 bg-muted/10 rounded-[2.2rem]">
                  <div className="flex items-center gap-3 mb-10">
                    <Zap className="h-5 w-5 text-primary fill-primary" />
                    <h3 className="text-2xl font-black tracking-tight text-foreground">
                      Global Sentinel Logic
                    </h3>
                  </div>

                  <div className="grid gap-12 lg:grid-cols-2">
                    {/* Thresholds Sliders Column */}
                    <div className="space-y-10">
                      <div className="space-y-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-black uppercase tracking-widest text-foreground">
                              Volatility Limit
                            </Label>
                            <p className="text-xs font-medium text-muted-foreground">
                              Trigger alert on variance deviation increase.
                            </p>
                          </div>
                          <span className="text-2xl font-black text-primary tabular-nums">
                            {volatilityThreshold}%
                          </span>
                        </div>
                        <Slider
                          value={volatilityThreshold}
                          onValueChange={setVolatilityThreshold}
                          max={50}
                          step={1}
                          className="py-4"
                        />
                      </div>

                      <div className="space-y-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-black uppercase tracking-widest text-foreground">
                              Liquidity Buffer
                            </Label>
                            <p className="text-xs font-medium text-muted-foreground">
                              Minimum depth required for stable status.
                            </p>
                          </div>
                          <span className="text-2xl font-black text-amber-500 tabular-nums">
                            {liquidityThreshold}%
                          </span>
                        </div>
                        <Slider
                          value={liquidityThreshold}
                          onValueChange={setLiquidityThreshold}
                          max={50}
                          step={1}
                          className="py-4"
                        />
                      </div>
                    </div>

                    {/* Toggles Column */}
                    <div className="space-y-8 rounded-3xl border border-border/40 bg-background/40 p-8 self-start shadow-inner">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm font-black text-foreground">
                            ACE Compliance
                          </Label>
                          <p className="text-xs font-medium text-muted-foreground">
                            Auto-check against exchange risk databases.
                          </p>
                        </div>
                        <Switch
                          checked={aceCompliance}
                          onCheckedChange={setAceCompliance}
                          className="scale-110"
                        />
                      </div>
                      <Separator className="bg-border/40" />
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm font-black text-foreground">
                            MEV Countermeasures
                          </Label>
                          <p className="text-xs font-medium text-muted-foreground">
                            Detect potential sandwich or frontrun patterns.
                          </p>
                        </div>
                        <Switch
                          checked={mevProtection}
                          onCheckedChange={setMevProtection}
                          className="scale-110"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

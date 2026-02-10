"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
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
} from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [slackEnabled, setSlackEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [volatilityThreshold, setVolatilityThreshold] = useState([15]);
  const [liquidityThreshold, setLiquidityThreshold] = useState([20]);
  const [priceDeviationThreshold, setPriceDeviationThreshold] = useState([5]);
  const [aceCompliance, setAceCompliance] = useState(true);
  const [mevProtection, setMevProtection] = useState(true);
  const [autoResolve, setAutoResolve] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure notifications, risk thresholds, and account preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4 hidden sm:block" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="gap-2">
            <AlertTriangle className="h-4 w-4 hidden sm:block" />
            Thresholds
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2">
            <Shield className="h-4 w-4 hidden sm:block" />
            Policies
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4 hidden sm:block" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Email */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Email Notifications</CardTitle>
                      <CardDescription>Receive alerts via email</CardDescription>
                    </div>
                  </div>
                  <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
                </div>
              </CardHeader>
              {emailEnabled && (
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="alerts@example.com"
                      defaultValue="john@example.com"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className="bg-success/10 text-success border-0 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </Badge>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Slack */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4A154B]/10">
                      <MessageSquare className="h-5 w-5 text-[#4A154B] dark:text-[#E01E5A]" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Slack Integration</CardTitle>
                      <CardDescription>Send alerts to Slack channel</CardDescription>
                    </div>
                  </div>
                  <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} />
                </div>
              </CardHeader>
              {slackEnabled && (
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2">
                    <Label htmlFor="slack-webhook">Webhook URL</Label>
                    <Input
                      id="slack-webhook"
                      type="url"
                      placeholder="https://hooks.slack.com/..."
                      defaultValue="https://hooks.slack.com/services/T00..."
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className="bg-success/10 text-success border-0 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    Test Connection
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Telegram */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0088CC]/10">
                      <Send className="h-5 w-5 text-[#0088CC]" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Telegram Bot</CardTitle>
                      <CardDescription>Get instant alerts via Telegram</CardDescription>
                    </div>
                  </div>
                  <Switch checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
                </div>
              </CardHeader>
              {telegramEnabled && (
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2">
                    <Label htmlFor="telegram-token">Bot Token</Label>
                    <Input
                      id="telegram-token"
                      type="password"
                      placeholder="Enter your bot token"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telegram-chat">Chat ID</Label>
                    <Input
                      id="telegram-chat"
                      placeholder="Enter chat ID"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    Send Test Message
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Webhook */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Webhook className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Custom Webhook</CardTitle>
                      <CardDescription>Send alerts to your endpoint</CardDescription>
                    </div>
                  </div>
                  <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
                </div>
              </CardHeader>
              {webhookEnabled && (
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Endpoint URL</Label>
                    <Input
                      id="webhook-url"
                      type="url"
                      placeholder="https://api.example.com/webhook"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-secret">Secret (Optional)</Label>
                    <Input
                      id="webhook-secret"
                      type="password"
                      placeholder="Webhook secret for verification"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    Test Webhook
                  </Button>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Risk Thresholds Tab */}
        <TabsContent value="thresholds" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Global Risk Thresholds</CardTitle>
              <CardDescription>
                Set default thresholds for all monitored contracts. These can be overridden per contract.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Volatility */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Volatility Threshold</Label>
                    <p className="text-xs text-muted-foreground">
                      Alert when market volatility exceeds this percentage
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-primary">
                    {volatilityThreshold}%
                  </span>
                </div>
                <Slider
                  value={volatilityThreshold}
                  onValueChange={setVolatilityThreshold}
                  max={50}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                </div>
              </div>

              <Separator />

              {/* Liquidity Drop */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Liquidity Drop Threshold</Label>
                    <p className="text-xs text-muted-foreground">
                      Alert when liquidity drops by this percentage
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-warning">
                    {liquidityThreshold}%
                  </span>
                </div>
                <Slider
                  value={liquidityThreshold}
                  onValueChange={setLiquidityThreshold}
                  max={50}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                </div>
              </div>

              <Separator />

              {/* Price Deviation */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Price Deviation Threshold</Label>
                    <p className="text-xs text-muted-foreground">
                      Alert when price deviates from oracle by this percentage
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-danger">
                    {priceDeviationThreshold}%
                  </span>
                </div>
                <Slider
                  value={priceDeviationThreshold}
                  onValueChange={setPriceDeviationThreshold}
                  max={20}
                  step={0.5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>10%</span>
                  <span>20%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRE Policies Tab */}
        <TabsContent value="policies" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Chainlink CRE Integration</CardTitle>
              <CardDescription>
                Configure Chainlink Runtime Environment policies and features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ACE Compliance */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">ACE Compliance Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Enforce Automation Compliance Engine standards
                    </p>
                  </div>
                </div>
                <Switch checked={aceCompliance} onCheckedChange={setAceCompliance} />
              </div>

              {/* MEV Protection */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium">MEV Protection</p>
                    <p className="text-sm text-muted-foreground">
                      Enable sandwich attack and front-running detection
                    </p>
                  </div>
                </div>
                <Switch checked={mevProtection} onCheckedChange={setMevProtection} />
              </div>

              {/* Auto Resolve */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">Auto-Resolve Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically resolve alerts when conditions normalize
                    </p>
                  </div>
                </div>
                <Switch checked={autoResolve} onCheckedChange={setAutoResolve} />
              </div>

              {/* Integration Status */}
              <div className="mt-6 p-4 rounded-lg border border-success/30 bg-success/5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-medium text-success">Chainlink CRE Connected</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your account is connected to Chainlink Runtime Environment. All oracle data and risk assessments are powered by Chainlink.
                </p>
                <a
                  href="https://chain.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                >
                  Learn more about Chainlink CRE
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Wallet Info */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Connected Wallet</CardTitle>
                <CardDescription>Your wallet address and connection status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      0x
                    </div>
                    <div>
                      <code className="text-sm">0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D</code>
                      <p className="text-xs text-muted-foreground mt-0.5">Ethereum Mainnet</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" className="w-full gap-2 text-danger hover:text-danger bg-transparent">
                  <LogOut className="h-4 w-4" />
                  Disconnect Wallet
                </Button>
              </CardContent>
            </Card>

            {/* Theme Preference */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Choose your preferred theme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setTheme("light")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      theme === "light"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Sun className="h-5 w-5" />
                    <span className="text-sm font-medium">Light</span>
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      theme === "dark"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Moon className="h-5 w-5" />
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      theme === "system"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Monitor className="h-5 w-5" />
                    <span className="text-sm font-medium">System</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Data Export */}
            <Card className="border-border/50 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Data Management</CardTitle>
                <CardDescription>Export your data or manage your account</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row">
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Export Alert History
                </Button>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Export Contract Data
                </Button>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Settings className="h-4 w-4" />
                  Export All Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm p-4 lg:left-0">
        <div className="flex items-center justify-end gap-3 max-w-7xl mx-auto">
          <Button variant="ghost">Cancel</Button>
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

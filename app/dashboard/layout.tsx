"use client";

import React from "react";
import { Suspense } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import {
  ShieldCheck,
  LayoutDashboard,
  FileCode2,
  Bell,
  Settings,
  Search,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  User,
  Menu,
  X,
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

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Contracts", href: "/dashboard/contracts", icon: FileCode2 },
  { name: "Alerts Feed", href: "/dashboard/alerts", icon: Bell },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="relative min-h-screen bg-background transition-colors duration-300 flex flex-col">
      {/* Dynamic Background elements - Subtler than landing */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px] dark:bg-primary/10" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-blue-500/5 blur-[120px] dark:bg-blue-900/10" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.05] brightness-100 contrast-150" />
      </div>

      {/* Grid Overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)]" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl dark:bg-background/40">
        <div className="flex h-16 items-center justify-between px-4 lg:px-8">
          {/* Left: Logo & Nav */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="group flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 transition-all group-hover:bg-primary/20">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <span className="hidden text-lg font-bold tracking-tight text-foreground sm:block">
                ChainGuard<span className="text-primary">.</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden items-center gap-1 md:flex">
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all text-muted-foreground hover:text-foreground",
                      isActive && "text-primary hover:text-primary",
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-xl bg-primary/10"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                    <item.icon className="relative z-10 h-4 w-4" />
                    <span className="relative z-10">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Search, Notifications, Theme, User */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Find contract..."
                className="h-10 w-64 rounded-xl border-border/50 bg-muted/20 pl-9 text-xs font-medium focus-visible:ring-primary/20"
              />
            </div>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="group relative h-10 w-10 rounded-xl"
              asChild
            >
              <Link href="/dashboard/alerts">
                <Bell className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
              </Link>
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-10 w-10 rounded-xl"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
            </Button>

            {/* User Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                className="h-10 gap-2 rounded-xl border border-transparent pl-2 pr-3 transition-all hover:bg-muted/50 focus:ring-0"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-600 text-[10px] font-bold text-white shadow-sm">
                  0x
                </div>
                <span className="hidden text-sm font-medium sm:block text-foreground/80">
                  0x7a2...8f4d
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    userMenuOpen && "rotate-180",
                  )}
                />
              </Button>

              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border/40 bg-popover/90 p-1.5 shadow-2xl backdrop-blur-xl"
                    >
                      <Link
                        href="/dashboard/settings"
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-primary/10 hover:text-primary"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Identity Profile
                      </Link>
                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-primary/10 hover:text-primary"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Globe className="h-4 w-4" />
                        Network Status
                      </button>
                      <div className="my-1.5 h-px bg-border/40" />
                      <Link
                        href="/"
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-rose-500 transition-all hover:bg-rose-500/10"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LogOut className="h-4 w-4" />
                        Disconnect
                      </Link>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border/40 px-4 py-4 md:hidden bg-background/80 backdrop-blur-xl"
            >
              <div className="mb-4">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search contracts..."
                    className="h-11 rounded-xl border-border/50 bg-muted/30 pl-10 text-sm focus-visible:ring-primary/20"
                  />
                </div>
              </div>
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all active:scale-95",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-[1600px] transition-all flex-grow w-full">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 bg-background/40 px-6 py-6 lg:px-12 backdrop-blur-sm mt-auto">
        <div className="flex flex-col items-center justify-between gap-4 text-xs font-medium text-muted-foreground sm:flex-row">
          <p>
            © 2026 ChainGuard Sentinel
            <span className="text-primary/50 mx-1">|</span>Intelligent Security
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              Terms
            </Link>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/5 px-3 py-1 text-[10px] tracking-wider uppercase text-emerald-500/80 border border-emerald-500/10">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Mainnet Verified
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

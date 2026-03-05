/**
 * Server-only file-based store for contracts, alert email, and alerts.
 * Do not import from client components.
 */

import fs from "fs";
import path from "path";
import type { DashboardContract, DashboardAlert } from "./api";

const DATA_DIR = process.env.CHAINGUARD_DATA_DIR || path.join(process.cwd(), ".data");
const CONTRACTS_PATH = path.join(DATA_DIR, "contracts.json");
const ALERT_EMAIL_PATH = path.join(DATA_DIR, "alert-email.txt");
const ALERTS_PATH = path.join(DATA_DIR, "alerts.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export async function getContracts(): Promise<DashboardContract[]> {
  ensureDir();
  if (!fs.existsSync(CONTRACTS_PATH)) return [];
  try {
    const raw = fs.readFileSync(CONTRACTS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setContracts(contracts: DashboardContract[]): Promise<void> {
  ensureDir();
  fs.writeFileSync(CONTRACTS_PATH, JSON.stringify(Array.isArray(contracts) ? contracts : [], null, 2), "utf-8");
}

export async function getAlertEmail(): Promise<string | null> {
  ensureDir();
  if (!fs.existsSync(ALERT_EMAIL_PATH)) return null;
  try {
    const email = fs.readFileSync(ALERT_EMAIL_PATH, "utf-8").trim();
    return email || null;
  } catch {
    return null;
  }
}

export async function setAlertEmail(email: string | null): Promise<void> {
  ensureDir();
  if (email == null || email.trim() === "") {
    if (fs.existsSync(ALERT_EMAIL_PATH)) fs.unlinkSync(ALERT_EMAIL_PATH);
    return;
  }
  fs.writeFileSync(ALERT_EMAIL_PATH, email.trim(), "utf-8");
}

export async function getAlerts(): Promise<DashboardAlert[]> {
  ensureDir();
  if (!fs.existsSync(ALERTS_PATH)) return [];
  try {
    const raw = fs.readFileSync(ALERTS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addAlert(alert: Omit<DashboardAlert, "id">): Promise<DashboardAlert> {
  const alerts = await getAlerts();
  const newAlert: DashboardAlert = {
    ...alert,
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  };
  const updated = [newAlert, ...alerts].slice(0, 100);
  await saveAlerts(updated);
  return newAlert;
}

export async function saveAlerts(alerts: DashboardAlert[]): Promise<void> {
  ensureDir();
  fs.writeFileSync(ALERTS_PATH, JSON.stringify(Array.isArray(alerts) ? alerts : [], null, 2), "utf-8");
}

export async function updateAlert(alertId: string, updates: Partial<DashboardAlert>): Promise<DashboardAlert | null> {
  const alerts = await getAlerts();
  const index = alerts.findIndex((a) => a.id === alertId);
  if (index === -1) return null;
  const existing = alerts[index];
  const merged: DashboardAlert = { ...existing, ...updates };
  if (updates.notificationHistory && updates.notificationHistory.length > 0) {
    const existingHistory = existing.notificationHistory || [];
    merged.notificationHistory = [...existingHistory, ...updates.notificationHistory];
  }
  const updated = [...alerts];
  updated[index] = merged;
  await saveAlerts(updated);
  return merged;
}

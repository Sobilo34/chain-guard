/**
 * ContractStorage
 * Handles client-side persistence of monitored contracts and alerts using localStorage.
 */

import { DashboardContract, DashboardAlert, OverviewPayload } from "./api";
import { formatTvl, formatPrice, parseTvlToNumber } from "./format-metrics";

const STORAGE_KEYS = {
    CONTRACTS: "chainguard_contracts",
    ALERTS: "chainguard_alerts",
    SYSTEM_SYNC: "chainguard_system_sync",
    /** One-time: clear old/default contracts so only user-added contracts are shown. */
    CONTRACTS_RESET_DONE: "chainguard_contracts_reset_v1",
};

export class ContractStorage {
    /**
     * Get all monitored contracts from localStorage.
     * Only user-added contracts are returned; no hardcoded/seed contracts are merged.
     * Monitored Assets (Overview and Registry) use this as the single source of truth.
     */
    static getContracts(): DashboardContract[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(STORAGE_KEYS.CONTRACTS);

        const normalizeAddress = (addr: string) => {
            if (!addr) return "";
            const clean = addr.toLowerCase().trim();
            return clean.startsWith("0x") ? clean : `0x${clean}`;
        };

        // One-time reset: clear any previously stored/default contracts so only user-added contracts appear from now on.
        const resetDone = localStorage.getItem(STORAGE_KEYS.CONTRACTS_RESET_DONE);
        if (!resetDone && stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.saveContracts([]);
                    localStorage.setItem(STORAGE_KEYS.CONTRACTS_RESET_DONE, "1");
                    return [];
                }
            } catch {
                // ignore
            }
            // Mark reset done even when stored was empty so we don't re-enter
            localStorage.setItem(STORAGE_KEYS.CONTRACTS_RESET_DONE, "1");
        }

        let contracts: DashboardContract[] = [];
        if (stored) {
            try {
                contracts = JSON.parse(stored);
                contracts = contracts.map(c => ({ ...c, address: normalizeAddress(c.address) }));
            } catch (e) {
                console.error("Failed to parse contracts", e);
            }
        } else {
            this.saveContracts([]);
            return [];
        }

        return contracts;
    }

    /**
     * Save contracts to localStorage
     */
    static saveContracts(contracts: DashboardContract[]): void {
        if (typeof window === "undefined") return;
        localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));
    }

    /**
     * Add a new contract
     */
    static addContract(contract: Omit<DashboardContract, "id">): DashboardContract {
        const contracts = this.getContracts();
        const normalize = (addr: string) => addr.toLowerCase().trim().startsWith("0x") ? addr.toLowerCase().trim() : `0x${addr.toLowerCase().trim()}`;
        const normalizedAddr = normalize(contract.address);

        const newContract: DashboardContract = {
            ...contract,
            address: normalizedAddr,
            id: normalizedAddr,
            status: contract.status || "LOW",
            lastUpdate: new Date().toISOString(),
        };

        // Prevent duplicates
        const filtered = contracts.filter(c => normalize(c.address) !== normalizedAddr);
        const updated = [...filtered, newContract];
        this.saveContracts(updated);
        return newContract;
    }

    /**
     * Update contract status/metrics
     */
    static updateContract(address: string, updates: Partial<DashboardContract>): DashboardContract | null {
        const contracts = this.getContracts();
        const normalize = (addr: string) => addr.toLowerCase().trim().startsWith("0x") ? addr.toLowerCase().trim() : `0x${addr.toLowerCase().trim()}`;
        const searchAddr = normalize(address);

        const index = contracts.findIndex(c => normalize(c.address) === searchAddr);
        if (index === -1) return null;

        const existing = contracts[index];
        const now = new Date();
        const hrs = now.getHours().toString().padStart(2, '0');
        const mins = now.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hrs}:${mins}`;

        // Merge metrics
        const metrics = { ...existing.metrics, ...updates.metrics };

        // Promote metrics to top-level properties for UI compatibility
        const promoted: Partial<DashboardContract> = {};
        if (metrics.tvl !== undefined || metrics.totalValueLocked !== undefined) {
            const val = metrics.tvl || metrics.totalValueLocked;
            promoted.tvl = formatTvl(Number(val));
        }
        if (metrics.currentPrice !== undefined || metrics.price !== undefined) {
            const val = metrics.currentPrice || metrics.price;
            (promoted as any).price = formatPrice(Number(val));
        }
        if (metrics.volume24h !== undefined) {
            promoted.volatility = `${(metrics.volatility || updates.volatility || 2.4)}%`; // Fallback to avoid empty
        }
        if (metrics.volatility !== undefined) {
            const val = metrics.volatility;
            promoted.volatility = `${(val * 100).toFixed(1)}%`;
        }

        const history = existing.history || { volatility: [], riskScore: [] };
        if (metrics.volatility !== undefined) {
            history.volatility = [...(history.volatility || []), { time: timeStr, value: metrics.volatility }].slice(-10);
        }

        const riskLevel = updates.riskLevel || existing.riskLevel;
        const status = updates.status || existing.status;
        if (updates.status || updates.riskLevel || updates.riskScore) {
            const score = updates.riskScore || (riskLevel === "high" || status === "CRITICAL" ? 85 :
                riskLevel === "medium" || status === "HIGH" ? 65 : 15);
            history.riskScore = [...(history.riskScore || []), { time: timeStr, value: score }].slice(-10);
            (promoted as any).riskScore = score;
        }

        contracts[index] = {
            ...existing,
            ...updates,
            ...promoted,
            metrics,
            history,
            lastUpdate: now.toISOString()
        };
        this.saveContracts(contracts);
        return contracts[index];
    }

    /**
     * Delete a contract
     */
    static deleteContract(address: string): void {
        const contracts = this.getContracts();
        const normalize = (addr: string) => addr.toLowerCase().trim().startsWith("0x") ? addr.toLowerCase().trim() : `0x${addr.toLowerCase().trim()}`;
        const searchAddr = normalize(address);

        const filtered = contracts.filter(c => normalize(c.address) !== searchAddr);
        this.saveContracts(filtered);

        // Also cleanup alerts for this contract
        const alerts = this.getAlerts();
        const filteredAlerts = alerts.filter(a => normalize(a.contract) !== searchAddr);
        this.saveAlerts(filteredAlerts);
    }

    /**
     * Get all alerts
     */
    static getAlerts(): DashboardAlert[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(STORAGE_KEYS.ALERTS);
        return stored ? JSON.parse(stored) : [];
    }

    /**
     * Save alerts
     */
    static saveAlerts(alerts: DashboardAlert[]): void {
        if (typeof window === "undefined") return;
        localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
    }

    /**
     * Add an alert
     */
    static addAlert(alert: Omit<DashboardAlert, "id">): DashboardAlert {
        const alerts = this.getAlerts();
        const newAlert: DashboardAlert = {
            ...alert,
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        };

        // Keep last 100 alerts
        const updated = [newAlert, ...alerts].slice(0, 100);
        this.saveAlerts(updated);
        return newAlert;
    }

    /**
     * Delete an alert by id
     */
    static deleteAlert(alertId: string): boolean {
        const alerts = this.getAlerts();
        const filtered = alerts.filter(a => a.id !== alertId);
        if (filtered.length === alerts.length) return false;
        this.saveAlerts(filtered);
        return true;
    }

    /**
     * Update an alert by id (e.g. append notificationHistory when email is sent).
     */
    static updateAlert(alertId: string, updates: Partial<DashboardAlert>): DashboardAlert | null {
        const alerts = this.getAlerts();
        const index = alerts.findIndex(a => a.id === alertId);
        if (index === -1) return null;
        const existing = alerts[index];
        const merged: DashboardAlert = { ...existing, ...updates };
        if (updates.notificationHistory && updates.notificationHistory.length > 0) {
            const existingHistory = existing.notificationHistory || [];
            merged.notificationHistory = [...existingHistory, ...updates.notificationHistory];
        }
        const updated = [...alerts];
        updated[index] = merged;
        this.saveAlerts(updated);
        return merged;
    }

    /**
     * Get dashboard overview
     */
    static getOverview(): OverviewPayload {
        const contracts = this.getContracts();
        const alerts = this.getAlerts();

        let totalTvl = 0;
        let activeAlerts = 0;
        let totalRiskScore = 0;
        let contractsWithScore = 0;

        contracts.forEach(c => {
            totalTvl += parseTvlToNumber(c.tvl);

            if (c.status === "HIGH" || c.status === "CRITICAL") activeAlerts++;

            // Heuristic risk score if not present
            const score = (c as any).riskScore || (c.riskLevel === "high" ? 75 : c.riskLevel === "medium" ? 45 : 15);
            totalRiskScore += score;
            contractsWithScore++;
        });

        return {
            kpis: {
                monitoredContracts: contracts.length,
                activeAlerts,
                totalValueLocked: totalTvl,
                riskScore: contractsWithScore > 0 ? Math.round(totalRiskScore / contractsWithScore) : 0,
            },
            contracts,
            alerts: alerts.slice(0, 5), // Latest 5 for overview
            system: {
                oracle: "Chainlink Price Feeds",
                riskEngine: "OpenRouter AI",
                alertService: "Active (Local)",
                lastSync: localStorage.getItem(STORAGE_KEYS.SYSTEM_SYNC) || new Date().toISOString(),
            },
        };
    }

    /**
     * Update sync timestamp
     */
    static updateSyncTimestamp(): void {
        if (typeof window === "undefined") return;
        localStorage.setItem(STORAGE_KEYS.SYSTEM_SYNC, new Date().toISOString());
    }
}

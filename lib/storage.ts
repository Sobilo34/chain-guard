/**
 * ContractStorage
 * Handles client-side persistence of monitored contracts and alerts using localStorage.
 */

import { DashboardContract, DashboardAlert, OverviewPayload } from "./api";

const STORAGE_KEYS = {
    CONTRACTS: "chainguard_contracts",
    ALERTS: "chainguard_alerts",
    SYSTEM_SYNC: "chainguard_system_sync",
};

export class ContractStorage {
    /**
     * Get all monitored contracts from localStorage
     */
    static getContracts(): DashboardContract[] {
        if (typeof window === "undefined") return [];
        const stored = localStorage.getItem(STORAGE_KEYS.CONTRACTS);

        const normalizeAddress = (addr: string) => {
            if (!addr) return "";
            const clean = addr.toLowerCase().trim();
            return clean.startsWith("0x") ? clean : `0x${clean}`;
        };

        const seedContracts: DashboardContract[] = [
            {
                id: "0x514910771af9ca656af840dff83e8264ecf986ca",
                name: "Chainlink",
                address: "0x514910771af9ca656af840dff83e8264ecf986ca",
                tvl: "$125.0M",
                riskLevel: "low",
                volatility: "2.4%",
                chain: "ethereumMainnet",
                chainSelectorName: "ethereum-mainnet",
                status: "LOW",
                lastUpdate: new Date().toISOString(),
                priceFeeds: [
                    {
                        pairName: "LINK/USD",
                        feedAddress: "0x2c1d072e50aD1FdecF8aC38D21Bf21bcfb1F3627",
                        decimals: 8
                    }
                ],
                riskThresholds: {
                    depegTolerance: 0.02,
                    volatilityMax: 0.15,
                    liquidityDropMax: 0.25,
                    collateralRatioMin: 1.5
                }
            },
            {
                id: "0xdac17f958d2ee523a2206206994597c13d831ec7",
                name: "RISK_MOCK: USDT Depeg Scenario",
                address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                tvl: "$45.2M",
                riskLevel: "high",
                volatility: "85.0%",
                chain: "ethereumMainnet",
                chainSelectorName: "ethereum-mainnet",
                status: "CRITICAL",
                lastUpdate: new Date().toISOString(),
                priceFeeds: [
                    {
                        pairName: "USDT/USD",
                        feedAddress: "0x3E7d1eA13978982C58110906476e3FFf87208e59",
                        decimals: 8
                    }
                ],
                riskThresholds: {
                    depegTolerance: 0.01,
                    volatilityMax: 0.1,
                    liquidityDropMax: 0.2
                }
            }
        ];

        let contracts: DashboardContract[] = [];
        if (stored) {
            try {
                contracts = JSON.parse(stored);
                // Basic migration: ensure all existing contract addresses are normalized
                contracts = contracts.map(c => ({ ...c, address: normalizeAddress(c.address) }));
            } catch (e) {
                console.error("Failed to parse contracts", e);
            }
        } else {
            this.saveContracts(seedContracts);
            return seedContracts;
        }

        // Ensure defaults are present but DON'T overwrite metadata
        let changed = false;
        seedContracts.forEach(seed => {
            const seedAddr = normalizeAddress(seed.address);
            const existingIndex = contracts.findIndex(c => normalizeAddress(c.address) === seedAddr);

            if (existingIndex === -1) {
                contracts.push(seed);
                changed = true;
            }
            // We NO LONGER overwrite Name/ID here to prevent wiping discovery data
        });

        if (changed) {
            this.saveContracts(contracts);
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
            promoted.tvl = `$${(val / 1000000).toFixed(1)}M`;
        }
        if (metrics.currentPrice !== undefined || metrics.price !== undefined) {
            const val = metrics.currentPrice || metrics.price;
            (promoted as any).price = `$${val.toFixed(2)}`;
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
            // Parse TVL: "$1.2M" -> 1200000
            const tvlStr = c.tvl || "$0.0M";
            const match = tvlStr.match(/\$([\d.]+)([MK]?)/);
            if (match) {
                let val = parseFloat(match[1]);
                if (match[2] === 'M') val *= 1000000;
                if (match[2] === 'K') val *= 1000;
                totalTvl += val;
            }

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
                riskEngine: "Gemini 2.0 Flash",
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

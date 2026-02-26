import { ContractStorage } from "./storage";

export const API_BASE_URL = "/api/cre";

export type DashboardContract = {
  id: string;
  name: string;
  address: string;
  tvl: string;
  riskLevel: "low" | "medium" | "high";
  volatility: string;
  chain: string;
  chainSelectorName?: string;
  status?: string;
  lastUpdate?: string;
  latestScan?: any;
  metrics?: {
    tvl?: number;
    price?: number;
    volume24h?: number;
    liquidity?: number;
    volatility?: number;
    [key: string]: any;
  };
  history?: {
    volatility?: Array<{ time: string; value: number }>;
    riskScore?: Array<{ time: string; value: number }>;
  };
  priceFeeds?: Array<{ pairName: string; feedAddress: string; decimals: number }>;
  riskThresholds?: Record<string, any>;
};

export type DashboardAlert = {
  id: string;
  timestamp: string;
  contract: string;
  contractName?: string;
  description?: string;
  type: string;
  severity: "low" | "medium" | "high";
  status: "active" | "acknowledged" | "resolved";
};

export type OverviewPayload = {
  kpis: {
    monitoredContracts: number;
    activeAlerts: number;
    totalValueLocked: number;
    riskScore: number;
  };
  contracts: DashboardContract[];
  alerts: DashboardAlert[];
  system: {
    oracle: string;
    riskEngine: string;
    alertService: string;
    lastSync: string;
  };
};

export type ScanResult = {
  riskLevel: string;
  riskType: string;
  confidence: number;
  reasoning: string;
  suggestedActions: string[];
  affectedMetrics?: string[];
  estimatedImpact?: string;
  source?: string;
  quotaExceeded?: boolean;
};

export type AlertPayload = {
  alerts: DashboardAlert[];
  total: number;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`API ${res.status}: ${raw}`);
  }

  return res.json() as Promise<T>;
}

export async function getOverview(): Promise<{ data: OverviewPayload }> {
  // Use ContractStorage for overview
  return { data: ContractStorage.getOverview() };
}

export async function getContracts(): Promise<{ contracts: DashboardContract[] }> {
  return { contracts: ContractStorage.getContracts() };
}

export async function getContractDetail(address: string): Promise<any> {
  const contracts = ContractStorage.getContracts();
  const contract = contracts.find((c) => c.address.toLowerCase() === address.toLowerCase());
  if (contract) {
    const riskScore = (contract as any).riskScore ||
      (contract.status === "CRITICAL" ? 92 :
        contract.status === "HIGH" ? 78 :
          contract.status === "MEDIUM" ? 45 : 15);
    return { ...contract, riskScore };
  }
  return null;
}

export async function addContract(payload: any): Promise<DashboardContract> {
  // Use ContractStorage to save the contract locally
  const newContract = ContractStorage.addContract({
    name: payload.name || "Unknown",
    address: payload.address,
    chain: payload.chain,
    chainSelectorName: payload.chainSelectorName,
    tvl: "$0.0M", // Initial TVL
    riskLevel: (payload.initialAssessment?.riskLevel?.toLowerCase() as any) || "low",
    volatility: "0.0%",
    status: payload.initialAssessment?.riskLevel || "LOW",
    latestScan: payload.initialAssessment,
    priceFeeds: payload.priceFeeds,
    riskThresholds: payload.riskThresholds
  });

  return newContract;
}

export async function discoverContract(address: string, network: string) {
  return fetchJson<{ discovery: any; suggestedRequest: any; preliminaryAssessment: any }>(
    `${API_BASE_URL}/discover`,
    {
      method: "POST",
      body: JSON.stringify({ address, network }),
    }
  );
}

export async function runGeminiScan(payload?: {
  contractAddress?: string;
  chainSelectorName?: string;
  contractName?: string;
}) {
  const contracts = ContractStorage.getContracts();
  const response = await fetchJson<{ success: boolean; assessments: any[]; rawOutput?: string; error?: string }>(
    `${API_BASE_URL}/simulate`,
    {
      method: "POST",
      body: JSON.stringify({ contracts }),
    }
  );

  if (response.success && response.assessments.length > 0) {
    // Update local storage with new assessments
    response.assessments.forEach((assessment) => {
      ContractStorage.updateContract(assessment.contractAddress, {
        riskLevel: assessment.riskLevel.toLowerCase() as any,
        status: assessment.riskLevel,
        latestScan: {
          ...(assessment.latestScan || assessment),
          rawOutput: response.rawOutput // Store full logs context within each asset's scan data
        },
        metrics: assessment.metrics,
      });

      // If risk is high, add an alert
      if (assessment.riskLevel === "HIGH" || assessment.riskLevel === "CRITICAL") {
        ContractStorage.addAlert({
          timestamp: new Date().toISOString(),
          contract: assessment.contractAddress,
          contractName: contracts.find(c => c.address.toLowerCase() === assessment.contractAddress.toLowerCase())?.name || "Unknown",
          type: "High Risk Detected",
          description: assessment.reasoning || "Gemini detected high risk during scan.",
          severity: assessment.riskLevel.toLowerCase() as any,
          status: "active"
        });
      }
    });
    ContractStorage.updateSyncTimestamp();
  }

  return {
    data: {
      quotaExceeded: response.error?.includes("429")
    } as ScanResult,
    rawOutput: response.rawOutput
  };
}

export async function getAlerts(
  address?: string,
  severity?: string,
  limit: number = 50,
  offset: number = 0
): Promise<AlertPayload> {
  let alerts = ContractStorage.getAlerts();
  if (address) {
    alerts = alerts.filter(a => a.contract.toLowerCase() === address.toLowerCase());
  }
  if (severity) {
    alerts = alerts.filter(a => a.severity.toLowerCase() === severity.toLowerCase());
  }

  const total = alerts.length;
  alerts = alerts.slice(offset, offset + limit);

  return { alerts, total };
}

export async function getAlertEmail() {
  const email = typeof window !== "undefined" ? localStorage.getItem("chainguard_alert_email") : null;
  return { email };
}

export async function setAlertEmail(email: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("chainguard_alert_email", email);
  }
  return { success: true, email };
}

export async function acknowledgeAlert(alertId: string) {
  const alerts = ContractStorage.getAlerts();
  const index = alerts.findIndex(a => a.id === alertId);
  if (index !== -1) {
    alerts[index].status = "acknowledged";
    ContractStorage.saveAlerts(alerts);
  }
  return { success: true };
}

export async function resolveAlert(alertId: string) {
  const alerts = ContractStorage.getAlerts();
  const index = alerts.findIndex(a => a.id === alertId);
  if (index !== -1) {
    alerts[index].status = "resolved";
    ContractStorage.saveAlerts(alerts);
  }
  return { success: true };
}

export async function triggerTestEmail() {
  return { success: true, message: "Test alert simulated locally." };
}

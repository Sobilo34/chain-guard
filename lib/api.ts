import { ContractStorage } from "./storage";

export const API_BASE_URL = "/api/cre";

/** AI analysis / latest scan result stored per contract */
export type ContractScanResult = {
  reasoning?: string;
  cause?: string;
  consequences?: string;
  estimatedImpact?: string;
  mitigationStrategy?: string;
  nextSteps?: string[];
  suggestedActions?: string[];
  affectedMetrics?: string[];
  /** From optional post-CRE AI (Force Scan with runPostCREAi) */
  comprehensiveSummary?: {
    summary?: string;
    keyFindings?: string[];
    recommendations?: string[];
    rootCause?: string;
    potentialImpact?: string;
    nextSteps?: string[];
    suggestedActions?: string[];
  };
  riskType?: string;
  riskLevel?: string;
};

/** Parsed SENTINEL_ASSESSMENT from CRE simulation stdout */
export type SentinelAssessment = {
  contractAddress: string;
  riskLevel: string;
  riskScore: number;
  metrics?: {
    volatility?: number;
    tvl?: number;
    liquidity?: number;
    currentPrice?: number;
    priceChange24h?: number;
    [key: string]: any;
  };
  latestScan?: ContractScanResult;
  comprehensiveSummary?: {
    summary?: string;
    keyFindings?: string[];
    recommendations?: string[];
    rootCause?: string;
    potentialImpact?: string;
    nextSteps?: string[];
    suggestedActions?: string[];
  };
};

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
  latestScan?: ContractScanResult;
  riskScore?: number;
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
  /** Persisted Full Analysis (Pre-CRE + CRE + Post-CRE); shown until next analysis runs. */
  fullAnalysis?: AnalyzeResult;
  /** Tokens discovered when contract was added or when analysis ran; used for portfolio TVL. */
  discoveredTokens?: Array<{ address: string; symbol: string; decimals?: number }>;
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
  const norm = (a: string) => (a || "").toLowerCase().trim();
  const contract = contracts.find((c) => norm(c.address) === norm(address));
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
  const discoveredTokens = payload.discoveredTokens?.length
    ? payload.discoveredTokens.map((t: { address?: string; symbol?: string; decimals?: number }) => ({
        address: (t.address || "").trim(),
        symbol: (t.symbol || "?").trim(),
        decimals: t.decimals,
      })).filter((t: { address: string }) => t.address.length > 0)
    : undefined;
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
    riskThresholds: payload.riskThresholds,
    ...(discoveredTokens?.length ? { discoveredTokens } : {}),
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

/** AI-first full analysis: contract context → AI config → CRE run → post-CRE AI analysis (mainnet only) */
export type AnalyzeResult = {
  contractContext: any;
  initialAnalysis: { summary?: string; keyRisks?: string[]; recommendations?: string[] };
  creObservations: any;
  finalAnalysis: {
    summary?: string;
    keyFindings?: string[];
    comparisonWithPreCRE?: string;
    recommendations?: string[];
    rootCause?: string;
    potentialImpact?: string;
    nextSteps?: string[];
    suggestedActions?: string[];
  };
  aiChosenConfig?: { priceFeedPairs?: string[]; riskThresholds?: any; resolvedPriceFeeds?: any[] };
};

const ANALYZE_TIMEOUT_MS = 120_000; // 2 min for discover + pre-CRE + CRE + post-CRE

export async function runAnalyze(address: string, network: string): Promise<AnalyzeResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
  try {
    const out = await fetchJson<AnalyzeResult>(`${API_BASE_URL}/analyze`, {
      method: "POST",
      body: JSON.stringify({ address, network }),
      signal: controller.signal,
    });
    return out;
  } finally {
    clearTimeout(timeoutId);
  }
}

export type NeedMoreInfoQuestion = { id: string; label: string; placeholder?: string };

export type RunAnalyzeStreamCallbacks = {
  onNarrative: (text: string) => void;
  onResult: (result: AnalyzeResult) => void;
  onError: (message: string) => void;
  onNeedMoreInfo?: (questions: NeedMoreInfoQuestion[], message?: string) => void;
};

/** Consume the streaming analyze endpoint and invoke callbacks for each SSE event. */
export async function runAnalyzeStream(
  address: string,
  network: string,
  callbacks: RunAnalyzeStreamCallbacks,
  userContext?: Record<string, string>
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/analyze/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, network, ...(userContext && Object.keys(userContext).length > 0 ? { userContext } : {}) }),
    cache: "no-store",
  });
  if (!res.ok) {
    const raw = await res.text();
    callbacks.onError(raw || `API ${res.status}`);
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";
      for (const block of lines) {
        const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        try {
          const raw = dataLine.slice(5).trim();
          if (raw === "[DONE]" || raw === "") continue;
          const payload = JSON.parse(raw) as {
            type: string;
            text?: string;
            message?: string;
            result?: AnalyzeResult;
            questions?: NeedMoreInfoQuestion[];
          };
          if (payload.type === "narrative" && typeof payload.text === "string") {
            callbacks.onNarrative(payload.text);
          } else if (payload.type === "result" && payload.result) {
            callbacks.onResult(payload.result as AnalyzeResult);
          } else if (payload.type === "error" && typeof payload.message === "string") {
            callbacks.onError(payload.message);
          } else if (payload.type === "needMoreInfo" && Array.isArray(payload.questions) && payload.questions.length > 0 && callbacks.onNeedMoreInfo) {
            callbacks.onNeedMoreInfo(payload.questions, payload.message);
          }
        } catch {
          // skip malformed chunk
        }
      }
    }
    if (buffer.trim()) {
      const dataLine = buffer.split("\n").find((l) => l.startsWith("data:"));
      if (dataLine) {
        try {
          const raw = dataLine.slice(5).trim();
          const payload = JSON.parse(raw) as {
            type: string;
            text?: string;
            message?: string;
            result?: AnalyzeResult;
            questions?: NeedMoreInfoQuestion[];
          };
          if (payload.type === "narrative" && typeof payload.text === "string") {
            callbacks.onNarrative(payload.text);
          } else if (payload.type === "result" && payload.result) {
            callbacks.onResult(payload.result as AnalyzeResult);
          } else if (payload.type === "error" && typeof payload.message === "string") {
            callbacks.onError(payload.message);
          } else if (payload.type === "needMoreInfo" && Array.isArray(payload.questions) && payload.questions.length > 0 && callbacks.onNeedMoreInfo) {
            callbacks.onNeedMoreInfo(payload.questions, payload.message);
          }
        } catch {
          // skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Payload for a one-off CRE run (e.g. initial scan after add). Same shape as suggestedRequest from discover. */
export type InitialScanPayload = {
  address: string;
  name?: string;
  chainSelectorName?: string;
  riskThresholds?: Record<string, number>;
  priceFeeds?: Array<{ pairName: string; feedAddress: string; decimals?: number }>;
};

/** Run CRE for a single contract and update that contract in storage with the assessment. Used after add contract. */
export async function runInitialScanForContract(payload: InitialScanPayload): Promise<any | null> {
  const analyzeContract = {
    address: payload.address,
    name: payload.name || "Discovered Contract",
    chainSelectorName: payload.chainSelectorName || "ethereum-mainnet",
    riskThresholds: payload.riskThresholds || { depegTolerance: 0.02, volatilityMax: 0.15, liquidityDropMax: 0.25, collateralRatioMin: 1.5 },
    priceFeeds: (payload.priceFeeds?.length ? payload.priceFeeds : [{ pairName: "ETH/USD", feedAddress: "0x5f4eC3Dd9Bbd43714FE2740F5E3616155c5b8419", decimals: 8 }]).map((f) => ({ pairName: f.pairName, feedAddress: f.feedAddress, decimals: f.decimals ?? 8 })),
  };
  const response = await fetchJson<{ success: boolean; assessments: any[] }>(`${API_BASE_URL}/simulate`, {
    method: "POST",
    body: JSON.stringify({ analyzeContract }),
  });
  const assessment = response.assessments?.[0];
  if (response.success && assessment) {
    const addr = (assessment.contractAddress || payload.address).toLowerCase().trim();
    const with0x = addr.startsWith("0x") ? addr : `0x${addr}`;
    ContractStorage.updateContract(with0x, {
      riskLevel: (assessment.riskLevel || "LOW").toLowerCase() as any,
      status: assessment.riskLevel || "LOW",
      riskScore: assessment.riskScore,
      latestScan: assessment.latestScan || assessment,
      metrics: assessment.metrics,
    });
    return assessment;
  }
  return null;
}

export async function runGeminiScan(payload?: {
  contractAddress?: string;
  chainSelectorName?: string;
  contractName?: string;
  /** When true, run post-CRE AI for each assessment (adds comprehensiveSummary; can slow response). */
  runPostCREAi?: boolean;
}) {
  const contracts = ContractStorage.getContracts();
  const response = await fetchJson<{ success: boolean; assessments: any[]; rawOutput?: string; error?: string }>(
    `${API_BASE_URL}/simulate`,
    {
      method: "POST",
      body: JSON.stringify({ contracts, runPostCREAi: payload?.runPostCREAi === true }),
    }
  );

  const assessments = response.assessments ?? [];
  const normalizeAddr = (addr: string) => {
    if (!addr) return "";
    const a = addr.toLowerCase().trim();
    return a.startsWith("0x") ? a : `0x${a}`;
  };

  if (response.success && assessments.length > 0) {
    assessments.forEach((assessment: SentinelAssessment) => {
      const address = normalizeAddr(assessment.contractAddress);
      const cs = assessment.comprehensiveSummary;
      const latestScan = assessment.latestScan || (assessment as unknown as ContractScanResult);
      const withSummary: ContractScanResult = cs
        ? {
            ...latestScan,
            comprehensiveSummary: cs,
            reasoning: cs.summary ?? latestScan.reasoning,
            cause: cs.rootCause ?? latestScan.cause,
            consequences: cs.potentialImpact ?? latestScan.consequences,
            estimatedImpact: cs.potentialImpact ?? latestScan.estimatedImpact,
            mitigationStrategy: cs.recommendations?.length
              ? cs.recommendations.join("\n\n")
              : latestScan.mitigationStrategy,
            nextSteps: cs.nextSteps ?? latestScan.nextSteps,
            suggestedActions: cs.suggestedActions ?? latestScan.suggestedActions,
          }
        : latestScan;
      const updated = ContractStorage.updateContract(address, {
        riskLevel: assessment.riskLevel.toLowerCase() as any,
        status: assessment.riskLevel,
        riskScore: assessment.riskScore,
        latestScan: withSummary,
        metrics: assessment.metrics,
      });
      if (!updated) {
        console.warn("[runGeminiScan] No contract found for address:", address, "— ensure CRE config matches dashboard contracts.");
      }

      if (assessment.riskLevel === "HIGH" || assessment.riskLevel === "CRITICAL") {
        ContractStorage.addAlert({
          timestamp: new Date().toISOString(),
          contract: address,
          contractName: contracts.find(c => normalizeAddr(c.address) === address)?.name || "Unknown",
          type: "High Risk Detected",
          description: assessment.latestScan?.reasoning || "AI detected high risk during scan.",
          severity: assessment.riskLevel.toLowerCase() as any,
          status: "active"
        });
      }
    });
  }

  if (response.success) {
    ContractStorage.updateSyncTimestamp();
  }

  return {
    data: {
      quotaExceeded: response.error?.includes("429")
    } as ScanResult,
    success: response.success,
    assessmentsCount: assessments.length,
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

export async function deleteAlert(alertId: string) {
  const removed = ContractStorage.deleteAlert(alertId);
  return { success: removed };
}

export async function triggerTestEmail() {
  return { success: true, message: "Test alert simulated locally." };
}

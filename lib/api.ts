export const API_BASE_URL =
  process.env.NEXT_PUBLIC_CHAIN_GUARD_API_URL || "http://localhost:4100"

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

export type DashboardContract = {
  id: string
  name: string
  address: string
  tvl: string
  riskLevel: "low" | "medium" | "high"
  volatility: string
  chain: string
  chainSelectorName?: string
  status?: string
  lastUpdate?: string
}

export type DashboardAlert = {
  id: string
  timestamp: string
  contract: string
  contractName?: string
  description?: string
  type: string
  severity: "low" | "medium" | "high"
  status: "active" | "acknowledged" | "resolved"
}

export type OverviewPayload = {
  kpis: {
    monitoredContracts: number
    activeAlerts: number
    totalValueLocked: number
    riskScore: number
  }
  contracts: DashboardContract[]
  alerts: DashboardAlert[]
  system: {
    oracle: string
    riskEngine: string
    alertService: string
    lastSync: string
  }
}

export type ScanResult = {
  riskLevel: string
  riskType: string
  confidence: number
  reasoning: string
  suggestedActions: string[]
  affectedMetrics?: string[]
  estimatedImpact?: string
  source?: string
  quotaExceeded?: boolean
}

export interface AlertPayload {
  alerts: {
    id: string
    contractAddress: string
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    message: string
    details?: Record<string, any>
    timestamp: string
    resolved?: boolean
    resolvedAt?: string
  }[]
  total: number
}

export async function getOverview() {
  return fetchJson<{ data: OverviewPayload }>(`${API_BASE_URL}/api/overview`)
}

export async function getContracts() {
  return fetchJson<{ contracts: DashboardContract[] }>(`${API_BASE_URL}/api/contracts`)
}

export async function getContractDetail(address: string) {
  return fetchJson<any>(`${API_BASE_URL}/api/contracts/${address}/detail`)
}

export async function addContract(payload: {
  address: string
  chainSelectorName: string
  name?: string
  protocol?: string
}) {
  return fetchJson<DashboardContract>(`${API_BASE_URL}/api/contracts`, {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      protocol: payload.protocol || "Generic protocol",
      chain: payload.chainSelectorName,
    }),
  })
}

export async function runGeminiScan(payload?: {
  contractAddress?: string
  chainSelectorName?: string
  contractName?: string
}) {
  return fetchJson<{ data: ScanResult }>(`${API_BASE_URL}/api/scan`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  })
}

export async function getAlerts(
  address?: string,
  severity?: string,
  limit: number = 50,
  offset: number = 0
): Promise<AlertPayload> {
  const params = new URLSearchParams()
  if (address) params.append("address", address)
  if (severity) params.append("severity", severity)
  params.append("limit", limit.toString())
  params.append("offset", offset.toString())

  const response = await fetch(`${API_BASE_URL}/api/alerts?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

export async function acknowledgeAlert(alertId: string) {
  return fetchJson<{ success: boolean }>(`${API_BASE_URL}/api/alerts/${alertId}/acknowledge`, {
    method: "POST",
  })
}

export async function resolveAlert(alertId: string) {
  return fetchJson<{ success: boolean }>(`${API_BASE_URL}/api/alerts/${alertId}/resolve`, {
    method: "POST",
  })
}

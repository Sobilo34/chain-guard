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
    let message = res.statusText || "Request failed"
    try {
      const raw = await res.text()
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          message =
            (parsed && (parsed.error || parsed.message)) ||
            raw
        } catch {
          message = raw
        }
      }
    } catch {
      // ignore body parsing errors and fall back to statusText
    }
    throw new Error(`API ${res.status}: ${message}`)
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
  chain: string
  chainSelectorName?: string
  chainName?: string
  rpcUrl?: string
  chainId?: number
  name?: string
  protocol: string
  riskThresholds?: {
    volatility: number
    liquidity: number
    concentration: number
    overall?: number
  }
  priceFeeds?: { asset: string; feedAddress: string; decimals?: number }[]
  alertChannels?: Array<"email">
}) {
  const response = await fetchJson<{ data: DashboardContract }>(
    `${API_BASE_URL}/api/contracts`,
    {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        protocol: payload.protocol || "Normal",
        alertChannels: payload.alertChannels?.length ? payload.alertChannels : ["email"],
      }),
    },
  )
  return response.data
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

export async function getAlertEmail() {
  return fetchJson<{ email: string | null }>(`${API_BASE_URL}/api/notifications/email`)
}

export async function setAlertEmail(email: string) {
  return fetchJson<{ success: boolean; email: string }>(`${API_BASE_URL}/api/notifications/email`, {
    method: "PUT",
    body: JSON.stringify({ email }),
  })
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

export async function triggerTestEmail() {
  return fetchJson<{ success: boolean; message: string }>(
    `${API_BASE_URL}/api/notifications/test`,
    {
      method: "POST",
    }
  );
}

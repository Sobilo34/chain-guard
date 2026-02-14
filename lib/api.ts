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

export async function getOverview() {
  return fetchJson<{ data: OverviewPayload }>(`${API_BASE_URL}/api/overview`)
}

export async function getContracts() {
  return fetchJson<{ data: DashboardContract[] }>(`${API_BASE_URL}/api/contracts`)
}

export async function addContract(payload: {
  address: string
  chainSelectorName: string
  name?: string
}) {
  return fetchJson<{ data: DashboardContract }>(`${API_BASE_URL}/api/contracts`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function runGeminiScan(payload?: {
  contractAddress?: string
  chainSelectorName?: string
  contractName?: string
}) {
  return fetchJson<{ data: unknown }>(`${API_BASE_URL}/api/scan`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  })
}

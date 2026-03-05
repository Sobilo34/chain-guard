/**
 * Etherscan-style block explorer API (v2 multichain).
 * Fetches ABI and verified source for enhanced discovery.
 * Uses ETHERSCAN_API_KEY env for rate limits; falls back without key.
 */

const V2_BASE = "https://api.etherscan.io/v2/api";

const NETWORK_TO_CHAIN_ID: Record<string, number> = {
    ethereumMainnet: 1,
    mainnet: 1,
    polygonMainnet: 137,
    arbitrumMainnet: 42161,
    optimismMainnet: 10,
    baseMainnet: 8453,
};

const CHAIN_ID_TO_EXPLORER_URL: Record<number, string> = {
    1: "https://etherscan.io",
    137: "https://polygonscan.com",
    42161: "https://arbiscan.io",
    10: "https://optimistic.etherscan.io",
    8453: "https://basescan.org",
};

/** Blockscout explorer base URLs per chain (for contract/view links). */
const CHAIN_ID_TO_BLOCKSCOUT: Record<number, string> = {
    1: "https://eth.blockscout.com",
    137: "https://polygon.blockscout.com",
    42161: "https://arbitrum.blockscout.com",
    10: "https://optimism.blockscout.com",
    8453: "https://base.blockscout.com",
};

const SOURCE_SUMMARY_MAX_CHARS = 8000;

export function getChainIdForNetwork(network: string): number | undefined {
    const key = network.replace(/-/g, "");
    if (NETWORK_TO_CHAIN_ID[key] !== undefined) return NETWORK_TO_CHAIN_ID[key];
    const lower = network.toLowerCase();
    if (lower.includes("ethereum") && lower.includes("main")) return 1;
    if (lower.includes("polygon")) return 137;
    if (lower.includes("arbitrum")) return 42161;
    if (lower.includes("optimism")) return 10;
    if (lower.includes("base")) return 8453;
    return NETWORK_TO_CHAIN_ID[network] ?? undefined;
}

export function getExplorerUrl(network: string, address: string): string | undefined {
    const chainId = getChainIdForNetwork(network);
    if (!chainId) return undefined;
    const base = CHAIN_ID_TO_EXPLORER_URL[chainId] ?? "https://etherscan.io";
    return `${base}/address/${address}`;
}

/** Blockscout address URL for the given network (e.g. "Ethereum Mainnet"). */
export function getBlockscoutAddressUrl(network: string, address: string): string | undefined {
    const chainId = getChainIdForNetwork(network);
    if (!chainId) return undefined;
    const base = CHAIN_ID_TO_BLOCKSCOUT[chainId];
    if (!base) return undefined;
    const addr = address.startsWith("0x") ? address : `0x${address}`;
    return `${base}/address/${addr}`;
}

async function explorerGet(params: Record<string, string>): Promise<{ result?: string; status?: string; message?: string }> {
    const url = new URL(V2_BASE);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (apiKey) url.searchParams.set("apikey", apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) {
        if (res.status === 403 || res.status === 429) return { status: "0", message: "Rate limited or forbidden" };
        throw new Error(`Explorer API ${res.status}`);
    }
    return res.json();
}

/**
 * Fetch contract ABI (verified contracts only). Returns parsed ABI or undefined.
 */
export async function fetchContractAbi(address: string, network: string): Promise<object[] | undefined> {
    const chainId = getChainIdForNetwork(network);
    if (chainId === undefined) return undefined;

    try {
        const data = await explorerGet({
            chainid: String(chainId),
            module: "contract",
            action: "getabi",
            address,
        });
        if (data.status !== "1" || typeof data.result !== "string") return undefined;
        const parsed = JSON.parse(data.result) as unknown;
        return Array.isArray(parsed) ? parsed : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Fetch verified source code. Returns a truncated summary for AI (cap size).
 */
export async function fetchContractSource(address: string, network: string): Promise<{ sourceSummary: string } | undefined> {
    const chainId = getChainIdForNetwork(network);
    if (chainId === undefined) return undefined;

    try {
        const data = await explorerGet({
            chainid: String(chainId),
            module: "contract",
            action: "getsourcecode",
            address,
        });
        if (data.status !== "1") return undefined;
        let raw = data.result as unknown;
        if (typeof raw === "string") {
            try {
                raw = JSON.parse(raw) as unknown;
            } catch {
                return undefined;
            }
        }
        if (!raw || !Array.isArray(raw) || raw.length === 0) return undefined;
        const first = raw[0];
        const source = first?.SourceCode ?? first?.sourceCode ?? "";
        const contractName = first?.ContractName ?? first?.contractName ?? "";
        if (!source) return undefined;

        let text = contractName ? `Contract: ${contractName}\n\n` : "";
        const src = typeof source === "string" ? source : JSON.stringify(source);
        text += src.length > SOURCE_SUMMARY_MAX_CHARS ? src.slice(0, SOURCE_SUMMARY_MAX_CHARS) + "\n...[truncated]" : src;
        return { sourceSummary: text };
    } catch {
        return undefined;
    }
}

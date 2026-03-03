import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi, formatUnits, type Address } from "viem";
import { mainnet, arbitrum, optimism, base, polygon } from "viem/chains";
import { getPricesFromChainlink, getNativeSymbolForNetwork } from "@/lib/cre/chainlink-prices";
import { getTokensForNetwork } from "@/lib/cre/tokens";

const NETWORKS: Record<string, { chain: any }> = {
  ethereumMainnet: { chain: mainnet },
  mainnet: { chain: mainnet },
  arbitrumMainnet: { chain: arbitrum },
  optimismMainnet: { chain: optimism },
  baseMainnet: { chain: base },
  polygonMainnet: { chain: polygon },
};

/** Chain id / name for DefiLlama fallback (when no Chainlink feed) */
const CHAIN_ID_FOR_LLAMA: Record<string, string> = {
  ethereumMainnet: "ethereum",
  mainnet: "ethereum",
  arbitrumMainnet: "arbitrum",
  optimismMainnet: "optimism",
  baseMainnet: "base",
  polygonMainnet: "polygon",
};

/** Symbol alias for price lookup (e.g. WMATIC uses MATIC feed, WBTC uses BTC) */
const PRICE_SYMBOL_ALIAS: Record<string, string> = {
  WMATIC: "MATIC",
  WETH: "ETH",
  WBTC: "BTC",
};

/**
 * Fallback: fetch token price from DefiLlama (free tier, no API key).
 * Used only when Chainlink feed is not available for that symbol/network.
 */
async function fetchPriceFromDefiLlama(
  chainId: string,
  tokenAddress: string
): Promise<number | null> {
  try {
    const key = `${chainId}:${tokenAddress.toLowerCase()}`;
    const urls = [
      `https://pro-api.llama.fi/coins/prices/current/${encodeURIComponent(key)}`,
      `https://coins.llama.fi/prices/current/${encodeURIComponent(key)}`,
    ];
    for (const url of urls) {
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (!res.ok) continue;
      const data = await res.json();
      const coin = data?.coins?.[key];
      const price = coin?.price;
      if (typeof price === "number" && price > 0) return price;
    }
    return null;
  } catch {
    return null;
  }
}

type TokenEntry = { address: string; symbol: string; decimals?: number };

async function computePortfolio(
  client: ReturnType<typeof createPublicClient>,
  network: string,
  contractAddress: Address,
  tokenList: TokenEntry[]
): Promise<{ tvl: number; price: number; volume24h: null; liquidity: null }> {
  const nativeSymbol = getNativeSymbolForNetwork(network);
  const symbolsToFetch = [
    nativeSymbol,
    ...tokenList.map((t) => PRICE_SYMBOL_ALIAS[t.symbol] || t.symbol),
  ];
  const prices = await getPricesFromChainlink(client, network, [...new Set(symbolsToFetch)]);

  const balance = await client.getBalance({ address: contractAddress });
  const nativeBalanceNum = parseFloat(formatUnits(balance, 18));
  const nativePrice = prices[nativeSymbol] ?? null;
  let tvlUsd = nativePrice != null ? nativeBalanceNum * nativePrice : 0;

  const abi = parseAbi([
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ]);
  const llamaChain = CHAIN_ID_FOR_LLAMA[network] || "ethereum";

  for (const token of tokenList) {
    try {
      const [tBalance, tDecimals] = await Promise.all([
        client.readContract({
          address: token.address as Address,
          abi,
          functionName: "balanceOf",
          args: [contractAddress],
        }),
        client.readContract({
          address: token.address as Address,
          abi,
          functionName: "decimals",
        }),
      ]);
      if (tBalance > BigInt(0)) {
        const human = parseFloat(formatUnits(tBalance, tDecimals));
        const symbolForPrice = PRICE_SYMBOL_ALIAS[token.symbol] || token.symbol;
        let price = prices[token.symbol] ?? prices[symbolForPrice];
        if (price == null || price <= 0) {
          const fallback = await fetchPriceFromDefiLlama(llamaChain, token.address);
          price = fallback ?? 0;
        }
        tvlUsd += human * price;
      }
    } catch {
      // skip failed token
    }
  }

  return {
    tvl: Math.round(tvlUsd * 100) / 100,
    price: tvlUsd > 0 ? 1 : 0,
    volume24h: null,
    liquidity: null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const network = searchParams.get("network") || "ethereumMainnet";

    if (!address || !address.startsWith("0x")) {
      return NextResponse.json({ error: "Valid address is required" }, { status: 400 });
    }

    const netConfig = NETWORKS[network] || NETWORKS.ethereumMainnet;
    const client = createPublicClient({
      chain: netConfig.chain,
      transport: http(),
    });
    const contractAddress = address as Address;

    const code = await client.getBytecode({ address: contractAddress });
    if (!code || code === "0x") {
      return NextResponse.json({ tvl: 0, price: 0, volume24h: null, liquidity: null });
    }

    const tokenList = getTokensForNetwork(network);
    const result = await computePortfolio(client, network, contractAddress, tokenList);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Portfolio fetch failed", error);
    return NextResponse.json(
      { error: error?.message || "Portfolio fetch failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const address = (body.address ?? req.nextUrl?.searchParams?.get("address")) as string | null;
    const network = (body.network ?? req.nextUrl?.searchParams?.get("network")) || "ethereumMainnet";
    const tokens = Array.isArray(body.tokens) ? body.tokens as TokenEntry[] : undefined;

    if (!address || !address.startsWith("0x")) {
      return NextResponse.json({ error: "Valid address is required" }, { status: 400 });
    }

    const netConfig = NETWORKS[network] || NETWORKS.ethereumMainnet;
    const client = createPublicClient({
      chain: netConfig.chain,
      transport: http(),
    });
    const contractAddress = address as Address;

    const code = await client.getBytecode({ address: contractAddress });
    if (!code || code === "0x") {
      return NextResponse.json({ tvl: 0, price: 0, volume24h: null, liquidity: null });
    }

    const tokenList =
      tokens?.length > 0
        ? tokens.map((t) => ({
            address: (t.address || "").trim(),
            symbol: (t.symbol || "?").trim(),
            decimals: t.decimals,
          }))
        : getTokensForNetwork(network);

    const result = await computePortfolio(client, network, contractAddress, tokenList);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Portfolio fetch failed", error);
    return NextResponse.json(
      { error: error?.message || "Portfolio fetch failed" },
      { status: 500 }
    );
  }
}

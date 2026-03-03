/**
 * Fetch token/native prices dynamically from Chainlink Data Feeds on-chain.
 * No .env or API keys required; uses public RPC and Chainlink feed contracts.
 */
import { type PublicClient, type Address, parseAbi } from "viem";
import { getWellKnownFeeds } from "./feeds";

const AGGREGATOR_ABI = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
]);

/**
 * Get USD prices for the given symbols by reading Chainlink price feeds on the provided chain.
 * Returns a map of symbol -> price (USD, human-readable). Missing or failed feeds are omitted.
 */
export async function getPricesFromChainlink(
  client: PublicClient,
  network: string,
  symbols: string[]
): Promise<Record<string, number>> {
  const feeds = getWellKnownFeeds(network);
  const result: Record<string, number> = {};

  await Promise.all(
    symbols.map(async (symbol) => {
      const feedAddress = feeds[symbol];
      if (!feedAddress) return;
      try {
        const [roundData, decimals] = await Promise.all([
          client.readContract({
            address: feedAddress as Address,
            abi: AGGREGATOR_ABI,
            functionName: "latestRoundData",
          }),
          client.readContract({
            address: feedAddress as Address,
            abi: AGGREGATOR_ABI,
            functionName: "decimals",
          }),
        ]);
        const answer = roundData?.[1];
        const decimalsVal = Number(decimals ?? 8);
        if (answer != null && Number.isFinite(Number(answer))) {
          const price = Number(answer) / Math.pow(10, decimalsVal);
          if (price > 0 && Number.isFinite(price)) result[symbol] = price;
        }
      } catch {
        // Feed not available or RPC error; skip this symbol
      }
    })
  );

  return result;
}

/** Map native asset symbol per network for feed lookup */
export function getNativeSymbolForNetwork(network: string): string {
  const net = network.toLowerCase();
  if (net.includes("polygon")) return "MATIC";
  return "ETH";
}

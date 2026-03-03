/**
 * Shared token list per network for portfolio TVL and discovery.
 * Used to automatically detect holdings for any contract (no per-contract config).
 * Add tokens here to support more protocols (e.g. Harvest, vaults, pools).
 */
export type TokenEntry = { address: string; symbol: string };

export function getTokensForNetwork(network: string): TokenEntry[] {
  const net = network.toLowerCase();
  if (net.includes("mainnet")) {
    if (net.includes("polygon")) {
      return [
        { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", symbol: "USDC" },
        { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT" },
        { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", symbol: "WMATIC" },
      ];
    }
    if (net.includes("arbitrum")) {
      return [
        { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH" },
        { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC" },
        { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT" },
        { address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", symbol: "WBTC" },
      ];
    }
    if (net.includes("optimism")) {
      return [
        { address: "0x4200000000000000000000000000000000000006", symbol: "WETH" },
        { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC" },
        { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT" },
      ];
    }
    if (net.includes("base")) {
      return [
        { address: "0x4200000000000000000000000000000000000006", symbol: "WETH" },
        { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC" },
      ];
    }
    // Ethereum mainnet: broad list so any contract (USDT, Harvest, vaults, etc.) is covered
    return [
      { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH" },
      { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC" },
      { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK" },
      { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC" },
      { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT" },
      { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI" },
    ];
  }
  return [];
}

/**
 * Mainnet-only: well-known Chainlink price feed addresses per network.
 * Used by discover and analyze to resolve pair names to feed addresses.
 */
export function getWellKnownFeeds(network: string): Record<string, string> {
  const net = network.toLowerCase();
  if (net.includes("polygon") && net.includes("mainnet")) {
    return {
      MATIC: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
      USDC: "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7",
      USDT: "0x0A6513e40db6EB1b56575338b3F72888A096283A",
      ETH: "0xF9680D99D6C9589e2a93a78A04A279e509205945",
    };
  }
  if (net.includes("mainnet")) {
    return {
      LINK: "0x2c1d072e956affC0D435Cb7AC38EF18d24d9127c",
      USDC: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
      USDT: "0x3E7d1eA13978982C58110906476e3FFf87208e59",
      DAI: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee5",
      ETH: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    };
  }
  return {};
}

/** Resolve pair name (e.g. "ETH/USD") to symbol for feed lookup */
export function pairToSymbol(pairName: string): string {
  const part = pairName.split("/")[0];
  return part?.trim() || "";
}

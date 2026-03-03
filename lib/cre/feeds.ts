/**
 * Well-known Chainlink price feed addresses per network.
 * Used by discover, analyze, and dynamic portfolio pricing (no .env required).
 * Sources: Chainlink Data Feeds documentation and data.chain.link.
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
  if (net.includes("arbitrum") && net.includes("mainnet")) {
    return {
      ETH: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
      USDC: "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3",
      USDT: "0x3f3f5dF88dC9F0e7bb59f5979486690d866eA8cA",
      LINK: "0x86E53CF1B870786351Da77A57575e71909587804",
    };
  }
  if (net.includes("optimism") && net.includes("mainnet")) {
    return {
      ETH: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
      USDC: "0x16a9FA2FDa030272Ce99B29CF780dFA30363E081",
      USDT: "0xECef79E109e997bCA29c1c1837f492D208346401",
      LINK: "0xCc232dcFAAE6354cE191Bd574108c1aD03f86475",
    };
  }
  if (net.includes("base") && net.includes("mainnet")) {
    return {
      ETH: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
      USDC: "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B",
    };
  }
  if (net.includes("mainnet") || net.includes("ethereum")) {
    return {
      LINK: "0x2c1d072e956affC0D435Cb7AC38EF18d24d9127c",
      USDC: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
      USDT: "0x3E7d1eA13978982C58110906476e3FFf87208e59",
      DAI: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee5",
      ETH: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      BTC: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
      SNX: "0xDC3EA94CD0AC27d9A86C180091e7f78C683d3699",
    };
  }
  return {};
}

/** Resolve pair name (e.g. "ETH/USD") to symbol for feed lookup */
export function pairToSymbol(pairName: string): string {
  const part = pairName.split("/")[0];
  return part?.trim() || "";
}

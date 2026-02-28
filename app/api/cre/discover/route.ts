import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi, Address, formatUnits } from "viem";
import { mainnet, arbitrum, optimism, base, polygon } from "viem/chains";
import { getWellKnownFeeds } from "@/lib/cre/feeds";

// Configuration – mainnet only
const EIP1967_IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

const NETWORKS: Record<string, any> = {
    ethereumMainnet: { chain: mainnet, name: "Ethereum Mainnet", selector: "ethereum-mainnet" },
    mainnet: { chain: mainnet, name: "Ethereum Mainnet", selector: "ethereum-mainnet" },
    arbitrumMainnet: { chain: arbitrum, name: "Arbitrum Mainnet", selector: "arbitrum-mainnet" },
    optimismMainnet: { chain: optimism, name: "Optimism Mainnet", selector: "optimism-mainnet" },
    baseMainnet: { chain: base, name: "Base Mainnet", selector: "base-mainnet" },
    polygonMainnet: { chain: polygon, name: "Polygon Mainnet", selector: "polygon-mainnet" },
};

export async function POST(req: NextRequest) {
    try {
        const { address, network } = await req.json();

        if (!address) {
            return NextResponse.json({ error: "Address is required" }, { status: 400 });
        }

        const netConfig = NETWORKS[network] || NETWORKS.ethereumMainnet;
        const client = createPublicClient({
            chain: netConfig.chain,
            transport: http(),
        });

        const contractAddress = address as Address;

        // 1. Detect Bytecode
        const code = await client.getBytecode({ address: contractAddress });
        if (!code || code === "0x") {
            return NextResponse.json({ error: "Address is an EOA or not a contract" }, { status: 400 });
        }

        // 2. Fetch Native Balance
        const balance = await client.getBalance({ address: contractAddress });
        const nativeBalance = {
            symbol: network.toLowerCase().includes("polygon") ? "MATIC" : "ETH",
            balance: formatUnits(balance, 18),
            balanceRaw: balance.toString()
        };

        // 3. Detect Proxy Type
        let type: "Normal" | "Proxy" | "Diamond" = "Normal";
        let implementation: string | undefined;

        const storage = await client.getStorageAt({
            address: contractAddress,
            slot: EIP1967_IMPLEMENTATION_SLOT,
        });

        if (storage && storage !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            implementation = `0x${storage.slice(-40)}`;
            type = "Proxy";
        } else {
            try {
                const diamondAbi = parseAbi(["function facets() view returns (tuple(address facetAddress, bytes4[] functionSelectors)[])"]);
                await client.readContract({
                    address: contractAddress,
                    abi: diamondAbi,
                    functionName: "facets"
                });
                type = "Diamond";
            } catch (e) { }
        }

        // 4. Discover Common Tokens
        const commonTokens = getCommonTokens(network);
        const tokens: any[] = [];
        const abi = parseAbi([
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)"
        ]);

        for (const token of commonTokens) {
            try {
                const [tBalance, tDecimals, tSymbol] = await Promise.all([
                    client.readContract({ address: token as Address, abi, functionName: "balanceOf", args: [contractAddress] }),
                    client.readContract({ address: token as Address, abi, functionName: "decimals" }),
                    client.readContract({ address: token as Address, abi, functionName: "symbol" })
                ]);

                if (tBalance > BigInt(0)) {
                    tokens.push({
                        symbol: tSymbol,
                        address: token,
                        balance: formatUnits(tBalance, tDecimals),
                        balanceRaw: tBalance.toString(),
                        decimals: tDecimals
                    });
                }
            } catch (e) { }
        }

        // 5. AI Insights if OpenRouter API key available
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        let name = "Discovered Contract";
        let suggestions = [];

        if (OPENROUTER_API_KEY) {
            try {
                const prompt = `
          Analyze this smart contract discovery result and provide:
          1. A likely name for the protocol.
          2. Suggestions for risk monitoring.
          
          Address: ${address}
          Network: ${network}
          Type: ${type}
          Native Balance: ${nativeBalance.balance} ${nativeBalance.symbol}
          Tokens Held: ${JSON.stringify(tokens.map(t => ({ symbol: t.symbol, balance: t.balance })))}
          
          Return ONLY a JSON object: { "name": "Protocol Name", "suggestions": ["suggestion 1"] }
        `;

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                        "HTTP-Referer": "https://chainguard.sentinel",
                        "X-Title": "ChainGuard Sentinel",
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.0-flash-001",
                        messages: [{ role: "user", content: prompt }],
                        response_format: { type: "json_object" }
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    const text = data.choices?.[0]?.message?.content || "";
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        name = parsed.name || name;
                        suggestions = parsed.suggestions || [];
                    }
                }
            } catch (e) {
                console.error("AI Insights failed", e);
            }
        }

        // 6. Map detected tokens + native balance to data feeds (Chainlink or other). All detected feeds are used by CRE for alerts.
        const wellKnownFeeds = getWellKnownFeeds(network);
        const priceFeeds: Array<{ pairName: string; feedAddress: string; decimals: number }> = [];

        for (const t of tokens) {
            const feedAddr = wellKnownFeeds[t.symbol];
            if (feedAddr) {
                priceFeeds.push({
                    pairName: `${t.symbol}/USD`,
                    feedAddress: feedAddr,
                    decimals: 8,
                });
            }
        }
        if (wellKnownFeeds[nativeBalance.symbol]) {
            priceFeeds.push({
                pairName: `${nativeBalance.symbol}/USD`,
                feedAddress: wellKnownFeeds[nativeBalance.symbol],
                decimals: 8,
            });
        }

        const discovery = {
            address,
            name,
            type,
            implementation,
            tokens,
            nativeBalance,
            dataFeedsDetected: priceFeeds.map((f) => ({ pairName: f.pairName, feedAddress: f.feedAddress })),
        };

        const hasStablecoin = priceFeeds.some((f) => ["USDC/USD", "USDT/USD", "DAI/USD"].includes(f.pairName));

        const suggestedRequest = {
            address,
            name,
            protocol: type === "Normal" ? "Generic" : type,
            chain: network,
            chainSelectorName: netConfig.selector,
            chainName: netConfig.name,
            priceFeeds,
            riskThresholds: {
                volatilityMax: 0.15,
                liquidityDropMax: 0.2,
                depegTolerance: hasStablecoin ? 0.01 : 0.05,
                collateralRatioMin: 1.5,
            },
        };

        const preliminaryAssessment = {
            riskLevel: "LOW",
            riskType: "CUSTOM",
            confidence: 50,
            reasoning: `Initial scan for ${name} on ${netConfig.name}. Detected assets: ${nativeBalance.balance} ${nativeBalance.symbol} and ${tokens.length} tokens.`,
            cause: "Initial Discovery",
            consequences: "Calibrating risk thresholds.",
            nextSteps: ["Wait for monitoring"],
            suggestedActions: ["Monitor balances"],
            affectedMetrics: ["tvl"],
            estimatedImpact: "None",
            mitigationStrategy: "Automated monitoring enabled"
        };

        return NextResponse.json({
            discovery,
            suggestedRequest,
            preliminaryAssessment
        });

    } catch (error: any) {
        console.error("Discovery failed", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function getCommonTokens(network: string): string[] {
    const net = network.toLowerCase();
    if (net.includes("mainnet")) {
        if (net.includes("polygon")) {
            return [
                "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC
                "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // USDT
                "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
            ];
        }
        return [
            "0x514910771af9ca656af840dff83e8264ecf986ca", // LINK
            "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
            "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
            "0x6B175474E89094C44Da98b954EedeAC495271d0F",   // DAI
        ];
    }
    return [];
}


import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi, Address, formatUnits } from "viem";
import { sepolia, mainnet, arbitrum, optimism, base, polygon } from "viem/chains";

// Configuration
const EIP1967_IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

const NETWORKS: Record<string, any> = {
    sepolia: { chain: sepolia, name: "Ethereum Sepolia", selector: "ethereum-testnet-sepolia" },
    ethereumMainnet: { chain: mainnet, name: "Ethereum Mainnet", selector: "ethereum-mainnet" },
    arbitrumMainnet: { chain: arbitrum, name: "Arbitrum Mainnet", selector: "arbitrum-mainnet" },
    optimismMainnet: { chain: optimism, name: "Optimism Mainnet", selector: "optimism-mainnet" },
    baseMainnet: { chain: base, name: "Base Mainnet", selector: "base-mainnet" },
    polygonMainnet: { chain: polygon, name: "Polygon Mainnet", selector: "polygon-mainnet" },
    arbitrumSepolia: { chain: arbitrum, name: "Arbitrum Sepolia", selector: "arbitrum-testnet-sepolia" },
    optimismSepolia: { chain: optimism, name: "Optimism Sepolia", selector: "optimism-testnet-sepolia" },
    baseSepolia: { chain: base, name: "Base Sepolia", selector: "base-testnet-sepolia" },
    polygonAmoy: { chain: polygon, name: "Polygon Amoy", selector: "polygon-testnet-amoy" },
};

export async function POST(req: NextRequest) {
    try {
        const { address, network } = await req.json();

        if (!address) {
            return NextResponse.json({ error: "Address is required" }, { status: 400 });
        }

        const netConfig = NETWORKS[network] || NETWORKS.sepolia;
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

        // 6. Map to Feeds
        const wellKnownFeeds = getWellKnownFeeds(network);
        const priceFeeds = tokens
            .filter(t => wellKnownFeeds[t.symbol])
            .map(t => ({
                asset: t.symbol,
                feedAddress: wellKnownFeeds[t.symbol],
                decimals: 8 // Chainlink USD feeds are usually 8 decimals
            }));

        // Add native feed if available
        if (wellKnownFeeds[nativeBalance.symbol]) {
            priceFeeds.push({
                asset: nativeBalance.symbol,
                feedAddress: wellKnownFeeds[nativeBalance.symbol],
                decimals: 8
            });
        }

        const discovery = {
            address,
            name,
            type,
            implementation,
            tokens,
            suggestedFeeds: priceFeeds,
            nativeBalance
        };

        // Find depeg feed if any
        const depegFeed = priceFeeds.find(f => f.asset === 'USDC' || f.asset === 'USDT' || f.asset === 'DAI');

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
                liquidityDropMax: 0.20,
                depegTolerance: depegFeed ? 0.01 : 0.05,
                collateralRatioMin: 1.5,
            }
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
    if (net === "sepolia" || net.includes("sepolia")) {
        return [
            "0x779877A7B0D9E8603169DdbD7836e478b4624789", // LINK
            "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
            "0x94a101C247558622CB1837F8E3C5791E8e384C66", // USDC
        ];
    } else if (net.includes("mainnet")) {
        return [
            "0x514910771af9ca656af840dff83e8264ecf986ca", // LINK
            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
            "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
        ];
    }
    return [];
}

function getWellKnownFeeds(network: string): Record<string, string> {
    const net = network.toLowerCase();
    if (net.includes("sepolia")) {
        return {
            LINK: "0xc59E35335d05115184891401E7A4468f70217d03",
            UNI: "0x103734a340F66373e33Be57aB7242138a0D03De5",
            USDC: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E",
            ETH: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
            MATIC: "0x001382149eBa3441043c1c66972b4772963f5D43",
        };
    } else if (net.includes("mainnet")) {
        return {
            LINK: "0x2c1d072e956affC0D435Cb7AC38EF18d24d9127c",
            USDC: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
            USDT: "0x3E7d1eA13978D9E831cf0AF209A321Aa333D7266",
            ETH: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
        };
    }
    return {};
}

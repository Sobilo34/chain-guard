"use client";

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  mainnet,
  arbitrum,
  polygon,
  optimism,
  sepolia,
  type AppKitNetwork,
} from "@reown/appkit/networks";
import { http } from "viem";
import {
  WagmiProvider,
  type Config,
  createStorage,
  cookieStorage,
} from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { type ReactNode } from "react";

// Use Alchemy (or custom) Sepolia RPC when set — faster and more reliable for CRE consumer chain.
const sepoliaRpcUrl =
  typeof process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL === "string" && process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL.trim()
    ? process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL.trim()
    : undefined;

// 1. Get projectId from https://cloud.reown.com
const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ||
  "847d344b1c7f53a165a25ec88a0b0d3e"; // Placeholder

// 2. Create a metadata object - optional
const metadata = {
  name: "ChainGuard Sentinel",
  description: "AI-Powered Smart Contract Risk Monitor",
  url: "https://chainguard.sentinel",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// 3. Set the networks (Sepolia = CRE consumer for onchain risk analysis)
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  arbitrum,
  polygon,
  optimism,
  sepolia,
];

// 4. Create Wagmi Adapter (custom Sepolia RPC when NEXT_PUBLIC_SEPOLIA_RPC_URL or Alchemy is set)
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  ...(sepoliaRpcUrl && {
    transports: {
      [sepolia.id]: http(sepoliaRpcUrl),
    },
  }),
});

// 5. Create modal
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  themeMode: "dark",
  features: {
    analytics: true,
    onramp: false,
    swaps: false,
  },
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

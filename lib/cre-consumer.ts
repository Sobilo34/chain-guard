/**
 * ChainGuard CRE consumer contract integration.
 * Request risk analysis onchain (triggers CRE workflow) and read results.
 * No backend: all flow is Frontend → Smart Contract → CRE (onchain).
 */

import {
  CHAINGUARD_CRE_CONSUMER_ABI,
  RISK_LEVEL_LABELS,
} from "./cre-consumer-abi";

export const CRE_CONSUMER_ADDRESS = (typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_CHAINGUARD_CRE_CONSUMER_ADDRESS as `0x${string}`)
  : process.env.NEXT_PUBLIC_CHAINGUARD_CRE_CONSUMER_ADDRESS as `0x${string}`) || "0x0000000000000000000000000000000000000000";

/** Chain where the CRE consumer contract is deployed (e.g. Sepolia = 11155111). */
export const CRE_CONSUMER_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CRE_CONSUMER_CHAIN_ID || "11155111");

export type OnchainAssessment = {
  contractAddress: string;
  chainSelectorName: string;
  riskLevel: number;
  riskLevelLabel: string;
  riskScore: bigint;
  summary: string;
  filled: boolean;
};

export function parseOnchainAssessment(result: readonly [string, string, number, bigint, string, boolean]): OnchainAssessment {
  const [contractAddress, chainSelectorName, riskLevel, riskScore, summary, filled] = result;
  return {
    contractAddress,
    chainSelectorName,
    riskLevel,
    riskLevelLabel: RISK_LEVEL_LABELS[riskLevel] ?? "LOW",
    riskScore,
    summary,
    filled,
  };
}

export { CHAINGUARD_CRE_CONSUMER_ABI, RISK_LEVEL_LABELS };

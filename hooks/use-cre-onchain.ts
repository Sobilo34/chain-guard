"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  usePublicClient,
} from "wagmi";
import { decodeEventLog } from "viem";
import {
  CHAINGUARD_CRE_CONSUMER_ABI,
  CRE_CONSUMER_ADDRESS,
  CRE_CONSUMER_CHAIN_ID,
  parseOnchainAssessment,
  type OnchainAssessment,
} from "@/lib/cre-consumer";

/**
 * Request onchain risk analysis via ChainGuardCREConsumer.
 * Triggers CRE workflow (EVM log → CRE runs → report written onchain).
 * Returns requestId; use useCREAssessment(requestId) to poll or listen for result.
 */
export function useRequestCREAnalysis() {
  const { address: walletAddress, chain } = useAccount();
  const publicClient = usePublicClient();
  const [lastRequestId, setLastRequestId] = useState<`0x${string}` | null>(null);

  const { writeContract, data: hash, isPending, isSuccess, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const requestAnalysis = useCallback(
    async (contractAddress: string, chainSelectorName: string) => {
      if (!CRE_CONSUMER_ADDRESS || CRE_CONSUMER_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error("CRE consumer address not configured. Set NEXT_PUBLIC_CHAINGUARD_CRE_CONSUMER_ADDRESS.");
      }
      if (chain?.id !== CRE_CONSUMER_CHAIN_ID) {
        throw new Error(`Switch network to chain ${CRE_CONSUMER_CHAIN_ID} (CRE consumer chain).`);
      }
      writeContract({
        address: CRE_CONSUMER_ADDRESS,
        abi: CHAINGUARD_CRE_CONSUMER_ABI,
        functionName: "requestRiskAnalysis",
        args: [contractAddress as `0x${string}`, chainSelectorName],
      });
    },
    [writeContract, chain?.id]
  );

  useEffect(() => {
    if (!isConfirmed || !hash || !publicClient) return;
    (async () => {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash });
        if (!receipt?.logs?.length) return;
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: CHAINGUARD_CRE_CONSUMER_ABI,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "RiskAnalysisRequested" && decoded.args.requestId) {
              setLastRequestId(decoded.args.requestId as `0x${string}`);
              break;
            }
          } catch {
            // not our event
          }
        }
      } catch (e) {
        console.warn("Failed to parse requestId from receipt", e);
      }
    })();
  }, [isConfirmed, hash, publicClient]);

  return {
    requestAnalysis,
    isPending: isPending || isConfirming,
    isSuccess: isConfirmed,
    lastRequestId,
    reset,
    txHash: hash ?? undefined,
  };
}

/**
 * Read assessment for a request Id. Poll until filled or use with RiskAssessmentReceived event.
 */
export function useCREAssessment(requestId: `0x${string}` | null) {
  const { data, refetch, isLoading } = useReadContract({
    address: CRE_CONSUMER_ADDRESS,
    abi: CHAINGUARD_CRE_CONSUMER_ABI,
    functionName: "getAssessment",
    args: requestId ? [requestId] : undefined,
    chainId: CRE_CONSUMER_CHAIN_ID,
  });

  const assessment: OnchainAssessment | null =
    data && Array.isArray(data) && data.length >= 6
      ? parseOnchainAssessment(data as readonly [string, string, number, bigint, string, boolean])
      : null;

  return { assessment: assessment?.filled ? assessment : null, isLoading, refetch };
}

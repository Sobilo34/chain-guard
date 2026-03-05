"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { ContractStorage } from "@/lib/storage";
import {
  runGeminiScan,
  runFullAnalysisForAllContracts,
} from "@/lib/api";
import { toast } from "@/components/ui/toast";

type ScanContextValue = {
  isScanning: boolean;
  scanMessage: string | null;
  runForceScan: (options?: { onComplete?: () => void }) => Promise<void>;
};

const ScanContext = createContext<ScanContextValue | null>(null);

export function useDashboardScan() {
  const ctx = useContext(ScanContext);
  return ctx;
}

export function DashboardScanProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const runForceScan = useCallback(
    async (options?: { onComplete?: () => void }) => {
      const contracts = ContractStorage.getContracts();
      if (contracts.length === 0) {
        toast.warning("No contracts to scan", {
          description:
            "Add contracts (address + network) in the Registry, then run Force Scan.",
        });
        return;
      }
      setIsScanning(true);
      setScanMessage("Initializing CRE Simulator...");
      try {
        const scanResponse = await runGeminiScan({ runPostCREAi: true });

        if (scanResponse.data?.quotaExceeded) {
          setScanMessage("OpenRouter quota exceeded — showing fallback assessment.");
        } else if (
          scanResponse.success &&
          scanResponse.assessmentsCount === 0
        ) {
          setScanMessage("Scan finished but no contract results returned.");
          toast.warning("No assessments returned", {
            description:
              "CRE completed but no contract results were received. Check that config matches your monitored contracts and see terminal/API logs.",
          });
        } else if (
          scanResponse.success &&
          scanResponse.assessmentsCount > 0
        ) {
          setScanMessage("Running Full Analysis for all contracts...");
          toast.success("Scan complete", {
            description: `${scanResponse.assessmentsCount} contract(s) updated. Running Full Analysis...`,
          });
        } else {
          setScanMessage("Running Full Analysis for all contracts...");
        }

        try {
          const analysisResult = await runFullAnalysisForAllContracts();
          if (analysisResult.success > 0) {
            setScanMessage("Full Analysis complete.");
            toast.success("Full Analysis complete", {
              description:
                analysisResult.failed > 0
                  ? `${analysisResult.success} contract(s) updated; ${analysisResult.failed} failed.`
                  : `All ${analysisResult.success} contract(s) updated with full analysis.`,
            });
          }
        } catch (e) {
          console.error("Full Analysis batch failed", e);
          setScanMessage("Scan complete. Full Analysis had errors.");
        }

        setScanMessage("Dashboard updated.");
        window.dispatchEvent(new Event("storage"));
        options?.onComplete?.();
      } catch (err) {
        setScanMessage("Scan failed. Check bridge API and terminal logs.");
        console.error(err);
        toast.error("Force Scan failed", {
          description: err instanceof Error ? err.message : "Scan failed.",
        });
      } finally {
        setIsScanning(false);
        setTimeout(() => setScanMessage(null), 5000);
      }
    },
    []
  );

  return (
    <ScanContext.Provider
      value={{ isScanning, scanMessage, runForceScan }}
    >
      {children}
    </ScanContext.Provider>
  );
}

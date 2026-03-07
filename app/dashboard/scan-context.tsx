"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { ContractStorage } from "@/lib/storage";
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
          description: "Add contracts in the Registry, then use Full Analysis on each contract page.",
        });
        return;
      }
      setIsScanning(true);
      setScanMessage("CRE runs on-chain only.");
      try {
        toast.info("CRE runs on-chain only", {
          description: "Use Full Analysis on each contract page for risk analysis (smart contract → CRE workflow).",
        });
        window.dispatchEvent(new Event("storage"));
        options?.onComplete?.();
      } finally {
        setIsScanning(false);
        setTimeout(() => setScanMessage(null), 3000);
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

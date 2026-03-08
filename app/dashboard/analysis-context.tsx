"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useCREAssessment } from "@/hooks/use-cre-onchain";
import type { OnchainAssessment } from "@/lib/cre-consumer";

export type PendingAnalysis = {
  contractAddress: string;
  requestId: string;
  stage: string;
  logLines: string[];
  creAssessment: OnchainAssessment | null;
  error: string | null;
  modalCollapsed: boolean;
};

type AnalysisContextValue = {
  pendingAnalysis: PendingAnalysis | null;
  setPendingAnalysis: (p: PendingAnalysis | null) => void;
  updatePendingAnalysis: (updates: Partial<PendingAnalysis>) => void;
  clearPendingAnalysis: () => void;
};

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function useAnalysisContext() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysisContext must be used within AnalysisProvider");
  return ctx;
}

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [pendingAnalysis, setPendingAnalysisState] = useState<PendingAnalysis | null>(null);

  const setPendingAnalysis = useCallback((p: PendingAnalysis | null) => {
    setPendingAnalysisState(p);
  }, []);

  const updatePendingAnalysis = useCallback((updates: Partial<PendingAnalysis>) => {
    setPendingAnalysisState((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const clearPendingAnalysis = useCallback(() => {
    setPendingAnalysisState(null);
  }, []);

  const value: AnalysisContextValue = {
    pendingAnalysis,
    setPendingAnalysis,
    updatePendingAnalysis,
    clearPendingAnalysis,
  };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
      <AnalysisPoller />
    </AnalysisContext.Provider>
  );
}

/** Polls getAssessment for pendingAnalysis.requestId and updates context when assessment arrives. Keeps running when user navigates away. */
function AnalysisPoller() {
  const { pendingAnalysis, updatePendingAnalysis } = useContext(AnalysisContext)!;
  const requestId = pendingAnalysis?.requestId ?? null;
  const { assessment, refetch } = useCREAssessment(requestId as `0x${string}` | null);

  useEffect(() => {
    if (!requestId) return;
    const t = setInterval(() => refetch(), 4000);
    return () => clearInterval(t);
  }, [requestId, refetch]);

  const lastPushedAssessmentRef = useRef<OnchainAssessment | null>(null);
  useEffect(() => {
    if (!requestId) {
      lastPushedAssessmentRef.current = null;
      return;
    }
  }, [requestId]);
  useEffect(() => {
    if (!assessment || !pendingAnalysis) return;
    if (lastPushedAssessmentRef.current === assessment) return;
    lastPushedAssessmentRef.current = assessment;
    updatePendingAnalysis({ creAssessment: assessment });
  }, [assessment, pendingAnalysis, updatePendingAnalysis]);

  return null;
}

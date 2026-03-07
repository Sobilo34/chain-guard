/**
 * ChainGuardCREConsumer ABI (minimal) for requesting risk analysis and reading results.
 * Contract triggers CRE workflow via RiskAnalysisRequested event; CRE writes back via onReport.
 */

export const CHAINGUARD_CRE_CONSUMER_ABI = [
  {
    inputs: [
      { name: "contractAddress", type: "address" },
      { name: "chainSelectorName", type: "string" },
    ],
    name: "requestRiskAnalysis",
    outputs: [{ name: "requestId", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "requestId", type: "bytes32" }],
    name: "getAssessment",
    outputs: [
      { name: "contractAddress", type: "address" },
      { name: "chainSelectorName", type: "string" },
      { name: "riskLevel", type: "uint8" },
      { name: "riskScore", type: "uint256" },
      { name: "summary", type: "string" },
      { name: "filled", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "requestId", type: "bytes32" },
      { indexed: true, name: "contractAddress", type: "address" },
      { indexed: false, name: "chainSelectorName", type: "string" },
      { indexed: true, name: "requester", type: "address" },
    ],
    name: "RiskAnalysisRequested",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "requestId", type: "bytes32" },
      { indexed: true, name: "contractAddress", type: "address" },
      { indexed: false, name: "riskLevel", type: "uint8" },
      { indexed: false, name: "riskScore", type: "uint256" },
      { indexed: false, name: "summary", type: "string" },
    ],
    name: "RiskAssessmentReceived",
    type: "event",
  },
] as const;

export const RISK_LEVEL_LABELS: Record<number, string> = {
  0: "LOW",
  1: "MEDIUM",
  2: "HIGH",
  3: "CRITICAL",
};

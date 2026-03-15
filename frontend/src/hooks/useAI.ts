"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type {
  AnomalyListResponse,
  AnomalyScanResult,
  ChatHistoryResponse,
  ChatResponse,
  CollectionsListResponse,
  LeaseCopilotResult,
  MaintenanceListResponse,
  MaintenanceRefreshResult,
  PortfolioScanResult,
  RemarketingListResponse,
  AIRemarketingRecommendation,
  RemarketingRefreshResult,
  RiskScoreListResponse,
  RiskRefreshResult,
  SimulationParams,
  SimulationResult,
} from "@/types/ai";

// ── Feature 1: Lease Copilot ──────────────────────────────────

export function useStructureLease() {
  return useMutation<
    LeaseCopilotResult,
    Error,
    { asset_id: number; lessee_id?: number | null; risk_appetite: string; requested_term_months: number }
  >({
    mutationFn: async (payload) => {
      const { data } = await api.post("/ai/copilot/structure-lease/", payload);
      return data;
    },
  });
}

// ── Feature 2: Anomaly Detection ──────────────────────────────

export function useAnomalyAlerts(resolved?: boolean) {
  const params: Record<string, string> = {};
  if (resolved !== undefined) params.resolved = String(resolved);
  return useQuery<AnomalyListResponse>({
    queryKey: ["ai", "anomalies", resolved],
    queryFn: async () => {
      const { data } = await api.get("/ai/anomalies/", { params });
      return data;
    },
    staleTime: 2 * 60_000,
  });
}

export function useRunAnomalyScan() {
  const queryClient = useQueryClient();
  return useMutation<AnomalyScanResult>({
    mutationFn: async () => {
      const { data } = await api.post("/ai/anomalies/scan/");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "anomalies"] });
    },
  });
}

export function useResolveAnomaly() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.patch(`/ai/anomalies/${id}/resolve/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "anomalies"] });
    },
  });
}

// ── Feature 3: Risk Scores ────────────────────────────────────

export function useRiskScores(band?: string) {
  const params: Record<string, string> = {};
  if (band) params.band = band;
  return useQuery<RiskScoreListResponse>({
    queryKey: ["ai", "risk-scores", band],
    queryFn: async () => {
      const { data } = await api.get("/ai/risk-scores/", { params });
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useRefreshRiskScores() {
  const queryClient = useQueryClient();
  return useMutation<RiskRefreshResult>({
    mutationFn: async () => {
      const { data } = await api.post("/ai/risk-scores/refresh/");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "risk-scores"] });
    },
  });
}

// ── Feature 4: Maintenance Predictions ───────────────────────

export function useMaintenancePredictions(riskLevel?: string) {
  const params: Record<string, string> = {};
  if (riskLevel) params.risk_level = riskLevel;
  return useQuery<MaintenanceListResponse>({
    queryKey: ["ai", "maintenance", riskLevel],
    queryFn: async () => {
      const { data } = await api.get("/ai/maintenance-predictions/", { params });
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useRefreshMaintenancePredictions() {
  const queryClient = useQueryClient();
  return useMutation<MaintenanceRefreshResult>({
    mutationFn: async () => {
      const { data } = await api.post("/ai/maintenance-predictions/refresh/");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "maintenance"] });
    },
  });
}

// ── Feature 6: Collections ────────────────────────────────────

export function useCollectionsList() {
  return useQuery<CollectionsListResponse>({
    queryKey: ["ai", "collections"],
    queryFn: async () => {
      const { data } = await api.get("/ai/collections/");
      return data;
    },
    staleTime: 3 * 60_000,
  });
}

// ── Feature 7: Remarketing Engine ────────────────────────────

export function useRemarketingRecommendations(action?: string) {
  const params: Record<string, string> = {};
  if (action) params.action = action;
  return useQuery<RemarketingListResponse>({
    queryKey: ["ai", "remarketing", action],
    queryFn: async () => {
      const { data } = await api.get("/ai/remarketing/", { params });
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useRemarketingDetail(assetId: number | null) {
  return useQuery<AIRemarketingRecommendation>({
    queryKey: ["ai", "remarketing", "detail", assetId],
    queryFn: async () => {
      const { data } = await api.get(`/ai/remarketing/${assetId}/`);
      return data;
    },
    enabled: !!assetId,
    staleTime: 5 * 60_000,
  });
}

export function useRefreshRemarketing() {
  const queryClient = useQueryClient();
  return useMutation<RemarketingRefreshResult>({
    mutationFn: async () => {
      const { data } = await api.post("/ai/remarketing/refresh/");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "remarketing"] });
    },
  });
}

// ── Feature 8: NL Analytics Chat ──────────────────────────────

export function useChatHistory(sessionId?: number | null) {
  const params: Record<string, string> = {};
  if (sessionId) params.session_id = String(sessionId);
  return useQuery<ChatHistoryResponse>({
    queryKey: ["ai", "chat", "history", sessionId],
    queryFn: async () => {
      const { data } = await api.get("/ai/chat/history/", { params });
      return data;
    },
    staleTime: 0,
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  return useMutation<ChatResponse, Error, { message: string; session_id?: number | null }>({
    mutationFn: async (payload) => {
      const { data } = await api.post("/ai/chat/", payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ai", "chat", "history", data.session_id] });
    },
  });
}

// ── Feature 9: Scenario Simulator ────────────────────────────

export function useRunSimulation() {
  return useMutation<SimulationResult, Error, SimulationParams>({
    mutationFn: async (payload) => {
      const { data } = await api.post("/ai/simulate/", payload);
      return data;
    },
  });
}

// ── Feature 10: Portfolio Scan ────────────────────────────────

export function usePortfolioScan() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioScanResult>({
    mutationFn: async () => {
      const { data } = await api.post("/ai/portfolio-scan/");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai"] });
    },
  });
}

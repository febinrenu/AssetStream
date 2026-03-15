"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { BatchValuationResponse, DepreciationForecastResponse, DashboardSummary } from "@/types";

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/summary/");
      return data;
    },
    refetchInterval: 60_000, // refresh every 60s for live feel
    staleTime: 30_000,
  });
}

export function useBatchValuations() {
  return useQuery<BatchValuationResponse>({
    queryKey: ["remarketing", "batch"],
    queryFn: async () => {
      const { data } = await api.get("/remarketing/batch-valuations/");
      return data;
    },
    staleTime: 5 * 60_000,
    refetchInterval: 60_000,
  });
}

export function useDepreciationForecast() {
  return useQuery<DepreciationForecastResponse>({
    queryKey: ["remarketing", "forecast"],
    queryFn: async () => {
      const { data } = await api.get("/remarketing/depreciation-forecast/");
      return data;
    },
    staleTime: 5 * 60_000,
    refetchInterval: 60_000,
  });
}

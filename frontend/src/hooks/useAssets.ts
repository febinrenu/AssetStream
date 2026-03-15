"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { Asset, AssetHealth, MaintenanceLog, PaginatedResponse, UsageLog } from "@/types";

export function useAssets(params?: Record<string, string>) {
  return useQuery<PaginatedResponse<Asset>>({
    queryKey: ["assets", params],
    queryFn: async () => {
      const { data } = await api.get("/assets/", { params });
      return data;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useAsset(id: number) {
  return useQuery<Asset>({
    queryKey: ["assets", id],
    queryFn: async () => {
      const { data } = await api.get(`/assets/${id}/`);
      return data;
    },
    enabled: !!id,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useAssetUsageLogs(id: number) {
  return useQuery<PaginatedResponse<UsageLog>>({
    queryKey: ["assets", id, "usage-logs"],
    queryFn: async () => {
      const { data } = await api.get(`/assets/${id}/usage-logs/`);
      return data;
    },
    enabled: !!id,
    refetchInterval: 30_000,
  });
}

export function useAssetHealth(id: number) {
  return useQuery<AssetHealth>({
    queryKey: ["assets", id, "health"],
    queryFn: async () => {
      const { data } = await api.get(`/assets/${id}/health/`);
      return data;
    },
    enabled: !!id,
    refetchInterval: 30000,
  });
}

export function useMaintenanceLogs(assetId: number) {
  return useQuery<PaginatedResponse<MaintenanceLog>>({
    queryKey: ["assets", assetId, "maintenance"],
    queryFn: async () => {
      const { data } = await api.get(`/assets/${assetId}/maintenance/`);
      // Backend returns a plain list; wrap it if needed
      if (Array.isArray(data)) return { count: data.length, next: null, previous: null, results: data };
      return data;
    },
    enabled: !!assetId,
  });
}

export function useLogMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, notes, priority }: { assetId: number; notes: string; priority: string }) => {
      const { data } = await api.post(`/assets/${assetId}/maintenance/`, { notes, priority });
      return data as MaintenanceLog;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["assets", vars.assetId, "maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["assets", vars.assetId] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useResolveMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, logId }: { assetId: number; logId: number }) => {
      const { data } = await api.post(`/assets/${assetId}/maintenance/${logId}/resolve/`);
      return data as MaintenanceLog;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["assets", vars.assetId, "maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["assets", vars.assetId] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export interface HeatmapDay {
  date: string;
  total: number;
  heavy_equipment: number;
  medical: number;
  fleet: number;
  industrial: number;
}

export interface HeatmapData {
  days: HeatmapDay[];
  max_total: number;
}

export function useUtilizationHeatmap(days = 84) {
  return useQuery<HeatmapData>({
    queryKey: ["utilization-heatmap", days],
    queryFn: async () => {
      const { data } = await api.get("/assets/utilization-heatmap/", { params: { days } });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      category: string;
      serial_number: string;
      manufacture_year: number;
      base_monthly_rate: string;
      per_hour_rate: string;
      status?: string;
    }) => {
      const { data } = await api.post("/assets/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { NotificationsResponse } from "@/types";

export function useNotifications() {
  return useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await api.get("/notifications/");
      return data;
    },
    refetchInterval: 30_000, // poll every 30s
    staleTime: 20_000,
  });
}

export function useTriggerBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/servicing/trigger-billing/");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useTriggerIoT() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/servicing/trigger-iot/");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["usage-logs"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { AuditLogResponse } from "@/types";

export function useAuditLogs(params?: { page?: number; action?: string; resource_type?: string }) {
  return useQuery<AuditLogResponse>({
    queryKey: ["audit-logs", params],
    queryFn: async () => {
      const { data } = await api.get("/audit-logs/", { params });
      return data;
    },
  });
}

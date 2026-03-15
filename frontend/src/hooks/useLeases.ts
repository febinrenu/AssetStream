"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { LeaseContract, PaginatedResponse } from "@/types";

export function useLeases(params?: Record<string, string>) {
  return useQuery<PaginatedResponse<LeaseContract>>({
    queryKey: ["leases", params],
    queryFn: async () => {
      const { data } = await api.get("/leases/", { params });
      return data;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useLease(id: number) {
  return useQuery<LeaseContract>({
    queryKey: ["leases", id],
    queryFn: async () => {
      const { data } = await api.get(`/leases/${id}/`);
      return data;
    },
    enabled: !!id,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useCreateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { asset_id: number; duration_months: number }) => {
      const { data } = await api.post("/leases/", payload);
      return data as LeaseContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useTerminateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/leases/${id}/terminate/`);
      return data as LeaseContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useRenewLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, duration_months, notes }: { id: number; duration_months: number; notes?: string }) => {
      const { data } = await api.post(`/leases/${id}/renew/`, { duration_months, notes });
      return data as LeaseContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useUploadLeaseDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const form = new FormData();
      form.append("document", file);
      const { data } = await api.post(`/leases/${id}/document/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { contract_number: string; document_url: string | null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
    },
  });
}

export function useDeleteLeaseDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/leases/${id}/document/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
    },
  });
}

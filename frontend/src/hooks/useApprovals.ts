import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { ApprovalRequest, ApprovalStats } from "@/types";

export function useApprovals(params?: Record<string, string>) {
  return useQuery<ApprovalRequest[]>({
    queryKey: ["approvals", params],
    queryFn: async () => {
      const { data } = await api.get("/approvals/", { params });
      return data?.results !== undefined ? data.results : data;
    },
  });
}

export function useApprovalStats() {
  return useQuery<ApprovalStats>({
    queryKey: ["approval-stats"],
    queryFn: async () => {
      const { data } = await api.get("/approvals/stats/");
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useCreateApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post("/approvals/create/", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["approval-stats"] });
    },
  });
}

export function useApproveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewer_notes }: { id: number; reviewer_notes?: string }) =>
      api.post(`/approvals/${id}/approve/`, { reviewer_notes }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["approval-stats"] });
    },
  });
}

export function useRejectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewer_notes }: { id: number; reviewer_notes?: string }) =>
      api.post(`/approvals/${id}/reject/`, { reviewer_notes }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["approval-stats"] });
    },
  });
}

export function useCancelApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post(`/approvals/${id}/cancel/`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approvals"] }),
  });
}

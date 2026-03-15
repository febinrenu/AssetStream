import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { DunningRule, PaymentRecord, ReconciliationReport } from "@/types";

export function usePayments(params?: Record<string, string>) {
  return useQuery<PaymentRecord[]>({
    queryKey: ["payments", params],
    queryFn: async () => {
      const { data } = await api.get("/payments/", { params });
      return data?.results !== undefined ? data.results : data;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useInitiatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { invoice_id: number; payment_method: string; notes?: string }) =>
      api.post("/payments/initiate/", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useDunningRules() {
  return useQuery<DunningRule[]>({
    queryKey: ["dunning-rules"],
    queryFn: async () => {
      const { data } = await api.get("/payments/dunning/");
      return data?.results !== undefined ? data.results : data;
    },
  });
}

export function useCreateDunningRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<DunningRule>) =>
      api.post("/payments/dunning/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dunning-rules"] }),
  });
}

export function useUpdateDunningRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<DunningRule>) =>
      api.patch(`/payments/dunning/${id}/`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dunning-rules"] }),
  });
}

export function useDeleteDunningRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/payments/dunning/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dunning-rules"] }),
  });
}

export function useReconciliations() {
  return useQuery<ReconciliationReport[]>({
    queryKey: ["reconciliations"],
    queryFn: async () => {
      const { data } = await api.get("/payments/reconciliation/");
      return data?.results !== undefined ? data.results : data;
    },
  });
}

export function useGenerateReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { period_start: string; period_end: string }) =>
      api.post("/payments/reconciliation/generate/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reconciliations"] }),
  });
}

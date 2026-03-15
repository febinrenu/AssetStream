import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { PricingRule } from "@/types";

export function usePricingRules(activeOnly?: boolean) {
  return useQuery<PricingRule[]>({
    queryKey: ["pricing-rules", activeOnly],
    queryFn: async () => {
      const { data } = await api.get("/pricing/", {
        params: activeOnly ? { active: "true" } : undefined,
      });
      return data?.results !== undefined ? data.results : data;
    },
  });
}

export function useCreatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<PricingRule>) =>
      api.post("/pricing/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });
}

export function useUpdatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<PricingRule>) =>
      api.patch(`/pricing/${id}/`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });
}

export function useDeletePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/pricing/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });
}

export function useSimulatePricing() {
  return useMutation({
    mutationFn: (payload: { lease_id: number; base_amount: number; usage_hours: number }) =>
      api.post("/pricing/simulate/", payload).then((r) => r.data),
  });
}

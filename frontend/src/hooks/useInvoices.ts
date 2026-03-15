"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { Invoice, PaginatedResponse } from "@/types";

export function useInvoices(params?: Record<string, string>) {
  return useQuery<PaginatedResponse<Invoice>>({
    queryKey: ["invoices", params],
    queryFn: async () => {
      const { data } = await api.get("/invoices/", { params });
      return data;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/invoices/${id}/mark-paid/`);
      return data as Invoice;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["invoices"] });
      const previous = queryClient.getQueryData<PaginatedResponse<Invoice>>(["invoices", undefined]);
      if (previous) {
        queryClient.setQueryData<PaginatedResponse<Invoice>>(["invoices", undefined], {
          ...previous,
          results: previous.results.map((inv) =>
            inv.id === id ? { ...inv, status: "paid" as const } : inv
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["invoices", undefined], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

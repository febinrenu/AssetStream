import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { ServiceTicket, TicketStats } from "@/types";

export function useTickets(params?: Record<string, string>) {
  return useQuery<ServiceTicket[]>({
    queryKey: ["tickets", params],
    queryFn: async () => {
      const { data } = await api.get("/tickets/", { params });
      return data?.results !== undefined ? data.results : data;
    },
  });
}

export function useTicketStats() {
  return useQuery<TicketStats>({
    queryKey: ["ticket-stats"],
    queryFn: async () => {
      const { data } = await api.get("/tickets/stats/");
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post("/tickets/", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket-stats"] });
    },
  });
}

export function useResolveTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolution_notes }: { id: number; resolution_notes: string }) =>
      api.post(`/tickets/${id}/resolve/`, { resolution_notes }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket-stats"] });
    },
  });
}

export function useAssignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignee_id }: { id: number; assignee_id: number }) =>
      api.post(`/tickets/${id}/assign/`, { assignee_id }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      api.patch(`/tickets/${id}/`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

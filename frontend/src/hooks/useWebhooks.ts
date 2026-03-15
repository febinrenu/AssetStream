import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { WebhookSubscription } from "@/types";

export function useWebhooks() {
  return useQuery<WebhookSubscription[]>({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const { data } = await api.get("/webhooks/");
      return data?.results !== undefined ? data.results : data;
    },
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<WebhookSubscription>) =>
      api.post("/webhooks/", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<WebhookSubscription>) =>
      api.patch(`/webhooks/${id}/`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/webhooks/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (id: number) => api.post(`/webhooks/${id}/test/`).then((r) => r.data),
  });
}

export function useInAppNotifications(unreadOnly?: boolean) {
  return useQuery({
    queryKey: ["inbox-notifications", unreadOnly],
    queryFn: async () => {
      const { data } = await api.get("/notifications/inbox/", {
        params: unreadOnly ? { unread: "true" } : undefined,
      });
      return data as import("@/types").InAppNotification[];
    },
    refetchInterval: 30_000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery<{ unread_count: number }>({
    queryKey: ["notif-unread-count"],
    queryFn: async () => {
      const { data } = await api.get("/notifications/inbox/unread-count/");
      return data;
    },
    refetchInterval: 20_000,
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/notifications/inbox/mark-all-read/").then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-notifications"] });
      qc.invalidateQueries({ queryKey: ["notif-unread-count"] });
    },
  });
}

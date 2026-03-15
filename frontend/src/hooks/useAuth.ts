"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { User } from "@/types";

export function useAuth() {
  return useQuery<User>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const { data } = await api.get("/auth/me/");
      return data;
    },
    retry: false,
  });
}

export function useIsAdmin() {
  const { data: user } = useAuth();
  return user?.role === "admin";
}

export function useIsAnalyst() {
  const { data: user } = useAuth();
  return user?.role === "analyst";
}

export function useIsLessee() {
  const { data: user } = useAuth();
  return user?.role === "lessee";
}

export function useUserRole() {
  const { data: user } = useAuth();
  return user?.role ?? null;
}

/** True if user can see all records (admin or analyst) */
export function useCanViewAll() {
  const { data: user } = useAuth();
  return user?.role === "admin" || user?.role === "analyst";
}

/** True if user can export CSVs (admin or analyst) */
export function useCanExport() {
  const { data: user } = useAuth();
  return user?.role === "admin" || user?.role === "analyst";
}

/** True if user can perform write / mutating operations */
export function useCanWrite() {
  const { data: user } = useAuth();
  return user?.role === "admin";
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Pick<User, "first_name" | "last_name" | "email" | "company_name" | "phone_number" | "avatar_color">>) => {
      const { data } = await api.patch("/auth/me/", payload);
      return data as User;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data);
    },
  });
}


import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { PortfolioRisk } from "@/types";

export function usePortfolioRisk() {
  return useQuery<PortfolioRisk>({
    queryKey: ["portfolio-risk"],
    queryFn: async () => {
      const { data } = await api.get("/portfolio/risk/");
      return data;
    },
    staleTime: 60_000,
  });
}

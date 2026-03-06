import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/auth/me", {
        headers: { "Cache-Control": "no-store" },
      });
      return res.data as any;
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
}
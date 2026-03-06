import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export type MeResponse = {
  user: { id: string; email: string; name: string | null; createdAt: string };
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get<MeResponse>("/auth/me");
      return res.data;
    },
    retry: false, // important: don't spam on 401
    staleTime: 60_000,
  });
}
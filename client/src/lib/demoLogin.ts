import type { QueryClient } from "@tanstack/react-query";
import type { NavigateFunction } from "react-router-dom";
import { api } from "./api";

export async function startDemoLogin(qc: QueryClient, navigate: NavigateFunction) {
  await api.post("/auth/demo");
  await qc.invalidateQueries({ queryKey: ["me"] });
  navigate("/board");
}

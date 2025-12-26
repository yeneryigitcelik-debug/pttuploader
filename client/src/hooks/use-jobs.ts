import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useJobs(params?: { status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [api.jobs.list.path, params],
    queryFn: async () => {
      const url = buildUrl(api.jobs.list.path);
      const searchParams = new URLSearchParams();
      if (params?.status && params.status !== "ALL") searchParams.append("status", params.status);
      if (params?.limit) searchParams.append("limit", params.limit.toString());
      if (params?.offset) searchParams.append("offset", params.offset.toString());
      
      const res = await fetch(`${url}?${searchParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return api.jobs.list.responses[200].parse(await res.json());
    },
  });
}

export function useJob(id: number) {
  return useQuery({
    queryKey: [api.jobs.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.jobs.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch job");
      return api.jobs.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Poll running jobs more frequently
      const status = query.state.data?.status;
      return status === "RUNNING" || status === "QUEUED" ? 2000 : false;
    }
  });
}

export function useRetryJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.jobs.retry.path, { id });
      const res = await fetch(url, {
        method: api.jobs.retry.method,
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to retry job");
      return api.jobs.retry.responses[200].parse(await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.jobs.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.jobs.get.path, id] });
    },
  });
}

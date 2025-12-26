import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertMapping } from "@shared/routes";

export function useMappings() {
  return useQuery({
    queryKey: [api.mappings.list.path],
    queryFn: async () => {
      const res = await fetch(api.mappings.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch mappings");
      return api.mappings.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertMapping) => {
      const validated = api.mappings.create.input.parse(data);
      const res = await fetch(api.mappings.create.path, {
        method: api.mappings.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.mappings.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create mapping");
      }
      return api.mappings.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.mappings.list.path] });
    },
  });
}

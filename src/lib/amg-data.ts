import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"] & { roles: string[] };

export const ROLE_LABEL: Record<string, string> = { director: "Director", manager: "Marketing Manager", member: "Team member" };

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const r = (roles ?? []).map((x) => x.role as string);
      return { id: user.id, email: user.email ?? "", roles: r, isApprover: r.includes("director") || r.includes("manager") };
    },
  });
}

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async (): Promise<Profile[]> => {
      const [{ data: p, error }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      return (p ?? []).map((x) => ({ ...x, roles: (r ?? []).filter((y) => y.user_id === x.id).map((y) => y.role as string) }));
    },
  });
}

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase.from("tasks").select("*").order("due_date");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Database["public"]["Tables"]["tasks"]["Update"] }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

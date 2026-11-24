import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/amg/page-header";
import { Panel } from "@/components/amg/task-row";
import { Input } from "@/components/ui/input";
import { ROLE_LABEL, useMe, useTeam } from "@/lib/amg-data";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "Team · AMG Content Calendar 2027" }, { name: "description", content: "AMG marketing team members, job titles and approval roles." }, { property: "og:title", content: "Team · AMG Content Calendar" }, { property: "og:description", content: "AMG marketing team." }] }),
  component: Team,
});

const JOB_TITLES = ["Director", "Marketing Manager", "Digital Marketer", "Assistant Digital Marketer", "Head of Videography & Production", "Assistant Videographer, Producer & Editor", "Graphics Designer", "Activations Leader & AMG Foundation Coordinator"];

function Team() {
  const { data: team = [] } = useTeam();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const refresh = () => { qc.invalidateQueries({ queryKey: ["team"] }); qc.invalidateQueries({ queryKey: ["me"] }); };

  async function setRole(userId: string, role: "director" | "manager" | "member") {
    const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) { toast.error(error.message); return; }
    const { error: d } = await supabase.from("user_roles").delete().eq("user_id", userId).neq("role", role);
    if (d) { toast.error(d.message); return; }
    toast.success("Role updated"); refresh();
  }
  async function setTitle(userId: string, job_title: string) {
    const { error } = await supabase.from("profiles").update({ job_title }).eq("id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Job title saved"); refresh();
  }

  return (
    <>
      <PageHeader title="Team" subtitle="Team members appear here after they sign in with Google. New people need a role before they can use the calendar." />
      <datalist id="titles">{JOB_TITLES.map((t) => <option key={t} value={t} />)}</datalist>
      <Panel title="AMG marketing team" count={team.length}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Job title</th><th className="px-4 py-2">Approval role</th></tr></thead>
            <tbody>
              {team.map((m) => {
                const role = (m.roles.length === 0 ? "none" : m.roles.find((r) => r !== "member") ?? "member") as "none" | "director" | "manager" | "member";
                const canEdit = me?.isApprover;
                return (
                  <tr key={m.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{m.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3">{canEdit || m.id === me?.id ? <Input list="titles" defaultValue={m.job_title ?? ""} onBlur={(e) => e.target.value !== (m.job_title ?? "") && setTitle(m.id, e.target.value)} className="h-8 min-w-56" placeholder="Pick a title" /> : m.job_title}</td>
                    <td className="px-4 py-3">{canEdit ? (
                      <select value={role} onChange={(e) => e.target.value !== "none" && setRole(m.id, e.target.value as "director" | "manager" | "member")} className="h-8 rounded-md border border-input bg-card px-2">
                        <option value="none" disabled>No access yet</option><option value="member">Team member</option><option value="manager">Marketing Manager (approver)</option><option value="director">Director (approver)</option>
                      </select>) : <span className={role === "member" ? "text-muted-foreground" : "font-medium text-primary"}>{role === "none" ? "No access yet" : ROLE_LABEL[role]}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

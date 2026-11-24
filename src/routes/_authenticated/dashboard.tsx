import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/amg/page-header";
import { Empty, Panel, TaskRow } from "@/components/amg/task-row";
import { TaskDrawer } from "@/components/amg/task-drawer";
import { TaskForm } from "@/components/amg/task-form";
import { useMe, useTasks, useTeam } from "@/lib/amg-data";
import { isDueToday, isOverdue, isUpcoming, PLATFORMS } from "@/lib/task-utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · AMG Content Calendar 2027" }, { name: "description", content: "Overdue, due today and upcoming AMG content tasks." }, { property: "og:title", content: "Dashboard · AMG Content Calendar" }, { property: "og:description", content: "Overdue, due today and upcoming AMG content tasks." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: tasks = [] } = useTasks();
  const { data: me } = useMe();
  const { data: team = [] } = useTeam();
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const name = team.find((t) => t.id === me?.id)?.full_name?.split(" ")[0];

  const overdue = tasks.filter((t) => isOverdue(t));
  const today = tasks.filter((t) => isDueToday(t) && !isOverdue(t));
  const upcoming = tasks.filter((t) => isUpcoming(t) && !isDueToday(t));
  const pending = tasks.filter((t) => t.status === "pending_review");
  const done = tasks.filter((t) => t.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const stats = [
    { label: "Overdue", value: overdue.length, icon: AlertTriangle, cls: overdue.length ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground" },
    { label: "Pending approval", value: pending.length, icon: ShieldCheck, cls: "bg-accent text-accent-foreground" },
    { label: "Due today", value: today.length, icon: Clock, cls: "bg-accent text-accent-foreground" },
    { label: "Next 7 days", value: upcoming.length, icon: CalendarClock, cls: "bg-accent text-accent-foreground" },
  ];

  return (
    <>
      <PageHeader title={`Welcome back${name ? `, ${name}` : ""}`} subtitle="Here's where AMG content stands today." action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New content / task</Button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{s.label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.cls}`}><s.icon className="h-4 w-4" /></span></div>
            <div className="mt-2 font-display text-3xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Overdue" count={overdue.length} tone="warning">{overdue.length ? overdue.map((t) => <TaskRow key={t.id} task={t} onOpen={setOpen} />) : <Empty text="Nothing overdue — great work." />}</Panel>
          <Panel title="Due today" count={today.length}>{today.length ? today.map((t) => <TaskRow key={t.id} task={t} onOpen={setOpen} />) : <Empty text="Nothing due today." />}</Panel>
          <Panel title="Upcoming (next 7 days)" count={upcoming.length}>{upcoming.length ? upcoming.map((t) => <TaskRow key={t.id} task={t} onOpen={setOpen} />) : <Empty text="No upcoming tasks this week." />}</Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Progress">
            <div className="space-y-3 p-4">
              <div className="flex items-end justify-between"><span className="font-display text-3xl font-bold text-success">{pct}%</span><span className="text-sm text-muted-foreground">{done} of {tasks.length} done</span></div>
              <Progress value={pct} className="[&>div]:bg-success" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-success" />{tasks.filter((t) => t.status === "published").length} posts published</div>
            </div>
          </Panel>
          <Panel title="By platform">
            <div className="space-y-3 p-4">{PLATFORMS.map((p) => {
              const n = tasks.filter((t) => t.platforms.includes(p)).length;
              const max = Math.max(1, ...PLATFORMS.map((q) => tasks.filter((t) => t.platforms.includes(q)).length));
              return <div key={p}><div className="mb-1 flex justify-between text-sm"><span>{p}</span><span className="text-muted-foreground">{n}</span></div><div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div></div>;
            })}</div>
          </Panel>
          {me?.isApprover && pending.length > 0 && (
            <Panel title="Waiting for your approval" count={pending.length}>{pending.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} onOpen={setOpen} />)}</Panel>
          )}
        </div>
      </div>
      <TaskForm open={creating} onOpenChange={setCreating} />
      <TaskDrawer taskId={open} onClose={() => setOpen(null)} />
    </>
  );
}

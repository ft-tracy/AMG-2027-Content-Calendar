import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/amg/page-header";
import { Empty, Panel, TaskRow } from "@/components/amg/task-row";
import { TaskDrawer } from "@/components/amg/task-drawer";
import { TaskForm } from "@/components/amg/task-form";
import { useMe, useTasks } from "@/lib/amg-data";
import { isOverdue, isUpcoming } from "@/lib/task-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks · AMG Content Calendar 2027" }, { name: "description", content: "All AMG marketing tasks with filters for overdue, upcoming and done." }, { property: "og:title", content: "Tasks · AMG Content Calendar" }, { property: "og:description", content: "All AMG marketing tasks." }] }),
  component: TasksPage,
});

const FILTERS = ["All", "Mine", "Overdue", "Upcoming", "Open", "Done"] as const;

function TasksPage() {
  const { data: tasks = [] } = useTasks();
  const { data: me } = useMe();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Open");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const list = tasks.filter((t) => {
    if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
    switch (filter) {
      case "Mine": return !!me && t.assignee_ids.includes(me.id);
      case "Overdue": return isOverdue(t);
      case "Upcoming": return isUpcoming(t);
      case "Open": return !t.completed;
      case "Done": return t.completed;
      default: return true;
    }
  });
  return (
    <>
      <PageHeader title="Tasks" subtitle="Tick off tasks as you finish them." action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New task</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
          {FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={cn("rounded-md px-3 py-1 text-sm", filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{f}</button>)}
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className="max-w-xs bg-card" />
      </div>
      <Panel title={`${filter} tasks`} count={list.length}>{list.length ? list.map((t) => <TaskRow key={t.id} task={t} onOpen={setOpen} />) : <Empty text="No tasks here." />}</Panel>
      <TaskForm open={creating} onOpenChange={setCreating} />
      <TaskDrawer taskId={open} onClose={() => setOpen(null)} />
    </>
  );
}

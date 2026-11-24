import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformBadges, StatusBadge } from "./badges";
import { useUpdateTask, type Task } from "@/lib/amg-data";
import { isOverdue } from "@/lib/task-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function TaskRow({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  const update = useUpdateTask();
  const overdue = isOverdue(task);
  return (
    <div className={cn("flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/50", overdue && "border-l-2 border-l-warning")}>
      <Checkbox checked={task.completed} aria-label="Tick off task"
        onCheckedChange={(v) => update.mutate({ id: task.id, patch: { completed: !!v } }, { onError: (e) => toast.error(e.message) })} />
      <button onClick={() => onOpen(task.id)} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left">
        <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", task.completed && "text-muted-foreground line-through")}>{task.title}</span>
        <PlatformBadges platforms={task.platforms} />
        <StatusBadge status={task.status} />
        <span className={cn("w-32 text-right text-xs", overdue ? "font-semibold text-foreground" : "text-muted-foreground")}>{format(new Date(task.due_date), "d MMM, HH:mm")}</span>
      </button>
    </div>
  );
}

export function Panel({ title, count, children, tone }: { title: string; count?: number; children: React.ReactNode; tone?: "warning" }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">{tone === "warning" && <span className="h-2 w-2 rounded-full bg-warning" />}{title}</h2>
        {count !== undefined && <span className="rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">{count}</span>}
      </div>
      {children}
    </section>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-sm text-muted-foreground">{text}</div>;
}

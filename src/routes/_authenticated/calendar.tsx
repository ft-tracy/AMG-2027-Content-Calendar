import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/amg/page-header";
import { TaskDrawer } from "@/components/amg/task-drawer";
import { TaskForm } from "@/components/amg/task-form";
import { useTasks } from "@/lib/amg-data";
import { isOverdue, PLATFORMS } from "@/lib/task-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Content Calendar · AMG 2027" }, { name: "description", content: "Monthly AMG content calendar across Instagram, Facebook, TikTok and YouTube." }, { property: "og:title", content: "AMG Content Calendar" }, { property: "og:description", content: "Monthly AMG content calendar." }] }),
  component: CalendarPage,
});

const CHIP: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-accent text-accent-foreground",
  revisions: "bg-warning/40 text-warning-foreground",
  approved: "bg-success-soft text-success",
  published: "bg-success text-success-foreground",
};

function CalendarPage() {
  const { data: tasks = [] } = useTasks();
  const [month, setMonth] = useState(() => { const n = new Date(); return n.getFullYear() < 2027 ? new Date(2027, 0, 1) : startOfMonth(n); });
  const [platform, setPlatform] = useState<string>("All");
  const [open, setOpen] = useState<string | null>(null);
  const [createOn, setCreateOn] = useState<Date | null>(null);
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) }), [month]);
  const visible = tasks.filter((t) => platform === "All" || t.platforms.includes(platform));

  return (
    <>
      <PageHeader title="Content Calendar" subtitle="Click a day to schedule content, or a post to open it."
        action={<Button onClick={() => setCreateOn(new Date())}><Plus className="h-4 w-4" />Schedule content</Button>} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
          <div className="w-40 text-center font-display text-lg font-bold">{format(month, "MMMM yyyy")}</div>
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>Today</Button>
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {["All", ...PLATFORMS].map((p) => (
            <button key={p} onClick={() => setPlatform(p)} className={cn("rounded-md px-3 py-1 text-sm", platform === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{p}</button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <div className="grid grid-cols-7 border-b bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="px-2 py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const items = visible.filter((t) => isSameDay(new Date(t.due_date), d));
            const today = isSameDay(d, new Date());
            return (
              <div key={d.toISOString()} onClick={() => setCreateOn(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10))}
                className={cn("min-h-28 cursor-pointer border-b border-r p-1.5 hover:bg-muted/40", !isSameMonth(d, month) && "bg-muted/30 text-muted-foreground")}>
                <div className={cn("mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs", today && "bg-primary font-bold text-primary-foreground")}>{format(d, "d")}</div>
                <div className="space-y-1">
                  {items.slice(0, 3).map((t) => (
                    <button key={t.id} onClick={(e) => { e.stopPropagation(); setOpen(t.id); }}
                      className={cn("flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium", CHIP[t.status], t.completed && "line-through opacity-60")}>
                      {isOverdue(t) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />}<span className="truncate">{t.title}</span>
                    </button>
                  ))}
                  {items.length > 3 && <div className="px-1 text-[11px] text-muted-foreground">+{items.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {createOn && <TaskForm open onOpenChange={(o) => !o && setCreateOn(null)} defaultDate={createOn} />}
      <TaskDrawer taskId={open} onClose={() => setOpen(null)} />
    </>
  );
}

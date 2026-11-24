import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/amg/page-header";
import { Empty, Panel, TaskRow } from "@/components/amg/task-row";
import { TaskDrawer } from "@/components/amg/task-drawer";
import { useMe, useTasks } from "@/lib/amg-data";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({ meta: [{ title: "Approvals · AMG Content Calendar 2027" }, { name: "description", content: "Content waiting for Director or Marketing Manager approval." }, { property: "og:title", content: "Approvals · AMG Content Calendar" }, { property: "og:description", content: "Content waiting for approval." }] }),
  component: Approvals,
});

function Approvals() {
  const { data: tasks = [] } = useTasks();
  const { data: me } = useMe();
  const [open, setOpen] = useState<string | null>(null);
  const pending = tasks.filter((t) => t.status === "pending_review");
  const revisions = tasks.filter((t) => t.status === "revisions");
  const approved = tasks.filter((t) => t.status === "approved");
  return (
    <>
      <PageHeader title="Approvals" subtitle={me?.isApprover ? "Review captions, posters and videos before they go live." : "Only Directors and the Marketing Manager can approve content."} />
      <div className="space-y-6">
        <Panel title="Pending approval" count={pending.length}>{pending.length ? pending.map((t) => <TaskRow key={t.id} task={t} onOpen={setOpen} />) : <Empty text="Nothing waiting for review." />}</Panel>
        <Panel title="Revisions requested" count={revisions.length} tone="warning">{revisions.length ? revisions.map((t) => <TaskRow key={t.id} task={t} onOpen={setOpen} />) : <Empty text="No revisions open." />}</Panel>
        <Panel title="Approved — ready to post" count={approved.length}>{approved.length ? approved.map((t) => <TaskRow key={t.id} task={t} onOpen={setOpen} />) : <Empty text="No approved posts waiting." />}</Panel>
      </div>
      <TaskDrawer taskId={open} onClose={() => setOpen(null)} />
    </>
  );
}

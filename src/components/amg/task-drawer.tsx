import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { CalendarPlus, CheckCircle2, FileText, Lock, RotateCcw, Send, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformBadges, StatusBadge } from "./badges";
import { ROLE_LABEL, useMe, useTasks, useTeam, useUpdateTask } from "@/lib/amg-data";
import { googleCalendarLink, isOverdue } from "@/lib/task-utils";

export function TaskDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const { data: tasks = [] } = useTasks();
  const task = tasks.find((t) => t.id === taskId);
  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {task && <TaskDetail key={task.id} taskId={task.id} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function TaskDetail({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: tasks = [] } = useTasks();
  const task = tasks.find((t) => t.id === taskId)!;
  const { data: me } = useMe();
  const { data: team = [] } = useTeam();
  const update = useUpdateTask();
  const [caption, setCaption] = useState(task.caption ?? "");
  const [hashtags, setHashtags] = useState(task.hashtags ?? "");
  const [comment, setComment] = useState("");
  useEffect(() => { setCaption(task.caption ?? ""); setHashtags(task.hashtags ?? ""); }, [task.caption, task.hashtags]);

  const locked = (task.status === "approved" || task.status === "published") && !me?.isApprover;
  const assignees = team.filter((m) => task.assignee_ids.includes(m.id));
  const byId = (id: string | null) => team.find((m) => m.id === id);

  const files = useQuery({
    queryKey: ["files", taskId],
    queryFn: async () => {
      const { data } = await supabase.from("task_files").select("*").eq("task_id", taskId).order("created_at", { ascending: false });
      const rows = data ?? [];
      const signed = await Promise.all(rows.map(async (f) => {
        const { data: s } = await supabase.storage.from("content").createSignedUrl(f.path, 3600);
        return { ...f, url: s?.signedUrl ?? "" };
      }));
      return signed;
    },
  });
  const comments = useQuery({
    queryKey: ["comments", taskId],
    queryFn: async () => (await supabase.from("comments").select("*").eq("task_id", taskId).order("created_at")).data ?? [],
  });

  const run = (patch: Parameters<typeof update.mutate>[0]["patch"], msg: string) =>
    update.mutate({ id: task.id, patch }, { onSuccess: () => toast.success(msg), onError: (e) => toast.error(e.message) });

  async function upload(fileList: FileList | null) {
    if (!fileList?.length || !me) return;
    const version = (files.data?.length ?? 0) + 1;
    for (const f of Array.from(fileList)) {
      const path = `${task.id}/${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("content").upload(path, f);
      if (error) { toast.error(error.message); continue; }
      await supabase.from("task_files").insert({ task_id: task.id, path, name: f.name, mime: f.type, version });
    }
    toast.success("Uploaded");
    qc.invalidateQueries({ queryKey: ["files", taskId] });
  }

  async function sendComment() {
    if (!comment.trim()) return;
    const { error } = await supabase.from("comments").insert({ task_id: task.id, body: comment.trim() });
    if (error) { toast.error(error.message); return; }
    setComment("");
    qc.invalidateQueries({ queryKey: ["comments", taskId] });
  }

  async function remove() {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["tasks"] });
    onClose();
  }

  const gcal = googleCalendarLink({
    title: task.title,
    due: task.due_date,
    details: `${task.content_type} · ${task.platforms.join(", ")}\n${task.description ?? ""}`,
    guests: assignees.map((a) => a.email).filter(Boolean) as string[],
  });

  return (
    <div className="space-y-5">
      <SheetHeader className="space-y-2 p-0">
        <div className="flex items-center gap-2"><StatusBadge status={task.status} />{isOverdue(task) && <span className="rounded bg-warning px-1.5 py-0.5 text-xs font-semibold text-warning-foreground">Overdue</span>}</div>
        <SheetTitle className="font-display text-xl">{task.title}</SheetTitle>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{format(new Date(task.due_date), "EEE d MMM yyyy, HH:mm")}</span><span>·</span><span>{task.content_type}</span>
        </div>
        <PlatformBadges platforms={task.platforms} />
      </SheetHeader>

      <label className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm font-medium">
        <Checkbox checked={task.completed} onCheckedChange={(v) => run({ completed: !!v }, v ? "Ticked off" : "Re-opened")} />
        Mark task as done
      </label>

      <div className="rounded-lg border bg-card p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approval</div>
        <div className="flex flex-wrap gap-2">
          {(task.status === "draft" || task.status === "revisions") && (
            <Button size="sm" onClick={() => run({ status: "pending_review" }, "Sent for approval")}><Send className="h-4 w-4" />Submit for approval</Button>
          )}
          {me?.isApprover && task.status !== "approved" && task.status !== "published" && (
            <>
              <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => run({ status: "approved" }, "Approved")}><CheckCircle2 className="h-4 w-4" />Approve</Button>
              <Button size="sm" variant="outline" onClick={() => run({ status: "revisions" }, "Revisions requested")}><RotateCcw className="h-4 w-4" />Request revisions</Button>
            </>
          )}
          {me?.isApprover && task.status === "approved" && (
            <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => run({ status: "published", completed: true }, "Marked as published")}>Mark published</Button>
          )}
          {me?.isApprover && (task.status === "approved" || task.status === "published") && (
            <Button size="sm" variant="ghost" onClick={() => run({ status: "revisions" }, "Re-opened for revisions")}>Re-open</Button>
          )}
          {!me?.isApprover && task.status === "pending_review" && <p className="text-sm text-muted-foreground">Waiting for a Director or the Marketing Manager to review.</p>}
        </div>
        {task.approved_at && <p className="mt-2 flex items-center gap-1 text-xs text-success"><Lock className="h-3 w-3" />Approved by {byId(task.approved_by)?.full_name ?? "manager"} · {format(new Date(task.approved_at), "d MMM, HH:mm")}</p>}
      </div>

      <Tabs defaultValue="content">
        <TabsList className="w-full"><TabsTrigger value="content" className="flex-1">Content</TabsTrigger><TabsTrigger value="files" className="flex-1">Files ({files.data?.length ?? 0})</TabsTrigger><TabsTrigger value="comments" className="flex-1">Comments ({comments.data?.length ?? 0})</TabsTrigger></TabsList>

        <TabsContent value="content" className="space-y-3 pt-3">
          {task.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>}
          <div className="grid gap-1.5"><Label>Caption</Label><Textarea rows={5} value={caption} disabled={locked} onChange={(e) => setCaption(e.target.value)} placeholder="Write the post caption…" /></div>
          <div className="grid gap-1.5"><Label>Hashtags</Label><Input value={hashtags} disabled={locked} onChange={(e) => setHashtags(e.target.value)} placeholder="#AMG #Foundation" /></div>
          {locked ? <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Approved content is locked.</p> :
            <Button size="sm" variant="outline" onClick={() => run({ caption, hashtags }, "Caption saved")}>Save caption</Button>}
          <div className="border-t pt-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned team</div>
            <div className="flex flex-wrap gap-2">{assignees.length ? assignees.map((a) => <span key={a.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">{a.full_name}{a.job_title ? ` · ${a.job_title}` : ""}</span>) : <span className="text-sm text-muted-foreground">No one assigned</span>}</div>
            <Button asChild size="sm" variant="outline" className="mt-3"><a href={gcal} target="_blank" rel="noreferrer"><CalendarPlus className="h-4 w-4" />Send Google Calendar reminder to team</a></Button>
          </div>
        </TabsContent>

        <TabsContent value="files" className="space-y-3 pt-3">
          {!locked && (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-accent/40 p-6 text-sm text-accent-foreground hover:bg-accent">
              <Upload className="h-5 w-5" />Click to upload posters, videos or documents
              <input type="file" multiple className="hidden" accept="image/*,video/*,application/pdf" onChange={(e) => upload(e.target.files)} />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            {files.data?.map((f) => (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-lg border bg-card">
                {f.mime?.startsWith("image/") ? <img src={f.url} alt={f.name} className="aspect-square w-full object-cover" /> :
                  f.mime?.startsWith("video/") ? <video src={f.url} className="aspect-square w-full bg-muted object-cover" /> :
                  <div className="flex aspect-square items-center justify-center bg-muted"><FileText className="h-8 w-8 text-muted-foreground" /></div>}
                <div className="p-2 text-xs"><div className="truncate font-medium">{f.name}</div><div className="text-muted-foreground">v{f.version} · {byId(f.uploaded_by)?.full_name}</div></div>
              </a>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comments" className="space-y-3 pt-3">
          {comments.data?.map((c) => {
            const a = byId(c.author_id);
            const lead = a?.roles.some((r) => r !== "member");
            return (
              <div key={c.id} className={lead ? "rounded-lg border border-primary/20 bg-accent/50 p-3" : "rounded-lg border bg-card p-3"}>
                <div className="mb-1 flex items-center gap-2 text-xs"><span className="font-semibold">{a?.full_name ?? "Someone"}</span>
                  {lead && <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">{ROLE_LABEL[a!.roles.find((r) => r !== "member")!]}</span>}
                  <span className="text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span></div>
                <p className="whitespace-pre-wrap text-sm">{c.body}</p>
              </div>
            );
          })}
          <div className="flex gap-2"><Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add feedback…" /><Button onClick={sendComment}>Post</Button></div>
        </TabsContent>
      </Tabs>

      {(me?.isApprover || task.created_by === me?.id) && <Button variant="ghost" size="sm" className="text-destructive" onClick={remove}><Trash2 className="h-4 w-4" />Delete task</Button>}
    </div>
  );
}

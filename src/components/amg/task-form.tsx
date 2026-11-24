import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CONTENT_TYPES, PLATFORMS } from "@/lib/task-utils";
import { useTeam } from "@/lib/amg-data";

export function TaskForm({ open, onOpenChange, defaultDate }: { open: boolean; onOpenChange: (o: boolean) => void; defaultDate?: Date }) {
  const qc = useQueryClient();
  const { data: team = [] } = useTeam();
  const init = defaultDate ?? new Date(Date.now() + 86400000);
  const local = new Date(init.getTime() - init.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState(local);
  const [type, setType] = useState<string>(CONTENT_TYPES[0]);
  const [platforms, setPlatforms] = useState<string[]>(["Instagram"]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function save() {
    if (!title.trim()) { toast.error("Give the task a title"); return; }
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: description || null,
      due_date: new Date(due).toISOString(),
      content_type: type,
      platforms,
      assignee_ids: assignees,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Task added to the calendar");
    qc.invalidateQueries({ queryKey: ["tasks"] });
    setTitle(""); setDescription(""); setAssignees([]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New content / task</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Easter campaign carousel" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Due date & time</Label><Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Content type</Label>
              <select className="h-9 rounded-md border border-input bg-card px-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                {CONTENT_TYPES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-1.5"><Label>Platforms</Label>
            <div className="flex flex-wrap gap-4">{PLATFORMS.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm"><Checkbox checked={platforms.includes(p)} onCheckedChange={() => setPlatforms(toggle(platforms, p))} />{p}</label>
            ))}</div>
          </div>
          <div className="grid gap-1.5"><Label>Assign to</Label>
            <div className="grid max-h-36 grid-cols-2 gap-2 overflow-auto rounded-md border p-2">{team.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm"><Checkbox checked={assignees.includes(m.id)} onCheckedChange={() => setAssignees(toggle(assignees, m.id))} /><span className="truncate">{m.full_name}</span></label>
            ))}</div>
          </div>
          <div className="grid gap-1.5"><Label>Brief / notes</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create task"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

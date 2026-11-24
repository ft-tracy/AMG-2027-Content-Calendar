import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/task-utils";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  pending_review: "bg-accent text-accent-foreground border-primary/20",
  revisions: "bg-warning/30 text-warning-foreground border-warning",
  approved: "bg-success-soft text-success border-success/30",
  published: "bg-success text-success-foreground border-success",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", STATUS_STYLE[status])}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function PlatformBadges({ platforms }: { platforms: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {platforms.map((p) => (
        <span key={p} className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
          {p}
        </span>
      ))}
    </div>
  );
}

export function OverdueDot() {
  return <span className="inline-block h-2 w-2 rounded-full bg-warning ring-2 ring-warning-foreground/20" aria-label="Overdue" />;
}

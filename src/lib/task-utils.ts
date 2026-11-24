export type TaskLike = { due_date: string; completed: boolean };

export const PLATFORMS = ["Instagram", "Facebook", "TikTok", "YouTube", "Events"] as const;
export const CONTENT_TYPES = ["Static Post", "Carousel", "Reel", "Story", "Short", "YouTube Video", "Activation", "Foundation / CSR", "Event"] as const;
export const DEFAULT_REMINDER_MINUTES = 1440;
export const REMINDER_PRESETS = [
  { label: "1 day before", minutes: 1440 },
  { label: "2 days before", minutes: 2880 },
  { label: "3 days before", minutes: 4320 },
] as const;

export function customReminderMinutes(amount: number, unit: "hours" | "days") {
  return Math.max(1, Math.floor(amount)) * (unit === "days" ? 1440 : 60);
}

export function reminderLabel(minutes: number) {
  const days = minutes / 1440;
  if (Number.isInteger(days)) return `${days} ${days === 1 ? "day" : "days"} before`;
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours} ${hours === 1 ? "hour" : "hours"} before`;
  return `${minutes} minutes before`;
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending approval",
  revisions: "Revisions requested",
  approved: "Approved",
  published: "Published",
};

/** Overdue: not ticked off and the due date/time has passed. */
export function isOverdue(t: TaskLike, now = new Date()) {
  return !t.completed && new Date(t.due_date).getTime() < now.getTime();
}

/** Upcoming: not ticked off, due from now through the next `days` days. */
export function isUpcoming(t: TaskLike, now = new Date(), days = 7) {
  const due = new Date(t.due_date).getTime();
  return !t.completed && due >= now.getTime() && due <= now.getTime() + days * 86400000;
}

export function isDueToday(t: TaskLike, now = new Date()) {
  const d = new Date(t.due_date);
  return !t.completed && d.toDateString() === now.toDateString();
}

/** Google Calendar event link that invites the assigned team members as guests. */
export function googleCalendarLink(opts: { title: string; due: string; details?: string; guests: string[] }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(opts.due);
  const end = new Date(start.getTime() + 30 * 60000);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `AMG: ${opts.title}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: opts.details ?? "",
  });
  if (opts.guests.length) p.set("add", opts.guests.join(","));
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

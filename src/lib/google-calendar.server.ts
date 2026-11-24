import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
const CALENDAR_ID = "9a6825f18d84bd6d8af182414047cd04ed3c339352fe2ae612a1035249de2743@group.calendar.google.com";
const GATEWAY_BASE = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

export async function syncTaskToGoogleCalendar(task: Task, remove = false) {
  const gatewayKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_CALENDAR_API_KEY"];
  if (!gatewayKey || !connectionKey) return "Google Calendar is not connected.";

  const { data: link, error: linkError } = await supabaseAdmin
    .from("calendar_event_links")
    .select("google_event_id")
    .eq("task_id", task.id)
    .maybeSingle();
  if (linkError) return `Google Calendar link could not be checked: ${linkError.message}`;
  if (remove && !link) return null;

  const calendarPath = `/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;
  const eventPath = link?.google_event_id ? `${calendarPath}/${encodeURIComponent(link.google_event_id)}` : calendarPath;
  const url = `${GATEWAY_BASE}${eventPath}`;
  const method = remove ? "DELETE" : link?.google_event_id ? "PATCH" : "POST";
  const start = new Date(task.due_date);
  const end = new Date(start.getTime() + 30 * 60_000);
  const description = [
    task.content_type,
    task.platforms.join(", "),
    task.description,
    task.caption,
    task.hashtags,
  ].filter(Boolean).join("\n\n");

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${gatewayKey}`,
        "X-Connection-Api-Key": connectionKey,
        ...(remove ? {} : { "Content-Type": "application/json" }),
      },
      ...(remove ? {} : {
        body: JSON.stringify({
          summary: `AMG · ${task.title}`,
          description,
          start: { dateTime: start.toISOString(), timeZone: "Africa/Nairobi" },
          end: { dateTime: end.toISOString(), timeZone: "Africa/Nairobi" },
          reminders: { useDefault: true },
        }),
      }),
    });
    if (remove && response.status === 404) {
      await supabaseAdmin.from("calendar_event_links").delete().eq("task_id", task.id);
      return null;
    }
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Google Calendar request failed [${response.status}]: ${errorBody}`);
      return `Google Calendar could not be updated [${response.status}]: ${errorBody}`;
    }
    if (remove) {
      const { error } = await supabaseAdmin.from("calendar_event_links").delete().eq("task_id", task.id);
      return error ? `The event was removed, but its saved link could not be cleared: ${error.message}` : null;
    }

    const event = await response.json() as { id?: string };
    const eventId = link?.google_event_id ?? event.id;
    if (!eventId) return "Google Calendar saved the task without returning an event link.";
    const { error } = await supabaseAdmin.from("calendar_event_links").upsert({
      task_id: task.id,
      google_event_id: eventId,
      updated_at: new Date().toISOString(),
    });
    return error ? `The event was saved, but its link could not be recorded: ${error.message}` : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Google Calendar request failed: ${message}`);
    return `Google Calendar could not be updated: ${message}`;
  }
}
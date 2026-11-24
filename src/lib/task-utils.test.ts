import { describe, expect, it } from "vitest";
import {
  customReminderMinutes,
  DEFAULT_REMINDER_MINUTES,
  isOverdue,
  isUpcoming,
  googleCalendarLink,
  REMINDER_PRESETS,
} from "./task-utils";

const now = new Date("2027-03-10T12:00:00Z");

describe("task rules", () => {
  it("an unticked task past its due date is overdue", () => {
    expect(isOverdue({ due_date: "2027-03-09T12:00:00Z", completed: false }, now)).toBe(true);
  });
  it("a ticked-off task is never overdue", () => {
    expect(isOverdue({ due_date: "2027-03-09T12:00:00Z", completed: true }, now)).toBe(false);
  });
  it("upcoming covers the next 7 days only", () => {
    expect(isUpcoming({ due_date: "2027-03-16T12:00:00Z", completed: false }, now)).toBe(true);
    expect(isUpcoming({ due_date: "2027-03-18T12:00:00Z", completed: false }, now)).toBe(false);
  });
  it("calendar reminder invites every assigned team member", () => {
    const url = googleCalendarLink({ title: "Reel", due: "2027-03-12T09:00:00Z", guests: ["a@amg.co", "b@amg.co"] });
    expect(new URL(url).searchParams.get("add")).toBe("a@amg.co,b@amg.co");
  });
  it("defaults reminders to one day before", () => {
    expect(DEFAULT_REMINDER_MINUTES).toBe(1440);
  });
  it("offers the approved one-, two-, and three-day reminder choices", () => {
    expect(REMINDER_PRESETS.map((preset) => preset.minutes)).toEqual([1440, 2880, 4320]);
  });
  it("converts custom hour and day reminders into minutes", () => {
    expect(customReminderMinutes(4, "hours")).toBe(240);
    expect(customReminderMinutes(2, "days")).toBe(2880);
  });
});

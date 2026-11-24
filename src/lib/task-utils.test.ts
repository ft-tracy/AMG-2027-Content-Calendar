import { describe, expect, it } from "vitest";
import { isOverdue, isUpcoming, googleCalendarLink } from "./task-utils";

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
});

export function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function foldIcsLine(line: string) {
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const character of line) {
    const characterBytes = new TextEncoder().encode(character).length;
    if (currentBytes + characterBytes > 73 && current) {
      chunks.push(current);
      current = ` ${character}`;
      currentBytes = 1 + characterBytes;
    } else {
      current += character;
      currentBytes += characterBytes;
    }
  }
  if (current) chunks.push(current);
  return chunks.join("\r\n");
}

export function toIcsDate(value: string) {
  return value.replaceAll("-", "");
}

export function toIcsDateTime(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildCalendarFeed(events: string[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:-//AMG Realtors//Shared Content Calendar//EN",
    "X-WR-CALNAME:AMG Team Calendar",
    ...events,
    "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
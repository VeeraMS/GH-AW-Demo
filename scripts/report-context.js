import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function reportContext(kind, now = new Date()) {
  if (!["daily", "weekly"].includes(kind)) {
    throw new Error("Report kind must be daily or weekly.");
  }
  if (!Number.isFinite(now.getTime())) {
    throw new Error("Report time must be a valid date.");
  }

  const end = new Date(now);
  end.setUTCHours(kind === "daily" ? 3 : 11, 30, 0, 0);
  if (kind === "weekly") {
    end.setUTCDate(end.getUTCDate() - ((end.getUTCDay() + 2) % 7));
  }
  if (end > now) {
    end.setUTCDate(end.getUTCDate() - (kind === "daily" ? 1 : 7));
  }

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (kind === "daily" ? 1 : 7));
  const prefix = kind === "daily" ? "daily-report" : "weekly-digest";
  return {
    title: `[${prefix}] ${end.toISOString().slice(0, 10)}`,
    start: start.toISOString(),
    end: end.toISOString(),
    generatedAt: now.toISOString(),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const context = reportContext(process.argv[2]);
  writeFileSync(".git/agentic-report-context.json", JSON.stringify(context, null, 2));
  console.log(JSON.stringify(context, null, 2));
}

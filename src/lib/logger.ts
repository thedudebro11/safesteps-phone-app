// src/lib/logger.ts
// Tiny rolling logger. Zero dependencies, zero disk I/O.
// Usage: log.info('auth', 'session loaded'), log.error('api', 'fetch failed', err)
// View: tap the version number in Settings 7 times to open the log viewer.

type Level = "info" | "warn" | "error";

type LogEntry = {
  ts: number;       // Date.now()
  level: Level;
  tag: string;      // e.g. "auth", "tracking", "api"
  msg: string;
  extra?: string;   // serialized extra data
};

const MAX_ENTRIES = 300;
const entries: LogEntry[] = [];
const listeners = new Set<() => void>();

function serialize(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (val instanceof Error) return `${val.message}`;
  try { return JSON.stringify(val); } catch { return String(val); }
}

function write(level: Level, tag: string, msg: string, extra?: unknown) {
  if (entries.length >= MAX_ENTRIES) entries.shift();
  entries.push({ ts: Date.now(), level, tag, msg, extra: serialize(extra) });
  // Also mirror to console in dev
  if (__DEV__) {
    const line = `[${tag}] ${msg}${extra ? ` — ${serialize(extra)}` : ""}`;
    level === "error" ? console.error(line) : level === "warn" ? console.warn(line) : console.log(line);
  }
  listeners.forEach((fn) => fn());
}

export const log = {
  info:  (tag: string, msg: string, extra?: unknown) => write("info",  tag, msg, extra),
  warn:  (tag: string, msg: string, extra?: unknown) => write("warn",  tag, msg, extra),
  error: (tag: string, msg: string, extra?: unknown) => write("error", tag, msg, extra),
};

// ── Read-only API for the viewer UI ─────────────────────────────────────────

export function getLogEntries(): readonly LogEntry[] {
  return entries;
}

export function clearLogs() {
  entries.length = 0;
  listeners.forEach((fn) => fn());
}

export function subscribeToLogs(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function formatEntry(e: LogEntry): string {
  const t = new Date(e.ts);
  const time = `${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}:${String(t.getSeconds()).padStart(2,"0")}.${String(t.getMilliseconds()).padStart(3,"0")}`;
  const extra = e.extra ? ` ${e.extra}` : "";
  return `${time} [${e.tag}] ${e.msg}${extra}`;
}

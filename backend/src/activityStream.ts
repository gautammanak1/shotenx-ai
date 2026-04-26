import { EventEmitter } from "node:events";

export type ActivityLevel = "info" | "error";

export interface ActivityEvent {
  timestamp: string;
  level: ActivityLevel;
  source: string;
  message: string;
}

const MAX_ACTIVITY_EVENTS = 200;
const activityEvents: ActivityEvent[] = [];
const activityEmitter = new EventEmitter();

function pushActivity(event: ActivityEvent): void {
  activityEvents.push(event);
  if (activityEvents.length > MAX_ACTIVITY_EVENTS) {
    activityEvents.shift();
  }
  activityEmitter.emit("activity", event);
}

export function logActivity(
  source: string,
  message: string,
  level: ActivityLevel = "info"
): void {
  const event: ActivityEvent = {
    timestamp: new Date().toISOString(),
    level,
    source,
    message
  };

  pushActivity(event);
}

export function getRecentActivity(): ActivityEvent[] {
  return [...activityEvents];
}

export function onActivity(listener: (event: ActivityEvent) => void): void {
  activityEmitter.on("activity", listener);
}

export function offActivity(listener: (event: ActivityEvent) => void): void {
  activityEmitter.off("activity", listener);
}

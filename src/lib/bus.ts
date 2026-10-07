import { EventEmitter } from "events";

const g = globalThis as typeof globalThis & { __waslBus?: EventEmitter; __waslSessions?: Map<string, string> };

if (!g.__waslBus) {
  g.__waslBus = new EventEmitter();
  g.__waslBus.setMaxListeners(500);
}
if (!g.__waslSessions) g.__waslSessions = new Map();

export const bus = g.__waslBus;
export const sessionMemory = g.__waslSessions;

export function publish(payload: { type: string; userId?: string; userIds?: string[]; [key: string]: unknown }) {
  bus.emit("event", payload);
}

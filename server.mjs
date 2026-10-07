import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer } from "ws";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const app = next({ dev });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => {
  const parsedUrl = parse(req.url || "/", true);
  handle(req, res, parsedUrl);
});

const wss = new WebSocketServer({ server, path: "/ws" });
const sockets = new Map();

function sessions() {
  if (!globalThis.__waslSessions) globalThis.__waslSessions = new Map();
  return globalThis.__waslSessions;
}

function bus() {
  if (!globalThis.__waslBus) {
    const { EventEmitter } = require("events");
    globalThis.__waslBus = new EventEmitter();
    globalThis.__waslBus.setMaxListeners(500);
  }
  return globalThis.__waslBus;
}

function send(userId, payload) {
  const set = sockets.get(userId);
  if (!set) return;
  const raw = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === 1) ws.send(raw);
  }
}

bus().on("event", (payload) => {
  const targets = payload.userIds || (payload.userId ? [payload.userId] : []);
  for (const id of targets) send(id, payload);
});

wss.on("connection", (ws) => {
  let userId = null;
  ws.on("message", (buf) => {
    let msg;
    try { msg = JSON.parse(String(buf)); } catch { return; }
    if (msg.type === "auth") {
      userId = sessions().get(msg.token) || null;
      if (!userId) {
        ws.send(JSON.stringify({ type: "auth", ok: false }));
        return;
      }
      if (!sockets.has(userId)) sockets.set(userId, new Set());
      sockets.get(userId).add(ws);
      ws.send(JSON.stringify({ type: "auth", ok: true }));
      return;
    }
    if (!userId) return;
    if (msg.type === "typing") {
      send(msg.to, { type: "typing", from: userId, conversationId: msg.conversationId });
    }
  });
  ws.on("close", () => {
    if (userId && sockets.get(userId)) sockets.get(userId).delete(ws);
  });
});

server.listen(port, () => {
  console.log(`Wasl ready on http://localhost:${port}`);
});

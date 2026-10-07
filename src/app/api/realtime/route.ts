import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      send("ready", { ok: true });
      const timer = setInterval(async () => {
        try {
          const unread = await q("SELECT count(*) AS n FROM notifications WHERE user_id = $1 AND is_read = false", [user.id]);
          send("unread", { n: Number(unread.rows[0].n) });
        } catch {
          clearInterval(timer);
        }
      }, 4000);
      setTimeout(() => {
        closed = true;
        clearInterval(timer);
        controller.close();
      }, 55000);
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}

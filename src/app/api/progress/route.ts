import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { noteBlock } from "@/lib/notes";
import { completedTopics, setCompleted } from "@/lib/progress";

/** GET /api/progress: ids of the topics the signed-in user has marked as studied. */
export async function GET(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  return Response.json({ completed: await completedTopics(userId) });
}

/** PUT /api/progress { topicId, done }: marks one of the topics open on the user's plan as studied, or not. */
export async function PUT(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "Sign in to track your progress." }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const body = (await readJson(req)) as { topicId?: unknown; done?: unknown } | null;
  const topicId = typeof body?.topicId === "string" ? body.topicId : "";
  if (!/^[0-9a-f-]{32,36}$/i.test(topicId) || typeof body?.done !== "boolean") return Response.json({ error: "Unknown topic." }, { status: 400 });
  const blocked = await noteBlock(topicId);
  if (blocked) return Response.json({ error: blocked }, { status: 403 });
  await setCompleted(userId, topicId, body.done);
  return Response.json({ topicId, done: body.done });
}

import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { friendLists, sendRequest } from "@/lib/friends";

/** GET /api/friends: the signed-in user's friends, requests received and requests sent. */
export async function GET(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  return Response.json(await friendLists(userId));
}

/** POST /api/friends { email }: sends a friend request to that account (or accepts theirs), then returns the lists. */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "Sign in to add friends." }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const body = (await readJson(req)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Enter an email address." }, { status: 400 });
  const error = await sendRequest(userId, email);
  if (error) return Response.json({ error }, { status: 400 });
  return Response.json(await friendLists(userId));
}

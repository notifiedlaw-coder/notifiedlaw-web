import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { getCaseBriefs } from "@/lib/cms";
import { bookmarkedCases, setBookmark } from "@/lib/bookmarks";

/** GET /api/bookmarks: ids of the case briefs the signed-in user has bookmarked. */
export async function GET(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  return Response.json({ bookmarks: await bookmarkedCases(userId) });
}

/** PUT /api/bookmarks { caseId, on }: bookmarks a published case brief, or removes the bookmark. */
export async function PUT(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "Sign in to bookmark cases." }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const body = (await readJson(req)) as { caseId?: unknown; on?: unknown } | null;
  const caseId = typeof body?.caseId === "string" ? body.caseId : "";
  if (!/^[0-9a-f-]{32,36}$/i.test(caseId) || typeof body?.on !== "boolean") return Response.json({ error: "Unknown case." }, { status: 400 });
  // Only a published case can be bookmarked; removing a bookmark never needs the case to exist.
  if (body.on && !(await getCaseBriefs()).some((c) => c.id === caseId)) return Response.json({ error: "Unknown case." }, { status: 404 });
  await setBookmark(userId, caseId, body.on);
  return Response.json({ caseId, on: body.on });
}

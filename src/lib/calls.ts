import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, desc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { call, callParticipant, chatGroup, groupMember } from "@/db/schema";
import { getDb } from "@/lib/auth";
import { areFriends, blockedEitherWay, people } from "@/lib/friends";
import { MAX_CALL_MS, MAX_GROUP_MEMBERS, type CallInfo, type CallPeer } from "@/lib/friend-view";
import { closeTracks, newSession, pullTracks, pushTracks, renegotiate, sfuConfigured } from "@/lib/sfu";

/** A direct call rings this long; a group call shows as ringing to members for this long after it starts. */
export const RING_MS = 45_000;
/** Someone whose call screen has not polled for this long has dropped out. */
const PRESENT_MS = 20_000;
/** Calls one account may start in an hour. */
const CALLS_PER_HOUR = 20;
/** Calls are voice only. */
export const TRACK_NAMES = ["audio"] as const;

type Row = typeof call.$inferSelect;
type Published = { name: string; mid: string };
/** A track pulled from someone else: `<their session>:<track name>` and its mid in the puller's own session. */
type Pulled = { key: string; mid: string };
/** Tracks one session may pull in a call: one per track of everyone else, with room for people who rejoin. */
const MAX_PULLED = MAX_GROUP_MEMBERS * TRACK_NAMES.length * 4;
const env = () => getCloudflareContext().env;
const present = (now: number) => and(isNull(callParticipant.leftAt), gt(callParticipant.seenAt, new Date(now - PRESENT_MS)));

export class CallError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

/**
 * Whether the user belongs in this call: the members of the group, or the two people of a direct call while they are
 * still friends and neither has blocked the other.
 */
async function mayJoin(userId: string, c: Row) {
  if (c.groupId) {
    const [m] = await getDb().select({ x: groupMember.userId }).from(groupMember).where(and(eq(groupMember.groupId, c.groupId), eq(groupMember.userId, userId)));
    return !!m;
  }
  if (userId !== c.callerId && userId !== c.calleeId) return false;
  return areFriends(userId, userId === c.callerId ? c.calleeId! : c.callerId);
}

/** Every mid in a participant's session, published or pulled, so closing them stops all of that person's media. */
const mids = (p: { tracks: string; pulled: string }) =>
  [...(JSON.parse(p.tracks) as Published[]), ...(JSON.parse(p.pulled) as Pulled[])].map((t) => t.mid);

async function load(userId: string, callId: string) {
  const [c] = await getDb().select().from(call).where(eq(call.id, callId));
  if (!c || !(await mayJoin(userId, c))) throw new CallError("Call not found.", 404);
  return settle(c);
}

/** Ends a call whose time is up, that went unanswered, or that everyone has left; stops its tracks at the SFU. */
async function settle(c: Row): Promise<Row> {
  if (c.endedAt) return c;
  const db = getDb();
  const now = Date.now();
  let reason: string | null = null;
  if (now >= c.endsAt.getTime()) reason = "time";
  else if (now - c.startedAt.getTime() > RING_MS) {
    const here = await db.select({ userId: callParticipant.userId }).from(callParticipant).where(and(eq(callParticipant.callId, c.id), present(now)));
    if (!here.length) reason = "ended";
    else if (!c.groupId && !here.some((p) => p.userId === c.calleeId)) {
      const [ever] = await db.select({ x: callParticipant.userId }).from(callParticipant).where(and(eq(callParticipant.callId, c.id), eq(callParticipant.userId, c.calleeId!)));
      if (!ever) reason = "missed";
    }
  }
  return reason ? end(c, reason) : c;
}

async function end(c: Row, reason: string): Promise<Row> {
  const db = getDb();
  const now = new Date();
  const left = await db.select().from(callParticipant).where(and(eq(callParticipant.callId, c.id), isNull(callParticipant.leftAt)));
  await Promise.all(left.map((p) => closeTracks(env(), p.sessionId, mids(p))));
  await db.batch([
    db.update(call).set({ endedAt: now, endReason: reason }).where(and(eq(call.id, c.id), isNull(call.endedAt))),
    db.update(callParticipant).set({ leftAt: now }).where(and(eq(callParticipant.callId, c.id), isNull(callParticipant.leftAt))),
  ]);
  return { ...c, endedAt: now, endReason: reason };
}

async function info(c: Row): Promise<CallInfo> {
  const [names, [g]] = await Promise.all([
    people([c.callerId]),
    c.groupId ? getDb().select({ name: chatGroup.name }).from(chatGroup).where(eq(chatGroup.id, c.groupId)) : Promise.resolve([]),
  ]);
  return {
    id: c.id, groupId: c.groupId, groupName: g?.name ?? null, callerId: c.callerId, callerName: names.get(c.callerId)?.name ?? "Someone",
    calleeId: c.calleeId, video: c.video, startedAt: c.startedAt.getTime(), endsAt: c.endsAt.getTime(), endedAt: c.endedAt?.getTime() ?? null, endReason: c.endReason,
  };
}

/** The open call the user is in right now, if any. */
async function currentCall(userId: string) {
  const now = Date.now();
  const [row] = await getDb().select({ id: call.id }).from(callParticipant).innerJoin(call, eq(call.id, callParticipant.callId))
    .where(and(eq(callParticipant.userId, userId), present(now), isNull(call.endedAt)));
  return row?.id ?? null;
}

/**
 * Starts a call with a friend or a group. A group with a call already going returns that call to join instead, and
 * so does a direct call already open between the two.
 */
export async function startCall(userId: string, target: { friendId?: string; groupId?: string }): Promise<CallInfo> {
  if (!sfuConfigured(env())) throw new CallError("Calls are not available yet.", 503);
  const db = getDb();
  const now = Date.now();
  if (target.groupId) {
    const [m] = await db.select({ x: groupMember.userId }).from(groupMember).where(and(eq(groupMember.groupId, target.groupId), eq(groupMember.userId, userId)));
    if (!m) throw new CallError("Group not found.", 404);
    const [open] = await db.select().from(call).where(and(eq(call.groupId, target.groupId), isNull(call.endedAt))).orderBy(desc(call.startedAt)).limit(1);
    if (open) {
      const live = await settle(open);
      if (!live.endedAt) return info(live);
    }
  } else if (target.friendId) {
    if (!(await areFriends(userId, target.friendId)) || (await blockedEitherWay(userId, target.friendId))) throw new CallError("You can only call friends.", 403);
    const [open] = await db.select().from(call).where(and(isNull(call.endedAt), isNull(call.groupId),
      or(and(eq(call.callerId, userId), eq(call.calleeId, target.friendId)), and(eq(call.callerId, target.friendId), eq(call.calleeId, userId))))).limit(1);
    if (open) {
      const live = await settle(open);
      if (!live.endedAt) return info(live);
    }
  } else throw new CallError("Choose who to call.");

  const inCall = await currentCall(userId);
  if (inCall) throw new CallError("You are already in a call. Leave it first.", 409);
  const [recent] = await db.select({ n: sql<number>`count(*)` }).from(call).where(and(eq(call.callerId, userId), gt(call.startedAt, new Date(now - 3_600_000))));
  if ((recent?.n ?? 0) >= CALLS_PER_HOUR) throw new CallError("You have started a lot of calls. Try again in a while.", 429);

  const row: Row = {
    id: crypto.randomUUID(), groupId: target.groupId ?? null, callerId: userId, calleeId: target.friendId ?? null, video: false,
    startedAt: new Date(now), endsAt: new Date(now + MAX_CALL_MS), endedAt: null, endReason: null,
  };
  await db.insert(call).values(row);
  return info(row);
}

/** Calls ringing for the user: direct calls to them, and group calls just started in their groups, not yet joined. */
export async function ringing(userId: string): Promise<CallInfo[]> {
  const db = getDb();
  const since = new Date(Date.now() - RING_MS);
  const groups = db.select({ id: groupMember.groupId }).from(groupMember).where(eq(groupMember.userId, userId));
  const rows = await db.select().from(call).where(and(
    isNull(call.endedAt), gt(call.startedAt, since), ne(call.callerId, userId),
    or(eq(call.calleeId, userId), inArray(call.groupId, groups)),
    sql`not exists (select 1 from call_participant p where p.call_id = ${call.id} and p.user_id = ${userId})`,
  ));
  return Promise.all(rows.map(info));
}

/** The call as the call screen polls it: the call, and everyone else in it with the tracks they publish. */
export async function callState(userId: string, callId: string): Promise<{ call: CallInfo; peers: CallPeer[] }> {
  const c = await load(userId, callId);
  const db = getDb();
  const now = Date.now();
  if (!c.endedAt) await db.update(callParticipant).set({ seenAt: new Date(now) }).where(and(eq(callParticipant.callId, callId), eq(callParticipant.userId, userId), isNull(callParticipant.leftAt)));
  const rows = c.endedAt ? [] : await db.select().from(callParticipant).where(and(eq(callParticipant.callId, callId), present(now), ne(callParticipant.userId, userId)));
  const names = await people(rows.map((r) => r.userId));
  return {
    call: await info(c),
    peers: rows.map((r) => ({
      userId: r.userId, name: names.get(r.userId)?.name ?? "Someone", avatar: names.get(r.userId)?.avatar ?? null,
      sessionId: r.sessionId, tracks: (JSON.parse(r.tracks) as Published[]).map((t) => t.name),
    })),
  };
}

/** Joins a call: a fresh SFU session for the user (a rejoin replaces the old one). */
export async function joinCall(userId: string, callId: string) {
  const c = await load(userId, callId);
  if (c.endedAt) throw new CallError("This call has ended.", 410);
  const db = getDb();
  const now = Date.now();
  const [here] = await db.select({ n: sql<number>`count(*)` }).from(callParticipant).where(and(eq(callParticipant.callId, callId), present(now), ne(callParticipant.userId, userId)));
  if ((here?.n ?? 0) >= MAX_GROUP_MEMBERS) throw new CallError("This call is full.", 409);
  const elsewhere = await currentCall(userId);
  if (elsewhere && elsewhere !== callId) throw new CallError("You are already in another call.", 409);
  const [old] = await db.select().from(callParticipant).where(and(eq(callParticipant.callId, callId), eq(callParticipant.userId, userId)));
  if (old && !old.leftAt) await closeTracks(env(), old.sessionId, mids(old));
  const { sessionId } = await newSession(env());
  const values = { callId, userId, sessionId, tracks: "[]", pulled: "[]", joinedAt: new Date(now), seenAt: new Date(now), leftAt: null };
  await db.insert(callParticipant).values(values).onConflictDoUpdate({ target: [callParticipant.callId, callParticipant.userId], set: values });
  return { sessionId, endsAt: c.endsAt.getTime() };
}

async function me(userId: string, callId: string) {
  const c = await load(userId, callId);
  if (c.endedAt) throw new CallError("This call has ended.", 410);
  const [p] = await getDb().select().from(callParticipant).where(and(eq(callParticipant.callId, callId), eq(callParticipant.userId, userId), isNull(callParticipant.leftAt)));
  if (!p) throw new CallError("Join the call first.", 409);
  return p;
}

/** Publishes the user's microphone; returns the SFU's answer for the browser. */
export async function publish(userId: string, callId: string, offer: string, tracks: { mid: string; name: string }[]) {
  const p = await me(userId, callId);
  const names = tracks.map((t) => t.name);
  if (!tracks.length || tracks.length > TRACK_NAMES.length || new Set(names).size !== names.length || !names.every((n) => (TRACK_NAMES as readonly string[]).includes(n)))
    throw new CallError("Unexpected tracks.");
  const res = await pushTracks(env(), p.sessionId, offer, tracks.map((t) => ({ mid: t.mid, trackName: t.name })));
  const published: Published[] = [...(JSON.parse(p.tracks) as Published[]).filter((t) => !names.includes(t.name)), ...tracks];
  await getDb().update(callParticipant).set({ tracks: JSON.stringify(published) }).where(and(eq(callParticipant.callId, callId), eq(callParticipant.userId, userId)));
  return { sdp: res.sessionDescription.sdp };
}

/**
 * Subscribes the user to other people's tracks in the same call. Only sessions of people present in this call can be
 * pulled, so nobody can listen in on another call by guessing a session id. Each track is pulled once per session and
 * a session pulls at most MAX_PULLED, so repeating a request cannot multiply what the SFU sends.
 */
export async function subscribe(userId: string, callId: string, wants: { userId: string; name: string }[]) {
  const p = await me(userId, callId);
  const rows = await getDb().select().from(callParticipant).where(and(eq(callParticipant.callId, callId), present(Date.now()), ne(callParticipant.userId, userId)));
  const byUser = new Map(rows.map((r) => [r.userId, r]));
  const pulled = JSON.parse(p.pulled) as Pulled[];
  const had = new Set(pulled.map((t) => t.key));
  const ok = new Map<string, { sessionId: string; trackName: string }>();
  for (const w of wants) {
    const r = byUser.get(w.userId);
    const key = r && `${r.sessionId}:${w.name}`;
    if (!r || !key || had.has(key) || ok.has(key) || !(JSON.parse(r.tracks) as Published[]).some((t) => t.name === w.name)) continue;
    ok.set(key, { sessionId: r.sessionId, trackName: w.name });
  }
  if (!ok.size) return { sdp: null, tracks: [] };
  if (pulled.length + ok.size > MAX_PULLED) throw new CallError("Rejoin the call to hear everyone.", 409);
  const res = await pullTracks(env(), p.sessionId, [...ok.values()]);
  const got = res.tracks.filter((t) => !t.errorCode && t.mid);
  const next = [...pulled, ...got.map((t) => ({ key: `${t.sessionId}:${t.trackName}`, mid: t.mid! }))];
  await getDb().update(callParticipant).set({ pulled: JSON.stringify(next) }).where(and(eq(callParticipant.callId, callId), eq(callParticipant.userId, userId)));
  const bySession = new Map(rows.map((r) => [r.sessionId, r.userId]));
  return {
    sdp: res.requiresImmediateRenegotiation ? res.sessionDescription?.sdp ?? null : null,
    tracks: got.map((t) => ({ mid: t.mid!, userId: bySession.get(t.sessionId!) ?? "", name: t.trackName ?? "" })),
  };
}

/** Sends the browser's answer after a subscription. */
export async function answer(userId: string, callId: string, sdp: string) {
  const p = await me(userId, callId);
  await renegotiate(env(), p.sessionId, sdp);
}

/** Leaves a call. A direct call ends for both; a group call ends when the last person leaves. */
export async function leaveCall(userId: string, callId: string) {
  const c = await load(userId, callId);
  if (c.endedAt) return;
  const db = getDb();
  const [p] = await db.select().from(callParticipant).where(and(eq(callParticipant.callId, callId), eq(callParticipant.userId, userId)));
  if (p && !p.leftAt) {
    await closeTracks(env(), p.sessionId, mids(p));
    await db.update(callParticipant).set({ leftAt: new Date() }).where(and(eq(callParticipant.callId, callId), eq(callParticipant.userId, userId)));
  }
  if (!c.groupId) await end(c, c.callerId === userId && !(await db.select().from(callParticipant).where(and(eq(callParticipant.callId, callId), eq(callParticipant.userId, c.calleeId!)))).length ? "missed" : "ended");
  else await settle({ ...c, startedAt: new Date(0) });
}

/** Declines a direct call ringing for the user. Group calls are simply not joined. */
export async function declineCall(userId: string, callId: string) {
  const c = await load(userId, callId);
  if (!c.endedAt && !c.groupId && c.calleeId === userId) await end(c, "declined");
}

/** Takes the user out of an open group call: stops every track in their session and marks them gone. */
async function dropFrom(c: Row, userId: string) {
  const db = getDb();
  const [p] = await db.select().from(callParticipant).where(and(eq(callParticipant.callId, c.id), eq(callParticipant.userId, userId), isNull(callParticipant.leftAt)));
  if (!p) return;
  await closeTracks(env(), p.sessionId, mids(p));
  await db.update(callParticipant).set({ leftAt: new Date() }).where(and(eq(callParticipant.callId, c.id), eq(callParticipant.userId, userId)));
  await settle({ ...c, startedAt: new Date(0) });
}

/** Ends a direct call open between the two, after one unfriends or blocks the other. */
export async function endCallsBetween(a: string, b: string) {
  const open = await getDb().select().from(call).where(and(isNull(call.endedAt), isNull(call.groupId),
    or(and(eq(call.callerId, a), eq(call.calleeId, b)), and(eq(call.callerId, b), eq(call.calleeId, a)))));
  for (const c of open) await end(c, "ended");
}

/** Takes the user out of open calls in these groups, after they leave or are removed or blocked. */
export async function leaveGroupCalls(userId: string, groupIds: string[]) {
  if (!groupIds.length) return;
  const open = await getDb().select().from(call).where(and(isNull(call.endedAt), inArray(call.groupId, groupIds)));
  for (const c of open) await dropFrom(c, userId);
}

/** Ends a group's open calls before the group is deleted, since the delete cascades away the call rows. */
export async function endGroupCalls(groupId: string) {
  const open = await getDb().select().from(call).where(and(isNull(call.endedAt), eq(call.groupId, groupId)));
  for (const c of open) await end(c, "ended");
}

/**
 * Before an account is deleted: ends its direct calls and the calls of groups it owns (those rows go by cascade),
 * and takes it out of any other group call, so no SFU session outlives the rows that track it.
 */
export async function endCallsOf(userId: string) {
  const db = getDb();
  const owned = new Set((await db.select({ id: chatGroup.id }).from(chatGroup).where(eq(chatGroup.ownerId, userId))).map((g) => g.id));
  const joined = db.select({ id: callParticipant.callId }).from(callParticipant).where(and(eq(callParticipant.userId, userId), isNull(callParticipant.leftAt)));
  const open = await db.select().from(call).where(and(isNull(call.endedAt),
    or(eq(call.callerId, userId), eq(call.calleeId, userId), inArray(call.groupId, [...owned]), inArray(call.id, joined))));
  for (const c of open) {
    if (!c.groupId || owned.has(c.groupId)) await end(c, "ended");
    else await dropFrom(c, userId);
  }
}

import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

/**
 * A sign-in link signs in whoever opens it, so another site could link straight to the verify endpoint with its own
 * token and sign a visitor in to the wrong account. Only the confirm page (same origin) may open it; anything else is
 * sent to that page, where the person has to press the button themselves.
 */
function crossSiteVerify(req: Request) {
  const url = new URL(req.url);
  if (!url.pathname.endsWith("/magic-link/verify")) return null;
  const site = req.headers.get("sec-fetch-site");
  if (!site || site === "same-origin") return null;
  const to = new URL("/verify-email", url);
  const token = url.searchParams.get("token");
  if (token) to.searchParams.set("token", token);
  return Response.redirect(to, 303);
}

export const GET = (req: Request) => crossSiteVerify(req) ?? toNextJsHandler(getAuth()).GET(req);
export const POST = (req: Request) => toNextJsHandler(getAuth()).POST(req);

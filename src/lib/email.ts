import { getCloudflareContext } from "@opennextjs/cloudflare";

const FROM = { email: "no-reply@notifiedlaw.com", name: "NotifiedLaw" };

/** Sends one transactional email through Cloudflare Email Service. Throws if the send fails. */
export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }) {
  await getCloudflareContext().env.EMAIL.send({ from: FROM, ...msg });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function uniEmailMessage(link: string, university: string, minutes: number) {
  const subject = "Confirm your university email for NotifiedLaw";
  const text = `Confirm this is your ${university} email to start your 7-day Senior Judicial (Pro) trial:\n\n${link}\n\nThe link works for ${minutes} minutes. If you did not ask for this, ignore this email.`;
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1d1d1f">
<p style="font-size:20px;font-weight:700;margin:0 0 16px">Notified<span style="color:#FF9500;font-weight:400">Law</span></p>
<p style="font-size:15px;line-height:1.5;margin:0 0 20px">Confirm this is your ${esc(university)} email to start your 7-day Senior Judicial (Pro) trial.</p>
<p style="margin:0 0 20px"><a href="${esc(link)}" style="display:inline-block;background:#007AFF;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:999px">Confirm email</a></p>
<p style="font-size:13px;line-height:1.5;color:#6e6e73;margin:0">The link works for ${minutes} minutes. If you did not ask for this, ignore this email.</p>
</div>`;
  return { subject, html, text };
}

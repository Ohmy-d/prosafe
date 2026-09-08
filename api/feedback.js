/* ══════════════════════════════════════════════════
   ProSafe — Feedback email endpoint (Vercel / Node.js)
   Sends feedback messages straight to your inbox using the
   Resend API (https://resend.com). Runs as a Vercel
   serverless function — no PHP, no mail server needed.

   ── ONE-TIME SETUP ──────────────────────────────────
   1. Create a free Resend account at https://resend.com
      using YOUR OWN email address. No credit card needed.
   2. In the Resend dashboard, create an API key.
   3. In your Vercel project: Settings → Environment Variables,
      add:
        RESEND_API_KEY     = the key from step 2
        FEEDBACK_TO_EMAIL  = the same email you signed up with
      (Resend's shared sender, onboarding@resend.dev, only
      delivers to your own account's email until you verify
      a custom domain — which is exactly what we want here,
      so no domain setup or DNS records are needed at all.)
   4. Redeploy after adding the environment variables —
      Vercel only picks them up on a fresh deploy.
══════════════════════════════════════════════════ */

const FEEDBACK_FROM = "ProSafe Feedback <onboarding@resend.dev>";
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/* Best-effort in-memory rate limit. This only persists for as long as this
   particular function instance stays warm -- serverless functions don't
   share memory across instances or survive cold starts, so this is a
   soft deterrent, not a hard guarantee. Resend's own account limit
   (100 emails/day on the free tier) is the real backstop regardless. */
const hits = new Map();
function checkRateLimit(key) {
  const now = Date.now();
  const timestamps = (hits.get(key) || []).filter(t => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_PER_WINDOW) return false;
  timestamps.push(now);
  hits.set(key, timestamps);
  return true;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

module.exports = async (req, res) => {
  const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
  const FEEDBACK_TO_EMAIL = process.env.FEEDBACK_TO_EMAIL || "";

  /* Visit this endpoint's URL directly in a browser (a GET request) to
     check configuration status without needing to dig through the
     Vercel dashboard blind. Reports presence only -- never the actual
     secret values -- so it's safe to check from anywhere. */
  if (req.method === "GET") {
    res.status(200).json({
      resendApiKeySet: !!RESEND_API_KEY,
      feedbackToEmailSet: !!FEEDBACK_TO_EMAIL,
      configured: !!(RESEND_API_KEY && FEEDBACK_TO_EMAIL),
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!RESEND_API_KEY || !FEEDBACK_TO_EMAIL) {
    const missing = [
      !RESEND_API_KEY ? "RESEND_API_KEY" : null,
      !FEEDBACK_TO_EMAIL ? "FEEDBACK_TO_EMAIL" : null,
    ].filter(Boolean).join(" and ");
    res.status(500).json({
      ok: false,
      error: `Feedback isn't configured yet — ${missing} not set. Check Vercel's project environment variables.`
    });
    return;
  }

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  if (!checkRateLimit(ip)) {
    res.status(429).json({ ok: false, error: "Too many messages sent recently. Please try again later." });
    return;
  }

  let message = "";
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    message = (body && typeof body.message === "string") ? body.message.trim() : "";
  } catch (e) {
    res.status(400).json({ ok: false, error: "Invalid request body" });
    return;
  }

  if (!message) {
    res.status(400).json({ ok: false, error: "Message is empty" });
    return;
  }
  if (message.length > 5000) message = message.slice(0, 5000);

  const htmlBody = `<p style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(message).replace(/\n/g, "<br>")}</p>`
    + `<hr><p style="font-family:sans-serif;font-size:12px;color:#888">Sent from the ProSafe Usage &amp; Safety page.</p>`;

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FEEDBACK_FROM,
        to: [FEEDBACK_TO_EMAIL],
        subject: "ProSafe Feedback",
        html: htmlBody,
        text: message,
      }),
    });

    if (resendRes.ok) {
      res.status(200).json({ ok: true });
    } else {
      const detail = await resendRes.text().catch(() => "");
      res.status(502).json({ ok: false, error: "The email service rejected the request", detail });
    }
  } catch (networkErr) {
    res.status(502).json({ ok: false, error: "Could not reach the email service" });
  }
};
